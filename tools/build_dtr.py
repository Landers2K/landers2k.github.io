"""Construit la page du jeu (dont-tap-red/index.html) à partir des sections Don't Tap Red de l'accueil,
plus le guide des cubes, les codes cadeaux et la FAQ.

Usage : python tools/build_dtr.py, puis python tools/sync_pages.py et python tools/build_dtr_en.py
À relancer après chaque modification des sections du jeu sur l'accueil (index.html).
"""
import pathlib, re, json
ROOT = pathlib.Path(__file__).resolve().parent.parent
index = (ROOT / "index.html").read_text("utf-8")
setup = (ROOT / "setup.html").read_text("utf-8")


def cut(text, start, end):
    a = text.index(start)
    b = text.index(end, a) + len(end)
    return text[a:b]


def absolute(block):
    return re.sub(r'(href|src)="(?!https?:|mailto:|tel:|data:|#|/)(?:\./)?', r'\1="/', block)


# Sections reprises de l'accueil
game = cut(index, "    <!-- ===================== Don't Tap Red : présentation ===================== -->", "    </section>\n")
modes = cut(index, "    <!-- ===================== Les modes de jeu ===================== -->", "    </section>\n")
progress = cut(index, "    <!-- ===================== Progression ===================== -->", "    </section>\n")
stats = cut(index, "    <!-- Chiffres du jeu (fiche App Store) -->", "    </section>\n")
download = cut(index, "    <!-- Téléchargement -->", "    </section>\n")

# En-tête de page : le titre devient le h1, la section passe sous la barre de navigation
game = game.replace('<section class="game" id="jeu"', '<section class="game game-page" id="jeu"')
game = game.replace('<h2 class="game-title" id="game-title" data-split>Don’t Tap Red.</h2>',
                    '<h1 class="game-title" id="game-title" data-split>Don’t Tap Red.</h1>')
game = game.replace('<div class="wrap-wide goal">', '<div class="wrap-wide goal" id="essayer">')
# Le lien « Tout savoir sur le jeu » de l'accueil devient un lien vers la version anglaise
game = re.sub(r'<p class="game-more reveal">.*?</p>',
              '<p class="game-more reveal"><a class="link-arrow" href="/dont-tap-red/en/" hreflang="en" lang="en">English version</a></p>', game)
assert "<h1" in game

cubes = """    <!-- ===================== Les cubes ===================== -->
    <section class="cubes-guide band" id="cubes" data-scene="links" aria-labelledby="cubes-title">
      <div class="wrap-wide">
        <header class="section-head">
          <p class="kicker reveal">Les cubes</p>
          <h2 class="section-title" id="cubes-title" data-split>Six cubes.<br><span class="muted">Un seul à fuir.</span></h2>
        </header>
        <div class="cube-grid" data-stagger>
          <article class="cube-card" style="--brand:#2997ff">
            <img src="assets/img/cube-blue.webp" alt="" width="72" height="72" loading="lazy">
            <p class="cube-pts">+1</p>
            <h3>Bleu</h3>
            <p>Ton cube de base. Plus ton combo grimpe, plus il rapporte&nbsp;: jusqu’à +5 par cube.</p>
          </article>
          <article class="cube-card" style="--brand:#30d158">
            <img src="assets/img/cube-green.webp" alt="" width="72" height="72" loading="lazy">
            <p class="cube-pts">+5</p>
            <h3>Vert</h3>
            <p>Un petit bonus à attraper dès qu’il passe sous ton doigt.</p>
          </article>
          <article class="cube-card" style="--brand:#bf5af2">
            <img src="assets/img/cube-purple.webp" alt="" width="72" height="72" loading="lazy">
            <p class="cube-pts">+21 à +40</p>
            <h3>Violet</h3>
            <p>Le gros bonus&nbsp;: un nombre de points tiré au hasard à chaque fois.</p>
          </article>
          <article class="cube-card" style="--brand:#ffd60a">
            <img src="assets/img/cube-gold.webp" alt="" width="72" height="72" loading="lazy">
            <p class="cube-pts">Jusqu’à +100</p>
            <h3>Étoile dorée</h3>
            <p>Le jackpot. Elle est rare, alors ne la laisse pas filer.</p>
          </article>
          <article class="cube-card" style="--brand:#ff9f0a">
            <img src="assets/img/cube-orange.webp" alt="" width="72" height="72" loading="lazy">
            <p class="cube-pts">−21 à −40</p>
            <h3>Orange</h3>
            <p>Le piège qui fait mal&nbsp;: il retire des points à ton score.</p>
          </article>
          <article class="cube-card" style="--brand:#ff375f">
            <img src="assets/img/cube-red.webp" alt="" width="72" height="72" loading="lazy">
            <p class="cube-pts">Interdit</p>
            <h3>Rouge</h3>
            <p>Selon le mode, il te coûte du temps, une vie… ou la partie entière.</p>
          </article>
        </div>
        <p class="kpi-note reveal">Points du mode Arcade. En Challenge, ils grimpent de monde en monde.</p>
      </div>
    </section>

"""

