"""Construit la galerie « Skins à débloquer » de la page du jeu à partir du catalogue du jeu.

Lit ~/Documents/Don't Tap Red/skins/skin_catalog.gd (sur le Mac de Tony) et écrit :
  - assets/data/skins.json     (skins de la boutique, Originals, skins d'événement, dates des événements)
  - assets/img/skins/<id>.avif (images transparentes 160 px, fabriquées par .claude/outils_partage/avif.swift)

Ne prend pas les skins de pass (section Pass de saison) ni de Prestige (récompenses, pas en vente).
Usage : python3 tools/build_skins.py   (à relancer quand le jeu ajoute des skins), puis tools/build_all.py
"""
import json
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = pathlib.Path.home() / "Documents" / "Don't Tap Red"
CATALOG = GAME / "skins" / "skin_catalog.gd"
OUT_JSON = ROOT / "assets" / "data" / "skins.json"
OUT_IMG = ROOT / "assets" / "img" / "skins"
AVIF_SRC = ROOT / ".claude" / "outils_partage" / "avif.swift"
AVIF_BIN = pathlib.Path("/tmp") / "landers2k_avif"
SIZE, QUALITY = 160, 0.55
KEEP = {"classic", "premium", "original", "free"}
COLORS = {"blue": "blue", "red": "red", "green": "green", "purple": "purple", "orange": "orange", "yellow": "yellow"}
EVENT_NAMES = {"halloween": ("Halloween", "Halloween"), "noel": ("Noël", "Christmas"),
               "saint_valentin": ("Saint-Valentin", "Valentine’s Day"), "paques": ("Pâques", "Easter")}


def main():
    text = CATALOG.read_text("utf-8")
    events = {}
    for eid, start, end, color in re.findall(r'"(\w+)": \{"name": "[^"]+", "start": "([\d-]+)", "end": "([\d-]+)", "color": Color\("(#\w+)"\)\}', text):
        fr, en = EVENT_NAMES.get(eid, (eid, eid))
        events[eid] = {"name": fr, "name_en": en, "start": start, "end": end, "color": color}
    order = re.search(r"const EVENT_ORDER := \[(.*?)\]", text).group(1)
    event_order = re.findall(r'"(\w+)"', order)

    if not AVIF_BIN.exists() or AVIF_BIN.stat().st_mtime < AVIF_SRC.stat().st_mtime:
        subprocess.run(["swiftc", "-O", str(AVIF_SRC), "-o", str(AVIF_BIN)], check=True, capture_output=True)
    OUT_IMG.mkdir(parents=True, exist_ok=True)

    skins = []
    for entry in re.findall(r'\{"id": "[^"]+".*?\}(?=,?\s*\n)', text):
        get = lambda k: (re.search(rf'"{k}": "([^"]*)"', entry) or [None, None])[1]
        tier = get("tier")
        if tier not in KEEP:
            continue
        sid = get("id")
        image = GAME / get("image").replace("res://", "")
        if not image.exists():
            print("image absente :", sid)
            continue
        out = OUT_IMG / f"{sid}.avif"
        if not out.exists() or out.stat().st_mtime < image.stat().st_mtime:
            subprocess.run([str(AVIF_BIN), str(image), str(out), str(SIZE), str(QUALITY)], check=True, capture_output=True)
        skins.append({
            "id": sid,
            "name": get("name"),
            "color": COLORS.get(get("color"), get("color")),
            "tier": tier,
            "event": get("event") or "",
            "price": int(re.search(r'"price": (\d+)', entry).group(1)),
            "fx": '"fx"' in entry,
            "img": f"assets/img/skins/{sid}.avif",
        })
    kept = {s["img"] for s in skins}
    for f in OUT_IMG.glob("*.avif"):
        if f.relative_to(ROOT).as_posix() not in kept:
            f.unlink()

    data = {"events": {e: events[e] for e in event_order if e in events}, "skins": skins}
    OUT_JSON.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", "utf-8")
    count = {}
    for s in skins:
        key = f"{s['tier']}{'/' + s['event'] if s['event'] else ''}"
        count[key] = count.get(key, 0) + 1
    print(len(skins), "skins :", count)


if __name__ == "__main__":
    main()
