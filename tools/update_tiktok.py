"""Met à jour le dernier TikTok affiché sur le site.

Lit la page publique d'intégration TikTok du compte, repère la vidéo la plus
récente (les vidéos épinglées, plus anciennes, sont ignorées : l'identifiant
d'une vidéo TikTok contient sa date de publication), puis écrit :
  - assets/data/tiktok.json      (vidéo, légende, abonnés, j'aime, vues, vidéos récentes)
  - assets/img/tiktok-latest.jpg (miniature, hébergée par le site lui-même)
  - assets/img/tiktok/<id>.webp  (miniatures 3:4 des autres vidéos récentes)

Usage : python tools/update_tiktok.py
Bibliothèque standard, plus Pillow pour réduire les miniatures (sans Pillow,
elles sont gardées telles quelles en JPEG). Lancé automatiquement par
.github/workflows/update-tiktok.yml une fois le site hébergé sur GitHub.
"""

import datetime
import io
import json
import pathlib
import re
import sys
import time
import urllib.request

try:
    from PIL import Image, ImageOps
except ImportError:
    Image = None

ACCOUNT = "landers2k"
ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "assets" / "data" / "tiktok.json"
COVER_FILE = ROOT / "assets" / "img" / "tiktok-latest.jpg"
THUMB_DIR = ROOT / "assets" / "img" / "tiktok"
RECENT = 6  # vidéos affichées sous le dernier TikTok
THUMB_SIZE = (300, 400)  # 3:4, comme la grille d'un profil TikTok
TRIES, WAIT = 3, 20  # essais auprès de TikTok, et secondes d'attente entre deux essais
MAX_STALE = datetime.timedelta(days=3)  # au-delà, une panne n'est plus passagère : le robot échoue
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/130.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9",
}


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=30) as res:
        return res.read()


def published(video_id: str) -> datetime.datetime:
    # Les 32 bits de poids fort d'un identifiant TikTok = date de publication (secondes Unix).
    return datetime.datetime.fromtimestamp(int(video_id) >> 32, datetime.timezone.utc)


def save_thumb(video: dict) -> str | None:
    """Enregistre la miniature d'une vidéo, une seule fois (elle ne change plus ensuite)."""
    path = THUMB_DIR / f"{video['id']}.{'webp' if Image else 'jpg'}"
    if not path.exists():
        url = video.get("originCoverUrl") or video.get("coverUrl")
        if not url:
            return None
        try:
            raw = fetch(url)
        except Exception as error:
            print(f"Miniature de {video['id']} indisponible : {error}", file=sys.stderr)
            return None
        THUMB_DIR.mkdir(parents=True, exist_ok=True)
        if Image:
            thumb = ImageOps.fit(Image.open(io.BytesIO(raw)).convert("RGB"), THUMB_SIZE, Image.LANCZOS)
            thumb.save(path, "WEBP", quality=72, method=6)
        else:
            path.write_bytes(raw)
    return path.relative_to(ROOT).as_posix()


def load_videos() -> tuple[dict, list] | None:
    """Lit le profil et les vidéos publiques ; TikTok refuse parfois de répondre, on réessaie."""
    for attempt in range(1, TRIES + 1):
        try:
            html = fetch(f"https://www.tiktok.com/embed/@{ACCOUNT}?lang=fr").decode("utf-8", "replace")
            match = re.search(r'<script[^>]*id="__FRONTITY_CONNECT_STATE__"[^>]*>(.*?)</script>', html, re.S)
            if not match:
                raise ValueError("données TikTok introuvables dans la page")
            state = json.loads(match.group(1))
            page = next(v for k, v in state["source"]["data"].items() if k.startswith("/embed/"))
            videos = [v for v in page["videoList"] if str(v.get("id", "")).isdigit() and not v.get("privateItem")]
            if not videos:
                raise ValueError("aucune vidéo publique trouvée")
            return page["userInfo"], videos
        except Exception as error:  # page bloquée, réponse vide, format inattendu…
            print(f"Essai {attempt}/{TRIES} : {error}", file=sys.stderr)
            if attempt < TRIES:
                time.sleep(WAIT)
    return None


def main() -> int:
    loaded = load_videos()
    if loaded is None:
        # Panne passagère de TikTok : on garde les données actuelles sans faire échouer le robot.
        # Si rien n'a pu être mis à jour depuis plusieurs jours, la page a sans doute changé : on échoue
        # pour que GitHub envoie un e-mail.
        old = json.loads(DATA_FILE.read_text("utf-8")) if DATA_FILE.exists() else {}
        try:
            last = datetime.datetime.fromisoformat(old["updated"])
        except (KeyError, ValueError):
            last = None
        if last and datetime.datetime.now(datetime.timezone.utc) - last < MAX_STALE:
            print(f"::warning::TikTok n'a pas répondu, on garde le dernier TikTok connu (mis à jour le {last:%d/%m %H:%M} UTC).")
            return 0
        print("::error::Impossible de lire TikTok depuis plusieurs jours : la page a peut-être changé.")
        return 1

    user, videos = loaded

    latest = max(videos, key=lambda v: int(v["id"]))
    video_id = str(latest["id"])

    old = json.loads(DATA_FILE.read_text("utf-8")) if DATA_FILE.exists() else {}
    if old.get("latest", {}).get("id") != video_id or not COVER_FILE.exists():
        cover_url = latest.get("originCoverUrl") or latest.get("coverUrl")
        if cover_url:
            COVER_FILE.parent.mkdir(parents=True, exist_ok=True)
            COVER_FILE.write_bytes(fetch(cover_url))

    # Les vidéos suivantes, de la plus récente à la plus ancienne ; les miniatures qui ne servent plus sont effacées.
    recent = []
    for video in sorted(videos, key=lambda v: int(v["id"]), reverse=True)[1:RECENT + 1]:
        vid = str(video["id"])
        recent.append({
            "id": vid,
            "url": f"https://www.tiktok.com/@{ACCOUNT}/video/{vid}",
            "description": (video.get("desc") or "").strip(),
            "plays": video.get("playCount"),
            "published": published(vid).date().isoformat(),
            "cover": save_thumb(video),
        })
    kept = {item["cover"] for item in recent}
    for old_thumb in THUMB_DIR.glob("*"):
        if old_thumb.relative_to(ROOT).as_posix() not in kept:
            old_thumb.unlink()

    plays = [v.get("playCount") or 0 for v in videos]
    data = {
        "account": ACCOUNT,
        "followers": user.get("followerCount"),
        "likes": user.get("heartCount"),
        # Vues cumulées des vidéos visibles sur le profil (épinglées + récentes)
        "recentVideos": len(videos),
        "recentViews": sum(plays),
        "bestViews": max(plays),
        "latest": {
            "id": video_id,
            "url": f"https://www.tiktok.com/@{ACCOUNT}/video/{video_id}",
            "description": (latest.get("desc") or "").strip(),
            "plays": latest.get("playCount"),
            "published": published(video_id).date().isoformat(),
            "cover": "assets/img/tiktok-latest.jpg",
        },
        "recent": recent,
    }
    if {k: v for k, v in old.items() if k != "updated"} == data:
        print(f"Rien de nouveau (dernier TikTok : {video_id}).")
        return 0

    data["updated"] = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(f"Dernier TikTok : {video_id} ({data['latest']['published']}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