codes = """    <!-- ===================== Codes cadeaux ===================== -->
    <section class="gift-codes" id="codes" data-scene="support" aria-labelledby="codes-title">
      <div class="wrap-wide">
        <header class="section-head">
          <p class="kicker reveal">Codes cadeaux</p>
          <h2 class="section-title" id="codes-title" data-split>Des cadeaux<br><span class="muted">à récupérer.</span></h2>
        </header>
        <div class="format-grid is-3" data-stagger>
          <article class="format-card" style="--brand:#5865f2">
            <span class="code-step">1</span>
            <h3>Trouve un code</h3>
            <p>Rejoins le <a href="https://discord.gg/uGGmDmts8Y" target="_blank" rel="noopener">Discord</a> et suis-moi sur TikTok et Twitch pour ne rater aucun code.</p>
          </article>
          <article class="format-card" style="--brand:#bf5af2">
            <span class="code-step">2</span>
            <h3>Ouvre les paramètres</h3>
            <p>Dans le jeu, va dans <strong>PARAMÈTRES</strong>, puis touche <strong>CODE CADEAU</strong>.</p>
          </article>
          <article class="format-card" style="--brand:#ffd60a">
            <span class="code-step">3</span>
            <h3>Profite</h3>
            <p>Entre le code&nbsp;: tes coins, gems ou XP arrivent directement sur ton compte.</p>
          </article>
        </div>
        <div class="gift-hunt reveal">
          <img src="assets/img/cube-gold.webp" alt="" width="84" height="84" loading="lazy">
          <p><b>Un code est caché sur ce site.</b> Tape les cubes qui flottent sur les pages, en évitant les rouges&nbsp;: à 1&nbsp;000&nbsp;points, un code cadeau se débloque.</p>
        </div>
      </div>
    </section>

"""

faq_items = [
    ("Le jeu est-il gratuit&nbsp;?", "Oui. Don’t Tap Red est gratuit sur iPhone et Android. Il contient des publicités, que tu peux supprimer pour toujours avec un achat unique, et des achats facultatifs comme des packs et des skins."),
    ("Quand sort le jeu&nbsp;?", "Il est sorti le 20 octobre 2026 sur iPhone et le 22 octobre 2026 sur Android&nbsp;: il est disponible gratuitement sur l’App Store et sur Google Play."),
    ("Sur quels appareils et dans quelles langues&nbsp;?", "Sur iPhone et sur les téléphones Android. Le jeu est disponible en français et en anglais."),
    ("Comment utiliser un code cadeau&nbsp;?", "Dans le jeu, va dans PARAMÈTRES, puis touche CODE CADEAU et entre ton code. La récompense arrive tout de suite sur ton compte."),
    ("Comment fonctionnent les classements&nbsp;?", "En Arcade, Rain et Chrono, ton meilleur score compte dans le classement mondial, celui de la semaine et celui du mois. Le top&nbsp;10 de chaque mode reçoit des récompenses chaque semaine, directement dans ta boîte aux lettres."),
    ("J’ai trouvé un bug ou j’ai une idée&nbsp;: je fais comment&nbsp;?", 'Écris à <a href="mailto:donttapred.contact@gmail.com">donttapred.contact@gmail.com</a> ou viens en parler sur le <a href="https://discord.gg/uGGmDmts8Y" target="_blank" rel="noopener">Discord</a>.'),
    ("Et mes données personnelles&nbsp;?", 'Tout est expliqué dans la <a href="https://sites.google.com/view/donttapred-confidentialite" target="_blank" rel="noopener">politique de confidentialité du jeu</a>.'),
]
faq = """    <!-- ===================== Questions fréquentes ===================== -->
    <section class="faq band" id="faq" data-scene="about" aria-labelledby="faq-title">
      <div class="wrap">
        <header class="section-head center">
          <p class="kicker reveal">Questions fréquentes</p>
          <h2 class="section-title" id="faq-title" data-split>Tout ce que tu veux savoir.</h2>
        </header>
        <div class="faq-list" data-stagger>
""" + "".join(f"""          <details class="faq-item">
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
""" for q, a in faq_items) + """        </div>
      </div>
    </section>

"""

