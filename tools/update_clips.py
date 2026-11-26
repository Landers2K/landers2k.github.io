"""Met à jour « Mes meilleurs clips » : les 6 TikToks les plus vus, affichés sur l'accueil.

Lit la liste publique des vidéos du profil (vidéos épinglées + récentes, comme update_tiktok.py),
garde en mémoire les plus vues avec leur miniature (hébergée par le site), et met leurs vues à jour.
Une vidéo qui n'apparaît plus dans la liste de TikTok reste affichée tant qu'elle fait partie
des 6 plus vues (ses vues restent celles de la dernière lecture).

Écrit :
  - assets/data/clips.json            (les 6 vidéos, dans l'ordre des vues)
  - assets/img/clips/<id>.webp  (miniatures 3:4 ; .jpg si Pillow n'est pas installé)

Usage : python tools/update_clips.py   (au plus une lecture de TikTok toutes les 6 heures)
Lancé à la fin de tools/update_tiktok.py (robot horaire .github/workflows/update-tiktok.yml).
"""

import datetime
import io
import json
import pathlib
import re
import urllib.request

try:
    from PIL import Image, ImageOps
except ImportError:
    Image = None

ACCOUNT = "landers2k"
ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "assets" / "data" / "clips.json"
THUMB_DIR = ROOT / "assets" / "img" / "clips"
KEEP = 6
EVERY = datetime.timedelta(hours=6)
THUMB_SIZE = (300, 400)
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/130.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9",
    # La liste vue depuis la France (voir update_tiktok.py)
    "Cookie": "store-country-code=fr; store-idc=eu-ttp2; tt-target-idc=eu-ttp2",
}


def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=30) as r:
        return r.read()


def published(video_id):
    # L'identifiant d'une vidéo TikTok contient sa date de publication (secondes depuis 1970)
    return datetime.datetime.fromtimestamp(int(video_id) >> 32, datetime.timezone.utc).date().isoformat()


def save_thumb(video_id, url):
    raw = fetch(url)
    THUMB_DIR.mkdir(parents=True, exist_ok=True)
    if Image:
        img = ImageOps.fit(Image.open(io.BytesIO(raw)).convert("RGB"), THUMB_SIZE, Image.LANCZOS)
        path = THUMB_DIR / f"{video_id}.webp"
        img.save(path, "WEBP", quality=80)
    else:
        path = THUMB_DIR / f"{video_id}.jpg"
        path.write_bytes(raw)
    return path.relative_to(ROOT).as_posix()


def main():
    old = {}
    if DATA_FILE.exists():
        try:
            old = json.loads(DATA_FILE.read_text("utf-8"))
        except ValueError:
            old = {}
    now = datetime.datetime.now(datetime.timezone.utc)
    if old.get("checked") and now - datetime.datetime.fromisoformat(old["checked"]) < EVERY:
        print("Meilleurs clips : lus il y a moins de 6 h.")
        return

    html = fetch(f"https://www.tiktok.com/embed/@{ACCOUNT}?lang=fr").decode("utf-8", "replace")
    m = re.search(r'<script id="__FRONTITY_CONNECT_STATE__" type="application/json">(.*?)</script>', html, re.S)
    if not m:
        print("Meilleurs clips : page TikTok illisible, on garde les anciens.")
        return
    state = json.loads(m.group(1))
    page = next((v for k, v in state["source"]["data"].items() if k.startswith("/embed/")), {})
    seen = {str(v.get("id")): v for v in page.get("videoList") or [] if re.fullmatch(r"\d{10,25}", str(v.get("id")))}
    if not seen:
        print("Meilleurs clips : liste vide, on garde les anciens.")
        return

    pool = {c["id"]: dict(c) for c in old.get("clips", [])}
    for vid, v in seen.items():
        clip = pool.get(vid, {"id": vid, "published": published(vid)})
        clip["description"] = (v.get("desc") or "").strip()
        clip["plays"] = int(v.get("playCount") or clip.get("plays") or 0)
        clip["_cover_url"] = v.get("coverUrl") or v.get("originCoverUrl")
        pool[vid] = clip
    best = sorted(pool.values(), key=lambda c: c.get("plays", 0), reverse=True)[:KEEP]

    for clip in best:
        cover = clip.get("cover")
        if not cover or not (ROOT / cover).exists():
            url = clip.get("_cover_url")
            if url:
                try:
                    clip["cover"] = save_thumb(clip["id"], url)
                except Exception as e:  # noqa: BLE001
                    print("Miniature non téléchargée :", clip["id"], e)
        clip.pop("_cover_url", None)
    # Miniatures des vidéos sorties du top
    keep = {c.get("cover") for c in best}
    if THUMB_DIR.exists():
        for f in THUMB_DIR.iterdir():
            if f.is_file() and f.relative_to(ROOT).as_posix() not in keep:
                f.unlink()

    data = {"clips": best}
    changed = {"clips": old.get("clips")} != data
    data["checked"] = now.isoformat(timespec="seconds")
    if changed:
        data["updated"] = data["checked"]
    elif old.get("updated"):
        data["updated"] = old["updated"]
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print("Meilleurs clips :", ", ".join(f"{c['id']} ({c['plays']})" for c in best))


if __name__ == "__main__":
    main()
