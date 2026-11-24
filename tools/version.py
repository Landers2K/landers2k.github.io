"""Ajoute un numéro de version aux liens de styles.css et script.js dans toutes les pages (?v=…).

Le numéro dépend du contenu du fichier : dès qu'il change, les navigateurs téléchargent la
nouvelle version au lieu de garder l'ancienne en mémoire (GitHub Pages la garde 10 minutes).

Usage : python tools/version.py          → met les numéros à jour
        python tools/version.py --strip  → les retire (avant de reconstruire les pages)
Normalement lancé par tools/build_all.py.
"""
import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
FILES = ["styles.css", "script.js"]
LINK = re.compile(r'((?:href|src)="/?(?:styles\.css|script\.js))(?:\?v=\w+)?"')


def main():
    strip = "--strip" in sys.argv
    versions = {f: hashlib.sha1((ROOT / f).read_bytes()).hexdigest()[:10] for f in FILES}
    pages = [p for p in ROOT.rglob("*.html") if ".git" not in p.parts and "overlay" not in p.parts]
    changed = 0
    for page in pages:
        text = page.read_text("utf-8")

        def repl(m):
            if strip:
                return m.group(1) + '"'
            name = "styles.css" if "styles.css" in m.group(1) else "script.js"
            return f'{m.group(1)}?v={versions[name]}"'

        new = LINK.sub(repl, text)
        if new != text:
            page.write_text(new, "utf-8")
            changed += 1
    print(("numéros retirés" if strip else f"versions {versions}") + f" · {changed} page(s) modifiée(s)")


if __name__ == "__main__":
    main()