main = '  <main id="main">\n' + game + "\n" + cubes + modes + "\n" + progress + "\n" + stats + "\n" + codes + faq + download + "  </main>"
main = absolute(main)

# Données structurées pour Google (fiche d'application)
ld = {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    "name": "Don't Tap Red",
    "url": "https://www.landers2k.com/dont-tap-red/",
    "image": "https://www.landers2k.com/assets/img/dtr-icon.jpg",
    "description": "Jeu de réflexes gratuit : tape les bons cubes, ne touche jamais le rouge. Quatre modes (Arcade, Rain, Challenge, Chrono), missions, titres, événements et classements.",
    "operatingSystem": "iOS, Android",
    "applicationCategory": "GameApplication",
    "inLanguage": ["fr", "en"],
    "datePublished": "2026-10-20",
    "offers": {"@type": "Offer", "price": "0", "priceCurrency": "EUR"},
    "author": {"@type": "Person", "name": "Landers2K", "url": "https://www.landers2k.com/"},
    "installUrl": ["https://apps.apple.com/fr/app/dont-tap-red/id6820198356", "https://play.google.com/store/apps/details?id=com.landers2k.donttapred"],
}

title = "Don’t Tap Red — le jeu mobile de Landers2K"
desc = "Don’t Tap Red, le jeu de réflexes gratuit de Landers2K sur iPhone et Android : tape les bons cubes, ne touche jamais le rouge. Modes, cubes, codes cadeaux et FAQ."
head = f"""<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <meta name="theme-color" content="#050812">
  <!-- Page dans un dossier (/dont-tap-red/) : tous les chemins partent de la racine du site -->
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <!-- Bandeau « Ouvrir dans l’App Store » de Safari sur iPhone -->
  <meta name="apple-itunes-app" content="app-id=6820198356">
  <meta name="apple-mobile-web-app-title" content="Landers2K">
  <link rel="canonical" href="https://www.landers2k.com/dont-tap-red/">
  <link rel="alternate" hreflang="fr" href="https://www.landers2k.com/dont-tap-red/">
  <link rel="alternate" hreflang="en" href="https://www.landers2k.com/dont-tap-red/en/">
  <link rel="alternate" hreflang="x-default" href="https://www.landers2k.com/dont-tap-red/">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Landers2K">
  <meta property="og:locale" content="fr_FR">
  <meta property="og:url" content="https://www.landers2k.com/dont-tap-red/">
  <meta property="og:title" content="Don’t Tap Red — disponible sur iPhone et Android">
  <meta property="og:description" content="Le jeu de réflexes gratuit de Landers2K sur iPhone et Android. Une seule règle : ne touche jamais le rouge.">
  <meta property="og:image" content="https://www.landers2k.com/assets/img/partage-dtr.jpg?v=2">
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
  <script type="application/ld+json">
{json.dumps(ld, ensure_ascii=False, indent=2)}
  </script>
  <script>document.documentElement.classList.add('js');</script>
"""

head_end = setup.index("</head>")
main_a = setup.index('  <main id="main">')
main_b = setup.index("  </main>") + len("  </main>")
page = head + setup[head_end:main_a] + main + setup[main_b:]
page = page.replace('<body class="subpage">', '<body class="subpage page-dtr">')
page = page.replace('  <script src="script.js" defer></script>', '  <script src="/script.js" defer></script>')
out = ROOT / "dont-tap-red" / "index.html"
out.parent.mkdir(exist_ok=True)
out.write_text(page, "utf-8")
print("ok", len(page))
