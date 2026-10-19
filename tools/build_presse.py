"""Construit le kit presse (dont-tap-red/presse/) : page, textes et archive .zip.

Les visuels sont dans dont-tap-red/presse/media (copiés depuis le projet du jeu).
Usage : python tools/build_presse.py, puis python tools/sync_pages.py
Attention : l'archive .zip est recréée à chaque fois (12 Mo) ; ne la publier que si les visuels ont changé.
"""
import pathlib, zipfile, html

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIR = ROOT / "dont-tap-red" / "presse"
MEDIA = DIR / "media"
setup = (ROOT / "setup.html").read_text("utf-8")

# ---------------------------------------------------------------- Textes
FACTS = [
    ("Jeu", "Don’t Tap Red"),
    ("Développeur", "Landers2K, développeur indépendant (France)"),
    ("Sortie", "23 octobre 2026 à 9 h (heure de Paris)"),
    ("Plateformes", "iPhone (App Store) et Android (Google Play)"),
    ("Prix", "Gratuit, achats intégrés facultatifs"),
    ("Langues", "Français et anglais"),
    ("Genre", "Arcade, réflexes, jeu occasionnel"),
    ("Moteur", "Godot"),
]
FACTS_EN = [
    ("Game", "Don't Tap Red"),
    ("Developer", "Landers2K, independent developer (France)"),
    ("Release date", "October 23, 2026, 9 a.m. Paris time"),
    ("Platforms", "iPhone (App Store) and Android (Google Play)"),
    ("Price", "Free to play, optional in-app purchases"),
    ("Languages", "French and English"),
    ("Genre", "Arcade, reflex, casual"),
    ("Engine", "Godot"),
]
SHORT_FR = "Don’t Tap Red est un jeu de réflexes gratuit sur iPhone et Android : tape les cubes bleus, enchaîne les combos… et ne touche jamais le rouge."
LONG_FR = [
    "Tape le bleu, évite le rouge… facile ? Pas si vite ! Don’t Tap Red est un jeu de réflexes nerveux où chaque seconde compte. Les cubes bougent, accélèrent, se multiplient : garde ton sang-froid, enchaîne les bons cubes et surtout… ne touche jamais le rouge !",
    "Quatre modes de jeu (Arcade, Rain, Chrono et Challenge), un boss géant que tous les joueurs attaquent ensemble, 50 niveaux puis des Prestiges, des classements mondiaux et entre amis, plus de 100 skins et des saisons qui transforment le jeu. Gratuit, avec achats intégrés facultatifs, en français et en anglais.",
]
SHORT_EN = "Don't Tap Red is a free reflex game for iPhone and Android: tap the blue cubes, build your combo… and never touch the red one."
LONG_EN = [
    "Tap the blue, avoid the red… easy? Not so fast! Don't Tap Red is a fast-paced reflex game where every second counts. Cubes move, speed up and multiply: keep your cool, chain the right cubes and above all… never touch the red one!",
    "Four game modes (Arcade, Rain, Chrono and Challenge), a giant boss that all players attack together, 50 levels followed by Prestige ranks, world and friends leaderboards, 100+ skins and seasons that transform the game. Free to play with optional in-app purchases, available in English and French.",
]
FEATURES = [
    ("4 modes de jeu", "Arcade, Rain, Chrono et Challenge&nbsp;: 20&nbsp;mondes, 3&nbsp;étoiles dans chacun et un Défi du jour."),
    ("Le Cube Noir", "Un boss géant que tous les joueurs attaquent ensemble&nbsp;: ses points de vie baissent en direct."),
    ("Niveaux et Prestiges", "50&nbsp;niveaux, puis des Prestiges avec emblèmes et skins exclusifs."),
    ("Classements", "Mondial, de la semaine et du mois, avec des récompenses, et entre amis grâce au code ami."),
    ("Plus de 100 skins", "Néon, glace, lave, galaxie, diamant… dont des skins animés."),
    ("Missions et titres", "Missions du jour et de la semaine, plus de 50&nbsp;titres et un cadeau chaque jour."),
    ("Des saisons", "Halloween, Noël, Saint-Valentin, Pâques&nbsp;: skins et missions en édition limitée."),
    ("Parties rapides", "Quelques minutes suffisent&nbsp;: parfait pour une pause."),
]
NEWS = "Au lancement, le jeu est en <b>saison Halloween</b> jusqu’au 1<sup>er</sup>&nbsp;novembre&nbsp;: accueil hanté, bonbons à attraper et 6&nbsp;skins exclusifs. Le <b>2&nbsp;novembre</b>, tous les joueurs s’unissent contre le premier boss, <b>Le Cube Noir</b>."
CONTACT = "donttapred.contact@gmail.com"

