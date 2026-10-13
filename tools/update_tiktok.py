"""Met à jour le dernier TikTok affiché sur le site.

Lit la page publique d'intégration TikTok du compte, repère la vidéo la plus
récente (les vidéos épinglées, plus anciennes, sont ignorées : l'identifiant
d'une vidéo TikTok contient sa date de publication), puis écrit :
  - assets/data/tiktok.json      (vidéo, légende, abonnés, j'aime)
  - assets/img/tiktok-latest.jpg (miniature, hébergée par le site lui-même)

Usage : python tools/update_tiktok.py
Bibliothèque standard uniquement. Lancé automatiquement par
.github/workflows/update-tiktok.yml une fois le site hébergé sur GitHub.
"""

import datetime
import json
import pathlib
import re
import sys
import urllib.request

ACCOUNT = "landers2k"
ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "assets" / "data" / "tiktok.json"
COVER_FILE = ROOT / "assets" / "img" / "tiktok-latest.jpg"
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


def main() -> int:
    html = fetch(f"https://www.tiktok.com/embed/@{ACCOUNT}?lang=fr").decode("utf-8", "replace")
    match = re.search(r'<script[^>]*id="__FRONTITY_CONNECT_STATE__"[^>]*>(.*?)</script>', html, re.S)
    if not match:
        print("Données TikTok introuvables : la page a peut-être changé.", file=sys.stderr)
        return 1

    state = json.loads(match.group(1))
    page = next(v for k, v in state["source"]["data"].items() if k.startswith("/embed/"))
    user = page["userInfo"]
    videos = [v for v in page["videoList"] if str(v.get("id", "")).isdigit() and not v.get("privateItem")]
    if not videos:
        print("Aucune vidéo publique trouvée.", file=sys.stderr)
        return 1

    latest = max(videos, key=lambda v: int(v["id"]))
    video_id = str(latest["id"])

    old = json.loads(DATA_FILE.read_text("utf-8")) if DATA_FILE.exists() else {}
    if old.get("latest", {}).get("id") != video_id or not COVER_FILE.exists():
        cover_url = latest.get("originCoverUrl") or latest.get("coverUrl")
        if cover_url:
            COVER_FILE.parent.mkdir(parents=True, exist_ok=True)
            COVER_FILE.write_bytes(fetch(cover_url))

    data = {
        "account": ACCOUNT,
        "followers": user.get("followerCount"),
        "likes": user.get("heartCount"),
        "latest": {
            "id": video_id,
            "url": f"https://www.tiktok.com/@{ACCOUNT}/video/{video_id}",
            "description": (latest.get("desc") or "").strip(),
            "plays": latest.get("playCount"),
            "published": published(video_id).date().isoformat(),
            "cover": "assets/img/tiktok-latest.jpg",
        },
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
