"""Construit la version anglaise de la page du jeu (/dont-tap-red/en/) à partir de la page française.

Même structure et mêmes animations ; textes traduits, menu et pied de page en anglais.
À relancer après chaque modification de la page française (tools/build_dtr.py).
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
fr = (ROOT / "dont-tap-red" / "index.html").read_text("utf-8")
index = (ROOT / "index.html").read_text("utf-8")


def cut(text, start, end):
    a = text.index(start)
    return text[a:text.index(end, a) + len(end)]


main = cut(fr, '  <main id="main">', "  </main>")
icons = cut(index, "  <!-- Icônes (réutilisées partout via <use>) -->", "  </svg>\n")

from textes_jeu_en import T  # traductions partagées avec tools/build_en.py
for a, b in T:
    n = main.count(a)
    assert n >= 1, f"introuvable : {a[:80]}"
    main = main.replace(a, b)
# Le magasin des modes (étoiles, sections…) garde ses identifiants français : ce sont des ancres, pas du texte

# ---------------------------------------------------------------- Menu, pied de page
# Les mêmes que le reste du site anglais (construits par tools/build_en.py), avec le choix de la langue de cette page
en_setup = (ROOT / "en" / "setup.html").read_text("utf-8")
nav = en_setup[en_setup.index("  <!-- ===================== Barre de navigation flottante"):en_setup.index('  <main id="main">')]
nav = re.sub(r'<details class="lang" data-lang>.*?</details>', lambda m: m.group(0)
             .replace('href="/setup.html"', 'href="/dont-tap-red/"').replace('href="/en/setup.html"', 'href="/dont-tap-red/en/"'), nav, flags=re.S)
footer = cut(en_setup, "  <!-- ===================== Pied de page", '  <script src="/script.js" defer></script>\n')

ANALYTICS = cut(index, "  <!-- Cloudflare Web Analytics", "</script>\n")
PRELOAD = cut(fr, "  <!-- Les cubes animés sont ajoutés par script.js", 'cube-orange.webp" type="image/webp">\n')

ld = {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    "name": "Don't Tap Red",
    "url": "https://www.landers2k.com/dont-tap-red/en/",
    "image": "https://www.landers2k.com/assets/img/dtr-icon.jpg",
    "description": "Free reflex game: tap the right cubes, never touch the red one. Five modes (Arcade, Rain, Challenge, Chrono, Event), community bosses, missions, titles and leaderboards.",
    "operatingSystem": "iOS, Android",
    "applicationCategory": "GameApplication",
    "inLanguage": ["en", "fr"],
    "datePublished": "2026-10-21",
    "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
    "author": {"@type": "Person", "name": "Landers2K", "url": "https://www.landers2k.com/"},
    "publisher": {"@type": "Organization", "name": "LNDRS Studio"},
    "installUrl": ["https://apps.apple.com/us/app/dont-tap-red/id6820198356", "https://play.google.com/store/apps/details?id=com.landers2k.donttapred"],
}

head = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Don’t Tap Red — the mobile game by Landers2K</title>
  <meta name="description" content="Don’t Tap Red, the free reflex game by Landers2K for iPhone and Android: tap the right cubes, never touch the red one. Game modes, cubes, gift codes and FAQ.">
  <meta name="theme-color" content="#050812">
  <!-- Version anglaise de /dont-tap-red/, construite par tools/build_dtr_en.py -->
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <!-- Bandeau « Ouvrir dans l’App Store » de Safari sur iPhone -->
  <meta name="apple-itunes-app" content="app-id=6820198356">
  <meta name="apple-mobile-web-app-title" content="Landers2K">
  <link rel="canonical" href="https://www.landers2k.com/dont-tap-red/en/">
  <link rel="alternate" hreflang="fr" href="https://www.landers2k.com/dont-tap-red/">
  <link rel="alternate" hreflang="en" href="https://www.landers2k.com/dont-tap-red/en/">
  <link rel="alternate" hreflang="x-default" href="https://www.landers2k.com/dont-tap-red/">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Landers2K">
  <meta property="og:locale" content="en_US">
  <meta property="og:url" content="https://www.landers2k.com/dont-tap-red/en/">
  <meta property="og:title" content="Don’t Tap Red — out now on iPhone and Android">
  <meta property="og:description" content="The free reflex game by Landers2K for iPhone and Android. One single rule: never touch the red one.">
  <meta property="og:image" content="https://www.landers2k.com/assets/img/partage-dtr-en.jpg?v=2">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@Lndrs2K">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..800&display=swap">
  <link rel="stylesheet" href="/styles.css">
{PRELOAD}  <script type="application/ld+json">
{json.dumps(ld, ensure_ascii=False, indent=2)}
  </script>
  <script>document.documentElement.classList.add('js');</script>
</head>
<body class="subpage page-dtr">
  <a class="skip-link" href="#main">Skip to content</a>

{icons}
{nav}{main}

{footer}{ANALYTICS}</body>
</html>
"""
out = ROOT / "dont-tap-red" / "en" / "index.html"
out.parent.mkdir(exist_ok=True)
out.write_text(head, "utf-8")

# Contrôle : mots français restés dans le texte visible
visible = re.sub(r"<!--.*?-->", " ", head, flags=re.S)
visible = re.sub(r"<script.*?</script>", " ", visible, flags=re.S)
visible = re.sub(r"<[^>]+>", " ", visible)
leftover = sorted(set(re.findall(r"\b(?:le|la|les|des|du|une|pour|avec|dans|sur|ton|tes|est|et|à|où|jeu|gratuit|chaque)\b", visible, flags=re.I)))
print("ok", out, "| mots français restants :", leftover or "aucun")