MEDIA_LIST = [
    # (fichier, titre, détail)
    ("icone-dont-tap-red.png", "Icône", "1024 × 1024 · PNG"),
    ("icone-dont-tap-red-halloween.png", "Icône Halloween", "1024 × 1024 · PNG"),
    ("visuel-dont-tap-red-1024x500.png", "Visuel principal", "1024 × 500 · PNG"),
    ("banniere-dont-tap-red-1024x512.png", "Bannière", "1024 × 512 · PNG"),
]
SHOTS = [
    ("capture-1-accueil.png", "Accueil (saison Halloween)"),
    ("capture-2-arcade.png", "Mode Arcade"),
    ("capture-3-rain.png", "Mode Rain"),
    ("capture-4-chrono.png", "Mode Chrono"),
    ("capture-5-cube-noir.png", "Événement Le Cube Noir"),
    ("capture-6-classement.png", "Classement mondial"),
    ("capture-7-skins.png", "Skins Halloween"),
    ("capture-8-amis.png", "Jouer avec ses amis"),
]

# ---------------------------------------------------------------- Archive .zip
fiche = ["DON'T TAP RED — KIT PRESSE / PRESS KIT", "=" * 40, "", "FRANÇAIS", "-" * 8]
fiche += [f"{k} : {v.replace('’', chr(39))}" for k, v in FACTS]
fiche += ["Site : https://www.landers2k.com/dont-tap-red/", f"Contact presse : {CONTACT}", "",
          "Description courte :", SHORT_FR, "", "Description longue :", *LONG_FR, "",
          "Points clés :"]
fiche += [f"- {html.unescape(t)} : {html.unescape(d).replace(chr(160), ' ')}" for t, d in FEATURES]
fiche += ["", "", "ENGLISH", "-" * 7]
fiche += [f"{k}: {v}" for k, v in FACTS_EN]
fiche += ["Website: https://www.landers2k.com/dont-tap-red/", f"Press contact: {CONTACT}", "",
          "Short description:", SHORT_EN, "", "Long description:", *LONG_EN, "",
          "Liens / Links :",
          "App Store : https://apps.apple.com/app/id6820198356",
          "Google Play : https://play.google.com/store/apps/details?id=com.landers2k.donttapred",
          "", "Les visuels peuvent être utilisés librement pour parler du jeu. / Feel free to use these visuals to cover the game.",
          "© 2026 Landers2K"]
zip_path = DIR / "kit-presse-dont-tap-red.zip"
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("kit-presse-dont-tap-red/fiche-dont-tap-red.txt", "\r\n".join(fiche).encode("utf-8-sig"))
    for name, *_ in MEDIA_LIST + SHOTS:
        z.write(MEDIA / name, f"kit-presse-dont-tap-red/{name}")
zip_mo = zip_path.stat().st_size / 1024 / 1024
zip_label = f"{zip_mo:.0f} Mo".replace(".", ",")


def size(name):
    return f"{(MEDIA / name).stat().st_size / 1024 / 1024:.1f} Mo".replace(".", ",")


# ---------------------------------------------------------------- Page
facts_html = "".join(f"""            <div class="press-fact"><dt>{k}</dt><dd>{v}</dd></div>
""" for k, v in FACTS)
features_html = "".join(f"""          <li><b>{t}</b><span>{d}</span></li>
""" for t, d in FEATURES)


def text_card(lang, title, short, long, key):
    paras = "".join(f"<p>{html.escape(p)}</p>" for p in long)
    return f"""          <article class="press-text" lang="{lang}">
            <p class="press-lang">{title}</p>
            <div class="press-block">
              <div class="press-block-head"><h3>Description courte</h3><button class="press-copy" type="button" data-copy="#{key}-court">Copier</button></div>
              <div id="{key}-court"><p>{html.escape(short)}</p></div>
            </div>
            <div class="press-block">
              <div class="press-block-head"><h3>Description longue</h3><button class="press-copy" type="button" data-copy="#{key}-long">Copier</button></div>
              <div id="{key}-long">{paras}</div>
            </div>
          </article>
"""


