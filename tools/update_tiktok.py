"""Met à jour le dernier TikTok affiché sur le site.

Lit la page publique d'intégration TikTok du compte, repère la vidéo la plus
récente (les vidéos épinglées, plus anciennes, sont ignorées : l'identifiant
d'une vidéo TikTok contient sa date de publication), puis écrit :
  - assets/data/tiktok.json      (vidéo, légende, abonnés, j'aime, vues, vidéos récentes)
  - assets/img/tiktok-latest.jpg (miniature, hébergée par le site lui-même)
  - assets/img/tiktok/<id>.webp  (miniatures 3:4 des autres vidéos récentes)

TikTok ne renvoie pas toujours toutes les vidéos : selon le serveur qui répond,
certaines manquent, parfois pendant des jours. La page est donc lue plusieurs
fois, comme depuis la France, et les vidéos déjà affichées sont gardées tant que
de plus récentes ne les ont pas remplacées. Une vidéo supprimée reste donc
affichée jusque-là : pour la retirer tout de suite, l'enlever de tiktok.json
(dans « latest » ou « recent », et dans « views »).

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
WINDOW = 10  # vidéos récentes que TikTok met dans la liste du profil, en plus des épinglées
THUMB_SIZE = (300, 400)  # 3:4, comme la grille d'un profil TikTok
READS, TRIES = 3, 6  # lectures réussies de la page à réunir, et essais au plus pour y arriver
WAIT, PAUSE = 20, 8  # secondes d'attente après un refus de TikTok, et entre deux lectures
MAX_STALE = datetime.timedelta(days=3)  # au-delà, une panne n'est plus passagère : le robot échoue
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/130.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9",
}
# Les vidéos telles qu'un visiteur français les voit : sans ce cookie, les serveurs de GitHub
# (aux États-Unis) reçoivent la liste américaine, avec d'autres vidéos épinglées.
PROFILE_HEADERS = {**HEADERS, "Cookie": "store-country-code=fr; store-idc=eu-ttp2; tt-target-idc=eu-ttp2"}


def fetch(url: str, headers: dict = HEADERS) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30) as res:
        return res.read()


def published(video_id: str) -> datetime.datetime:
    # Les 32 bits de poids fort d'un identifiant TikTok = date de publication (secondes Unix).
    return datetime.datetime.fromtimestamp(int(video_id) >> 32, datetime.timezone.utc)


def image_bytes(video: dict) -> bytes | None:
    """L'image d'une vidéo : celle déjà sur le site si possible, sinon téléchargée chez TikTok."""
    if video.get("coverBytes"):
        return video["coverBytes"]
    url = video.get("originCoverUrl") or video.get("coverUrl")
    if not url:
        return None
    try:
        return fetch(url)
    except Exception as error:
        print(f"Image de {video['id']} indisponible : {error}", file=sys.stderr)
        return None


def as_jpeg(raw: bytes) -> bytes:
    """Convertit une image en JPEG (pour tiktok-latest.jpg), quand Pillow est là."""
    if not Image:
        return raw
    out = io.BytesIO()
    Image.open(io.BytesIO(raw)).convert("RGB").save(out, "JPEG", quality=88)
    return out.getvalue()


def save_thumb(video: dict) -> str | None:
    """Enregistre la miniature d'une vidéo, une seule fois (elle ne change plus ensuite)."""
    path = THUMB_DIR / f"{video['id']}.{'webp' if Image else 'jpg'}"
    if not path.exists():
        raw = image_bytes(video)
        if raw is None:
            return None
        THUMB_DIR.mkdir(parents=True, exist_ok=True)
        if Image:
            thumb = ImageOps.fit(Image.open(io.BytesIO(raw)).convert("RGB"), THUMB_SIZE, Image.LANCZOS)
            thumb.save(path, "WEBP", quality=72, method=6)
        else:
            path.write_bytes(raw)
    return path.relative_to(ROOT).as_posix()


def read_profile() -> tuple[dict, list]:
    """Une lecture de la page d'intégration du profil : infos du compte et vidéos publiques."""
    html = fetch(f"https://www.tiktok.com/embed/@{ACCOUNT}?lang=fr", PROFILE_HEADERS).decode("utf-8", "replace")
    match = re.search(r'<script[^>]*id="__FRONTITY_CONNECT_STATE__"[^>]*>(.*?)</script>', html, re.S)
    if not match:
        raise ValueError("données TikTok introuvables dans la page")
    state = json.loads(match.group(1))
    page = next(v for k, v in state["source"]["data"].items() if k.startswith("/embed/"))
    videos = [v for v in page["videoList"] if str(v.get("id", "")).isdigit() and not v.get("privateItem")]
    if not videos:
        raise ValueError("aucune vidéo publique trouvée")
    # Les vidéos épinglées viennent en tête de liste, avant la plus récente
    newest = max(range(len(videos)), key=lambda i: int(videos[i]["id"]))
    for i, video in enumerate(videos):
        video["pinned"] = i < newest
    return page["userInfo"], videos


