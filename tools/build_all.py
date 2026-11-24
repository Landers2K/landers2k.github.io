"""Reconstruit tout le site, dans le bon ordre, après une modification.

  1. retire les numéros de version (?v=…) des liens styles.css / script.js
  2. page du jeu, kit presse, menus et pieds de page, pages anglaises
  3. remet les numéros de version (les navigateurs prennent alors la dernière version)

Usage : python3 tools/build_all.py
"""
import pathlib
import subprocess
import sys

TOOLS = pathlib.Path(__file__).resolve().parent
STEPS = [
    ["version.py", "--strip"],
    ["build_dtr.py"],
    ["build_presse.py"],
    ["sync_pages.py"],
    ["build_en.py"],
    ["build_dtr_en.py"],
    ["version.py"],
]

for step in STEPS:
    print(f"→ {' '.join(step)}")
    result = subprocess.run([sys.executable, str(TOOLS / step[0]), *step[1:]], cwd=TOOLS.parent)
    if result.returncode:
        sys.exit(f"Échec à l'étape {step[0]}")
print("Site reconstruit.")