def media_card(name, title, detail, cls=""):
    thumb = "media/apercus/" + name.replace(".png", ".jpg")
    return f"""          <figure class="press-media{cls}">
            <a class="press-thumb" href="media/{name}" target="_blank" rel="noopener"><img src="{thumb}" alt="{title}, Don’t Tap Red" loading="lazy" decoding="async"></a>
            <figcaption><b>{title}</b><span>{detail} · {size(name)}</span><a href="media/{name}" download>Télécharger</a></figcaption>
          </figure>
"""


main = f"""  <main id="main">
    <!-- ===================== En-tête ===================== -->
    <section class="page-hero" id="presse" data-scene="partner" aria-labelledby="page-title">
      <div class="wrap page-hero-inner">
        <p class="hero-chip intro" style="--d:.05s"><i aria-hidden="true"></i>Don’t Tap Red · Presse et créateurs</p>
        <h1 class="page-title" id="page-title" data-split>Kit <span class="grad">presse.</span></h1>
        <p class="page-sub intro" style="--d:.55s">Tout ce qu’il faut pour parler de Don’t Tap Red&nbsp;: la fiche du jeu, des textes prêts à copier, les visuels en haute définition et le contact.</p>
        <div class="hero-ctas intro" style="--d:.7s">
          <a class="btn btn-light btn-lg" href="kit-presse-dont-tap-red.zip" download data-magnetic>Tout télécharger (.zip · {zip_label})</a>
          <a class="link-arrow" href="mailto:{CONTACT}?subject=Presse%20%E2%80%94%20Don%E2%80%99t%20Tap%20Red">Contact presse</a>
        </div>
      </div>
    </section>

    <!-- ===================== Fiche du jeu ===================== -->
    <section class="press-section" id="fiche" data-scene="proof" aria-labelledby="fiche-title">
      <div class="wrap-wide press-intro">
        <div class="press-id reveal">
          <img src="media/apercus/icone-dont-tap-red.jpg" alt="" width="128" height="128">
          <div>
            <p class="kicker">La fiche du jeu</p>
            <h2 class="section-title" id="fiche-title">Don’t Tap Red</h2>
            <p class="press-tagline">Tape le bleu, évite le rouge&nbsp;!</p>
          </div>
        </div>
        <dl class="press-facts reveal">
{facts_html}            <div class="press-fact"><dt>Liens</dt><dd><a href="https://apps.apple.com/app/id6820198356" target="_blank" rel="noopener">App Store</a> · <a href="https://play.google.com/store/apps/details?id=com.landers2k.donttapred" target="_blank" rel="noopener">Google Play</a> · <a href="../">Site du jeu</a></dd></div>
            <div class="press-fact"><dt>Contact presse</dt><dd><a href="mailto:{CONTACT}">{CONTACT}</a></dd></div>
        </dl>
      </div>
      <div class="wrap-wide">
        <div class="press-news reveal">
          <p class="kicker">Actualité</p>
          <p>{NEWS}</p>
        </div>
      </div>
    </section>

    <!-- ===================== Textes ===================== -->
    <section class="press-section band" id="textes" data-scene="formats" aria-labelledby="textes-title">
      <div class="wrap-wide">
        <header class="section-head">
          <p class="kicker reveal">Textes</p>
          <h2 class="section-title" id="textes-title" data-split>Prêts à copier.<br><span class="muted">En français et en anglais.</span></h2>
        </header>
        <div class="press-texts" data-stagger>
{text_card("fr", "Français", SHORT_FR, LONG_FR, "fr")}{text_card("en", "English", SHORT_EN, LONG_EN, "en")}        </div>
        <h3 class="press-sub reveal">Points clés</h3>
        <ul class="press-features" data-stagger>
{features_html}        </ul>
      </div>
    </section>

    <!-- ===================== Visuels ===================== -->
    <section class="press-section" id="visuels" data-scene="game" aria-labelledby="visuels-title">
      <div class="wrap-wide">
        <header class="section-head">
          <p class="kicker reveal">Visuels</p>
          <h2 class="section-title" id="visuels-title" data-split>En haute définition.<br><span class="muted">Clique pour télécharger.</span></h2>
        </header>
        <div class="press-grid press-grid-art" data-stagger>
{"".join(media_card(n, t, d, " is-icon" if n.startswith("icone") else " is-wide") for n, t, d in MEDIA_LIST)}        </div>
        <h3 class="press-sub reveal">Captures d’écran <span>1206 × 2622 · PNG</span></h3>
        <div class="press-grid press-grid-shots" data-stagger>
{"".join(media_card(n, t, "PNG", " is-shot") for n, t in SHOTS)}        </div>
        <p class="kpi-note reveal">Ces visuels et ces textes peuvent être utilisés librement dans des articles, vidéos et streams consacrés à Don’t Tap Red. Merci de ne pas les modifier.</p>
      </div>
    </section>

    <!-- ===================== Le développeur ===================== -->
    <section class="cta" id="contact" data-scene="contact" aria-labelledby="cta-title">
      <div class="wrap cta-inner">
        <p class="kicker reveal">Le développeur</p>
        <h2 class="cta-title" id="cta-title" data-split>Landers2K.</h2>
        <p class="cta-sub reveal">Créateur de contenu gaming sur TikTok et YouTube, streamer sur Twitch et développeur indépendant, Landers2K a créé Don’t Tap Red et le fait évoluer au fil des saisons. Interview, visuels supplémentaires, question sur le jeu&nbsp;: écris-moi.</p>
        <div class="cta-actions reveal">
          <a class="btn btn-light btn-lg" href="mailto:{CONTACT}?subject=Presse%20%E2%80%94%20Don%E2%80%99t%20Tap%20Red" data-magnetic>
            <svg aria-hidden="true"><use href="#i-mail"/></svg>Écrire au contact presse
          </a>
          <a class="link-arrow" href="/partenariats.html">Voir mon audience</a>
        </div>
      </div>
    </section>
  </main>"""

