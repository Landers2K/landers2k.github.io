"""Recopie le menu, les icônes et le pied de page de index.html dans les
autres pages du site (partenariats.html, setup.html…), pour qu'ils restent
identiques partout.

Usage : python tools/sync_pages.py
À relancer après chaque modification du menu ou du pied de page de index.html.
"""

import pathlib
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ["partenariats.html", "setup.html"]

# Chaque bloc va de son marqueur de début jusqu'à son marqueur de fin (inclus)
BLOCKS = [
    ("  <!-- Icônes (réutilisées partout via <use>) -->", "  </svg>\n"),
    ("  <!-- ===================== Barre de navigation flottante ===================== -->", "  </div>\n\n  <main id=\"main\">"),
    ("  <!-- ===================== Pied de page ===================== -->", "  <script src=\"script.js\" defer></script>\n"),
]


def span(text: str, start: str, end: str) -> tuple[int, int]:
    a = text.index(start)
    b = text.index(end, a) + len(end)
    return a, b


def to_home(block: str) -> str:
    # Les ancres de l'accueil (#tiktok…) deviennent ./#tiktok ; les icônes (#i-…) restent locales
    block = block.replace('href="#accueil"', 'href="./"')
    return re.sub(r'href="#(?!i-)([\w-]+)"', r'href="./#\1"', block)


def main() -> None:
    index = (ROOT / "index.html").read_text("utf-8")
    for name in PAGES:
        path = ROOT / name
        page = path.read_text("utf-8")
        for start, end in BLOCKS:
            a, b = span(index, start, end)
            pa, pb = span(page, start, end)
            page = page[:pa] + to_home(index[a:b]) + page[pb:]
        path.write_text(page, "utf-8")
        print(f"{name} : menu et pied de page à jour")


if __name__ == "__main__":
    main()
