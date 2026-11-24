"""Met à jour le classement de Don't Tap Red affiché sur le site.

Lit les classements du jeu (base Firestore du projet donttapred-game), comme le fait le jeu :
  - le top 10 de toujours de chaque mode (Arcade, Rain, Chrono, Fusion) ;
  - le top 10 de la semaine en cours (même découpage des semaines que le jeu, heure de Paris) ;
  - les dégâts du boss de la semaine en cours, s'il y en a un (barre de vie en direct).
Écrit assets/data/classement.json, seulement si quelque chose a changé.

Le jeu n'ouvre ses classements qu'aux joueurs connectés : le robot crée donc un compte
anonyme temporaire (comme un nouveau joueur), lit les classements, puis supprime ce compte.

Usage : python tools/update_classement.py
Bibliothèque standard seulement. Lancé toutes les heures à la fin de tools/update_tiktok.py
(robot .github/workflows/update-tiktok.yml : son commit « Dernier TikTok mis à jour » inclut aussi le classement).
"""

import datetime
import json
import pathlib
import sys
import urllib.error
import urllib.request
import zoneinfo

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "data" / "classement.json"

# Clé publique du jeu (la même que dans l'application, elle n'ouvre rien de plus qu'un compte joueur)
API_KEY = "AIzaSyCkbQYWDnaqAKAPNtgS1Xqo3Oesmlxe7S0"
AUTH = "https://identitytoolkit.googleapis.com/v1/accounts:"
FIRESTORE = "https://firestore.googleapis.com/v1/projects/donttapred-game/databases/(default)/documents"

# Mode affiché → collection du classement de toujours, sous-collection de la semaine
MODES = {
    "arcade": ("leaderboard_arcade2", "arcade"),
    "rain": ("leaderboard_rain", "rain"),
    "chrono": ("leaderboard_chrono", "chrono"),
    "fusion": ("leaderboard_cross", "cross"),
}
TOP = 10


def call(url, body=None, token=None):
    headers = {"Content-Type": "application/json", "User-Agent": "landers2k-site"}
    if token:
        headers["Authorization"] = "Bearer " + token
    data = json.dumps(body).encode() if body is not None else None
    with urllib.request.urlopen(urllib.request.Request(url, data, headers), timeout=30) as r:
        return json.load(r)


def value(v):
    """Valeur Firestore → valeur Python (entiers, textes)."""
    if "integerValue" in v:
        return int(v["integerValue"])
    if "doubleValue" in v:
        return int(v["doubleValue"])
    return next(iter(v.values()), None)


def top(parent, collection, field, token, limit=TOP):
    query = {"structuredQuery": {
        "from": [{"collectionId": collection}],
        "orderBy": [{"field": {"fieldPath": field}, "direction": "DESCENDING"}],
        "limit": limit,
    }}
    rows = []
    for item in call(f"{FIRESTORE}{parent}:runQuery", query, token):
        doc = item.get("document")
        if not doc:
            continue
        f = {k: value(v) for k, v in doc.get("fields", {}).items()}
        rows.append({
            "name": str(f.get("name") or "Joueur")[:20],
            "score": int(f.get(field) or 0),
            "level": int(f.get("level") or 0),
            "prestige": int(f.get("prestige") or 0),
        })
    return [r for r in rows if r["score"] > 0]


def week_key(now):
    # Même calcul que le jeu (get_boss_week) : jour local depuis 1970, semaines du lundi au dimanche
    day = (now.date() - datetime.date(1970, 1, 1)).days
    return f"w{(day + 3) // 7}"


def main():
    now = datetime.datetime.now(zoneinfo.ZoneInfo("Europe/Paris"))
    week = week_key(now)
    token = call(f"{AUTH}signUp?key={API_KEY}", {"returnSecureToken": True})["idToken"]
    try:
        modes = {}
        for mode, (board, sub) in MODES.items():
            modes[mode] = {
                "all": top("", board, "score", token),
                "week": top(f"/weekly/{week}", sub, "score", token),
            }
        boss = None
        try:
            doc = call(f"{FIRESTORE}/boss/{week}", token=token)
            damage = int(value(doc.get("fields", {}).get("damage", {"integerValue": "0"})) or 0)
            if damage > 0:
                players = top(f"/boss/{week}", "players", "damage", token, 3)
                boss = {"week": week, "damage": damage, "top": [{"name": p["name"], "damage": p["score"]} for p in players]}
        except urllib.error.HTTPError:
            pass  # pas de boss cette semaine
    finally:
        # Le compte anonyme ne sert qu'à cette lecture : on le supprime tout de suite
        try:
            call(f"{AUTH}delete?key={API_KEY}", {"idToken": token})
        except Exception as e:  # noqa: BLE001
            print("compte temporaire non supprimé :", e, file=sys.stderr)

    data = {"week": week, "modes": modes, "boss": boss}
    old = {}
    if OUT.exists():
        try:
            old = json.loads(OUT.read_text("utf-8"))
        except ValueError:
            old = {}
    if {k: old.get(k) for k in data} == data:
        print("classement inchangé")
        return
    data["updated"] = now.isoformat(timespec="minutes")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", "utf-8")
    counts = ", ".join(f"{m} {len(v['all'])}/{len(v['week'])}" for m, v in modes.items())
    print(f"classement écrit ({week}) : {counts}" + (f", boss {boss['damage']}" if boss else ""))


if __name__ == "__main__":
    main()