title = "Kit presse — Don’t Tap Red"
desc = "Kit presse de Don’t Tap Red, le jeu mobile de Landers2K : fiche du jeu, textes en français et en anglais, icônes, captures d’écran et contact presse."
head = f"""<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <meta name="theme-color" content="#050812">
  <!-- Page dans un dossier (/dont-tap-red/presse/) : les chemins du site partent de la racine -->
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="apple-mobile-web-app-title" content="Landers2K">
  <link rel="canonical" href="https://www.landers2k.com/dont-tap-red/presse/">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Landers2K">
  <meta property="og:locale" content="fr_FR">
  <meta property="og:url" content="https://www.landers2k.com/dont-tap-red/presse/">
  <meta property="og:title" content="Kit presse — Don’t Tap Red">
  <meta property="og:description" content="Fiche du jeu, textes en français et en anglais, visuels en haute définition et contact presse.">
  <meta property="og:image" content="https://www.landers2k.com/assets/img/partage-dtr.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@Lndrs2K">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..800&display=swap">
  <link rel="stylesheet" href="/styles.css">
  <!-- Les cubes animés sont ajoutés par script.js : on les télécharge dès le début -->
  <link rel="preload" as="image" href="/assets/img/cube-blue.webp" type="image/webp">
  <link rel="preload" as="image" href="/assets/img/cube-red.webp" type="image/webp">
  <link rel="preload" as="image" href="/assets/img/cube-gold.webp" type="image/webp">
  <link rel="preload" as="image" href="/assets/img/cube-green.webp" type="image/webp">
  <link rel="preload" as="image" href="/assets/img/cube-purple.webp" type="image/webp">
  <link rel="preload" as="image" href="/assets/img/cube-orange.webp" type="image/webp">
  <script>document.documentElement.classList.add('js');</script>
"""

head_end = setup.index("</head>")
main_a = setup.index('  <main id="main">')
main_b = setup.index("  </main>") + len("  </main>")
page = head + setup[head_end:main_a] + main + setup[main_b:]
page = page.replace('  <script src="script.js" defer></script>', '  <script src="/script.js" defer></script>')
(DIR / "index.html").write_text(page, "utf-8")
print("ok", zip_label)