def load_videos() -> tuple[dict, list] | None:
    """Réunit plusieurs lectures du profil ; TikTok refuse parfois de répondre, on réessaie."""
    user, videos, reads = None, {}, 0
    for attempt in range(1, TRIES + 1):
        try:
            user, found = read_profile()
        except Exception as error:  # page bloquée, réponse vide, format inattendu…
            print(f"Essai {attempt}/{TRIES} : {error}", file=sys.stderr)
            if attempt < TRIES:
                time.sleep(WAIT)
            continue
        for video in found:
            video["id"] = str(video["id"])
            if (video.get("playCount") or 0) >= (videos.get(video["id"], {}).get("playCount") or 0):
                videos[video["id"]] = video
        reads += 1
        if reads == READS:
            break
        if attempt < TRIES:
            time.sleep(PAUSE)
    print(f"{reads} lecture(s) réussie(s) sur {READS} voulues, {len(videos)} vidéos.")
    return (user, list(videos.values())) if videos else None


def remembered(old: dict, cover_id: str) -> dict:
    """Les vidéos affichées au dernier passage, au format de TikTok, avec leur image déjà sur le site."""
    latest = old.get("latest") if isinstance(old.get("latest"), dict) else {}
    recent = old.get("recent") if isinstance(old.get("recent"), list) else []
    videos = {}
    for item in [latest, *recent]:
        vid = str(item.get("id", "")) if isinstance(item, dict) else ""
        if not vid.isdigit():
            continue
        video = {"id": vid, "desc": item.get("description") or "", "playCount": item.get("plays")}
        # Sa miniature dans la grille, ou l'image du dernier TikTok si c'est bien la sienne
        if item is latest:
            image = COVER_FILE if vid == cover_id else None
        else:
            image = THUMB_DIR / pathlib.Path(str(item.get("cover") or "-")).name
        if image and image.is_file():
            video["coverBytes"] = image.read_bytes()
        videos[vid] = video
    return videos


def main() -> int:
    loaded = load_videos()
    old = json.loads(DATA_FILE.read_text("utf-8")) if DATA_FILE.exists() else {}
    if loaded is None:
        # Panne passagère de TikTok : on garde les données actuelles sans faire échouer le robot.
        # Si rien n'a pu être mis à jour depuis plusieurs jours, la page a sans doute changé : on échoue
        # pour que GitHub envoie un e-mail.
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
    old_latest = old.get("latest") if isinstance(old.get("latest"), dict) else {}
    # Vidéo que montre tiktok-latest.jpg (les anciennes données ne le disaient pas : c'était toujours le dernier TikTok)
    cover_id = str(old["coverId"] if "coverId" in old else old_latest.get("id") or "")

    # Les vidéos lues cette fois, plus celles du dernier passage que TikTok a omises (avec leurs anciens chiffres)
    pool = remembered(old, cover_id)
    for video in videos:
        pool[video["id"]] = {**pool.get(video["id"], {}), **video}
    ordered = sorted(pool.values(), key=lambda v: int(v["id"]), reverse=True)
    latest = ordered[0]
    video_id = latest["id"]

    # Nouvelle image du dernier TikTok, préparée avant toute écriture (un échec de téléchargement arrête tout)
    cover = None
    if cover_id != video_id or not COVER_FILE.exists():
        cover_url = latest.get("originCoverUrl") or latest.get("coverUrl")
        if cover_url:
            cover = fetch(cover_url)
        elif latest.get("coverBytes"):  # vidéo gardée en mémoire : sa miniature de la grille
            cover = as_jpeg(latest["coverBytes"])
        else:
            print(f"::warning::Pas encore d'image pour le dernier TikTok ({video_id}), on réessaiera.")

    # Les vidéos suivantes, de la plus récente à la plus ancienne ; les miniatures qui ne servent plus sont effacées.
    recent = []
    for video in ordered[1:RECENT + 1]:
        vid = video["id"]
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

    if cover:
        COVER_FILE.parent.mkdir(parents=True, exist_ok=True)
        COVER_FILE.write_bytes(cover)
        cover_id = video_id

    # Vues des vidéos de la liste TikTok : les épinglées lues cette fois, plus les WINDOW plus récentes.
    # Celles que TikTok omet cette fois gardent leurs vues du dernier passage.
    known = old.get("views") if isinstance(old.get("views"), dict) else {}
    views = {vid: n for vid, n in known.items() if vid.isdigit() and isinstance(n, int)}
    views.update({v["id"]: v.get("playCount") or 0 for v in ordered[:RECENT + 1] + videos})
    pinned = {v["id"] for v in videos if v.get("pinned")}
    newest = [vid for vid in sorted(views, key=int, reverse=True) if vid not in pinned][:WINDOW]
    views = {vid: views[vid] for vid in sorted(views, key=int, reverse=True) if vid in pinned or vid in newest}

    data = {
        "account": ACCOUNT,
        "followers": user.get("followerCount"),
        "likes": user.get("heartCount"),
        "recentVideos": len(views),
        "recentViews": sum(views.values()),
        "bestViews": max(views.values()),
        "latest": {
            "id": video_id,
            "url": f"https://www.tiktok.com/@{ACCOUNT}/video/{video_id}",
            "description": (latest.get("desc") or "").strip(),
            "plays": latest.get("playCount"),
            "published": published(video_id).date().isoformat(),
            "cover": "assets/img/tiktok-latest.jpg",
        },
        "recent": recent,
        "views": views,
        "coverId": cover_id,
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
