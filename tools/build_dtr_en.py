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

T = [
    # ---- En-tête du jeu
    ("<b>Mon jeu mobile</b><small>Gratuit · iOS et Android</small>", "<b>My mobile game</b><small>Free · iOS and Android</small>"),
    ('<i aria-hidden="true"></i>Disponible sur iPhone</span>', '<i aria-hidden="true"></i>Out now on iPhone</span>'),
    ("Un jeu de réflexes nerveux où chaque seconde compte. Les cubes bougent, accélèrent, se multiplient&nbsp;: garde ton sang-froid, enchaîne les bons cubes et surtout… ne touche jamais le rouge&nbsp;!",
     "A fast-paced reflex game where every second counts. Cubes move, speed up and multiply: keep your cool, chain the right cubes and above all… never touch the red one!"),
    ('<p class="cd-label">Sortie sur Android dans</p>', '<p class="cd-label">Out on Android in</p>'),
    ('aria-label="Temps restant avant la sortie du jeu"', 'aria-label="Time left before the game comes out"'),
    ("<small>jours</small>", "<small>days</small>"),
    ("<small>heures</small>", "<small>hours</small>"),
    ("<small>secondes</small>", "<small>seconds</small>"),
    ("<span><small>Télécharger dans</small><b>l’App Store</b></span>", "<span><small>Download on the</small><b>App Store</b></span>"),
    ("<span><small>Disponible sur</small><b>Google Play</b></span>", "<span><small>Get it on</small><b>Google Play</b></span>"),
    ("Gratuit · Achats intégrés facultatifs · Français et anglais", "Free · Optional in-app purchases · English and French"),
    ('<a class="link-arrow" href="/dont-tap-red/en/" hreflang="en" lang="en">English version</a>',
     '<a class="link-arrow" href="/dont-tap-red/" hreflang="fr" lang="fr">Version française</a>'),
    ('alt="L’écran d’accueil de Don’t Tap Red"', 'alt="The Don’t Tap Red home screen"'),
    ("<figcaption>L’accueil du jeu</figcaption>", "<figcaption>The game’s home screen</figcaption>"),
    # ---- Objectif et mini-jeu
    ('<p class="kicker reveal">L’objectif</p>', '<p class="kicker reveal">The goal</p>'),
    ("data-split>Une seule règle.</h3>", "data-split>One single rule.</h3>"),
    ('<b class="is-blue">Tape le bleu</b> pour marquer des points et faire grimper ton combo.', '<b class="is-blue">Tap the blue</b> to score points and grow your combo.'),
    ('<b class="is-red">Ne touche jamais le rouge</b>&nbsp;: un seul faux pas et c’est perdu.', '<b class="is-red">Never touch the red</b>: one wrong move and it’s over.'),
    ("Essaie ici, tout de suite&nbsp;: 20&nbsp;secondes pour faire ton meilleur score.", "Try it right here: 20&nbsp;seconds to set your best score."),
    ('aria-label="Mini-jeu Don’t Tap Red"', 'aria-label="Don’t Tap Red mini-game"'),
    ('<span>Temps <b class="mg-time">', '<span>Time <b class="mg-time">'),
    ('<span>Record <b class="mg-best">', '<span>Best <b class="mg-best">'),
    ('<p class="mg-title">Prêt&nbsp;?</p>', '<p class="mg-title">Ready?</p>'),
    ('<p class="mg-text">Tape les cubes bleus, évite les rouges.</p>', '<p class="mg-text">Tap the blue cubes, avoid the red ones.</p>'),
    ('type="button">Jouer</button>', 'type="button">Play</button>'),
    ("hidden>Télécharger le vrai jeu</a>", "hidden>Get the real game</a>"),
    # ---- Les cubes
    ('<p class="kicker reveal">Les cubes</p>', '<p class="kicker reveal">The cubes</p>'),
    ('Six cubes.<br><span class="muted">Un seul à fuir.</span>', 'Six cubes.<br><span class="muted">Only one to avoid.</span>'),
    ("<h3>Bleu</h3>", "<h3>Blue</h3>"),
    ("Ton cube de base. Plus ton combo grimpe, plus il rapporte&nbsp;: jusqu’à +5 par cube.", "Your basic cube. The higher your combo, the more it’s worth: up to +5 per cube."),
    ("<h3>Vert</h3>", "<h3>Green</h3>"),
    ("Un petit bonus à attraper dès qu’il passe sous ton doigt.", "A small bonus to grab as soon as it shows up."),
    ('<p class="cube-pts">+21 à +40</p>', '<p class="cube-pts">+21 to +40</p>'),
    ("<h3>Violet</h3>", "<h3>Purple</h3>"),
    ("Le gros bonus&nbsp;: un nombre de points tiré au hasard à chaque fois.", "The big bonus: a random number of points every time."),
    ('<p class="cube-pts">Jusqu’à +100</p>', '<p class="cube-pts">Up to +100</p>'),
    ("<h3>Étoile dorée</h3>", "<h3>Golden star</h3>"),
    ("Le jackpot. Elle est rare, alors ne la laisse pas filer.", "The jackpot. It’s rare, so don’t let it slip away."),
    ('<p class="cube-pts">−21 à −40</p>', '<p class="cube-pts">−21 to −40</p>'),
    ("Le piège qui fait mal&nbsp;: il retire des points à ton score.", "The painful trap: it takes points off your score."),
    ('<p class="cube-pts">Interdit</p>', '<p class="cube-pts">Forbidden</p>'),
    ("<h3>Rouge</h3>", "<h3>Red</h3>"),
    ("Selon le mode, il te coûte du temps, une vie… ou la partie entière.", "Depending on the mode, it costs you time, a life… or the whole game."),
    ("Points du mode Arcade. En Challenge, ils grimpent de monde en monde.", "Arcade mode points. In Challenge, they grow from world to world."),
    # ---- Modes
    ('<p class="kicker reveal">Les modes de jeu</p>', '<p class="kicker reveal">Game modes</p>'),
    ('Quatre façons de jouer.<br><span class="muted">Une seule règle.</span>', 'Four ways to play.<br><span class="muted">One single rule.</span>'),
    ("<h3>Enchaîne les combos. Bats ton record.</h3>", "<h3>Chain combos. Beat your best.</h3>"),
    ("Tape les cubes bleus, fais exploser ton combo et débloque des bonus toujours plus fous&nbsp;: <strong>cubes GEL, BOMBE, x2, vie bonus, étoiles dorées</strong>… Des surprises changent les règles en pleine partie. Atteindras-tu le rang <strong>LEGEND</strong>&nbsp;?",
     "Tap the blue cubes, make your combo explode and unlock crazier and crazier bonuses: <strong>FREEZE, BOMB, x2, extra life and golden star cubes</strong>… Surprises change the rules mid-game. Can you reach <strong>LEGEND</strong> rank?"),
    ("<h3>Les cubes tombent du ciel.</h3>", "<h3>Cubes fall from the sky.</h3>"),
    ("Attrape les bons cubes <strong>avant qu’ils touchent le sol</strong>, évite les rouges et survis aux événements&nbsp;: éclairs, nuit, tempête… Des défis surprises pendant la partie rapportent encore plus de points.",
     "Catch the right cubes <strong>before they hit the ground</strong>, dodge the red ones and survive the events: lightning, night, storm… Surprise challenges during the game earn you even more points."),
    ("<h3>20 mondes à conquérir.</h3>", "<h3>20 worlds to conquer.</h3>"),
    ("Chaque monde a ses règles et ses pièges. Décroche <strong>3 étoiles</strong> partout, débloque le <strong>mode Difficile</strong> et relève le <strong>Défi du jour</strong>, différent chaque jour.",
     "Every world has its own rules and traps. Earn <strong>3 stars</strong> everywhere, unlock <strong>Hard mode</strong> and take on the <strong>Daily Challenge</strong>, different every day."),
    ("<h3>60 secondes, pas une de plus.</h3>", "<h3>60 seconds, not one more.</h3>"),
    ("Pas de vies à gérer&nbsp;: juste un chrono et des cubes. <strong>Enchaîne le plus de bons cubes possible</strong> pour faire exploser ton score avant la fin du temps.",
     "No lives to manage: just a timer and cubes. <strong>Chain as many right cubes as you can</strong> to blow up your score before time runs out."),
    # ---- Progression
    ('<p class="kicker reveal">Et ce n’est que le début</p>', '<p class="kicker reveal">And that’s just the beginning</p>'),
    ('Missions, titres, événements<br><span class="muted">et récompenses chaque semaine.</span>', 'Missions, titles, events<br><span class="muted">and rewards every week.</span>'),
    ("<h3>Toujours un objectif à remplir.</h3>", "<h3>Always a goal to reach.</h3>"),
    ("Missions du jour, de la semaine et de chaque mode&nbsp;: de l’XP, des coins et des gems à gagner. Et un cadeau t’attend chaque jour.",
     "Daily, weekly and mode missions: XP, coins and gems to earn. And a gift waits for you every day."),
    ('alt="L’écran des missions de Don’t Tap Red"', 'alt="The Don’t Tap Red missions screen"'),
    ('<p class="tile-kicker">Titres</p>', '<p class="tile-kicker">Titles</p>'),
    ("<h3>Plus de 50 titres à débloquer.</h3>", "<h3>50+ titles to unlock.</h3>"),
    ("Affiche-les à côté de ton pseudo&nbsp;: rang LEGEND en Arcade, titres de Prestige quand tu dépasses le niveau&nbsp;50, titres du mois pour les meilleurs…",
     "Show them next to your name: LEGEND rank in Arcade, Prestige titles once you pass level&nbsp;50, monthly titles for the best…"),
    (">ROI DE NOVEMBRE</span>", ">KING OF NOVEMBER</span>"),
    ('<p class="tile-kicker">Événements</p>', '<p class="tile-kicker">Events</p>'),
    ("<h3>Tous unis contre le Cube Noir.</h3>", "<h3>Everyone against the Black Cube.</h3>"),
    ("Un boss géant que tous les joueurs attaquent ensemble&nbsp;: ses points de vie baissent en direct, et chacun est récompensé selon sa place au classement des dégâts. Sans oublier les saisons qui transforment le jeu.",
     "A giant boss that all players attack together: its HP drops live, and everyone is rewarded based on their place in the damage ranking. Not to mention the seasons that transform the game."),
    ('alt="Le boss Cube Noir dans Don’t Tap Red"', 'alt="The Black Cube boss in Don’t Tap Red"'),
    ('<p class="tile-kicker">Classement</p>', '<p class="tile-kicker">Leaderboards</p>'),
    ("<h3>Des récompenses chaque semaine et chaque mois.</h3>", "<h3>Rewards every week and every month.</h3>"),
    ("En Arcade, Rain et Chrono, ton meilleur score compte dans le classement mondial, celui de la semaine et celui du mois. Les récompenses arrivent dans ta boîte aux lettres.",
     "In Arcade, Rain and Chrono, your best score counts in the world, weekly and monthly leaderboards. Rewards land in your mailbox."),
    ("Chaque semaine · Top&nbsp;10 de chaque mode", "Every week · Top&nbsp;10 of each mode"),
    ('<span class="rank r1">1<sup>er</sup></span><span>75 gems · 10&nbsp;000 coins</span>', '<span class="rank r1">1<sup>st</sup></span><span>75 gems · 10,000 coins</span>'),
    ('<span class="rank r2">2<sup>e</sup></span><span>50 gems · 7&nbsp;000 coins</span>', '<span class="rank r2">2<sup>nd</sup></span><span>50 gems · 7,000 coins</span>'),
    ('<span class="rank r3">3<sup>e</sup></span><span>35 gems · 5&nbsp;000 coins</span>', '<span class="rank r3">3<sup>rd</sup></span><span>35 gems · 5,000 coins</span>'),
    ('<span class="rank">4–10<sup>e</sup></span><span>20 gems · 2&nbsp;500 coins</span>', '<span class="rank">4–10<sup>th</sup></span><span>20 gems · 2,500 coins</span>'),
    ("Chaque mois · dès novembre 2026", "Every month · from November 2026"),
    ("Le n°1 de chaque mode gagne le titre <b>« Roi du mois »</b>, à vie, et <b>300 gems</b>. N°1 dans les 3 modes&nbsp;: le titre <span class=\"grad-text\">arc-en-ciel</span> et <b>900 gems</b>.",
     "The #1 of each mode wins the <b>“King of the month”</b> title, forever, and <b>300 gems</b>. #1 in all 3 modes: the <span class=\"grad-text\">rainbow</span> title and <b>900 gems</b>."),
    ('alt="Le classement mondial de Don’t Tap Red"', 'alt="The Don’t Tap Red world leaderboard"'),
    # ---- Chiffres
    ("Un jeu qui ne s’arrête jamais.", "A game that never stops."),
    ("modes de jeu&nbsp;: Arcade, Rain, Challenge et Chrono", "game modes: Arcade, Rain, Challenge and Chrono"),
    ("skins à débloquer, dont des skins animés", "skins to unlock, including animated skins"),
    ("mondes à conquérir en mode Challenge", "worlds to conquer in Challenge mode"),
    ("niveaux à gravir, puis le Prestige", "levels to climb, then Prestige"),
    # ---- Codes cadeaux
    ('<p class="kicker reveal">Codes cadeaux</p>', '<p class="kicker reveal">Gift codes</p>'),
    ('Des cadeaux<br><span class="muted">à récupérer.</span>', 'Gifts<br><span class="muted">waiting for you.</span>'),
    ("<h3>Trouve un code</h3>", "<h3>Find a code</h3>"),
    ('Rejoins le <a href="https://discord.gg/uGGmDmts8Y" target="_blank" rel="noopener">Discord</a> et suis-moi sur TikTok et Twitch pour ne rater aucun code.',
     'Join the <a href="https://discord.gg/uGGmDmts8Y" target="_blank" rel="noopener">Discord</a> and follow me on TikTok and Twitch so you never miss a code.'),
    ("<h3>Ouvre les paramètres</h3>", "<h3>Open the settings</h3>"),
    ("Dans le jeu, va dans <strong>PARAMÈTRES</strong>, puis touche <strong>CODE CADEAU</strong>.", "In the game, go to <strong>SETTINGS</strong>, then tap <strong>GIFT CODE</strong>."),
    ("<h3>Profite</h3>", "<h3>Enjoy</h3>"),
    ("Entre le code&nbsp;: tes coins, gems ou XP arrivent directement sur ton compte.", "Enter the code: your coins, gems or XP land straight in your account."),
    ("<b>Un code est caché sur ce site.</b> Tape les cubes qui flottent sur les pages, en évitant les rouges&nbsp;: à 1&nbsp;000&nbsp;points, un code cadeau se débloque.",
     "<b>A code is hidden on this site.</b> Tap the cubes floating around the page, avoiding the red ones: at 1,000&nbsp;points, a gift code unlocks."),
    # ---- FAQ
    ('<p class="kicker reveal">Questions fréquentes</p>', '<p class="kicker reveal">FAQ</p>'),
    ("Tout ce que tu veux savoir.", "Everything you want to know."),
    ("<summary>Le jeu est-il gratuit&nbsp;?</summary>", "<summary>Is the game free?</summary>"),
    ("Oui. Don’t Tap Red est gratuit sur iPhone et Android. Il contient des publicités, que tu peux supprimer pour toujours avec un achat unique, et des achats facultatifs comme des packs et des skins.",
     "Yes. Don’t Tap Red is free on iPhone and Android. It contains ads, which you can remove forever with a one-time purchase, plus optional purchases such as packs and skins."),
    ("<summary>Quand sort le jeu&nbsp;?</summary>", "<summary>When does the game come out?</summary>"),
    ("Il est déjà disponible sur iPhone, sur l’App Store. Sur Android, il arrive le 23 octobre 2026 à 9&nbsp;h (heure de Paris), sur Google Play.", "It’s already out on iPhone, on the App Store. On Android, it arrives on October 23, 2026 at 9&nbsp;a.m. Paris time (7&nbsp;a.m. UTC), on Google Play."),
    ("<summary>Sur quels appareils et dans quelles langues&nbsp;?</summary>", "<summary>Which devices and languages?</summary>"),
    ("Sur iPhone et sur les téléphones Android. Le jeu est disponible en français et en anglais.", "iPhone and Android phones. The game is available in English and French."),
    ("<summary>Comment utiliser un code cadeau&nbsp;?</summary>", "<summary>How do I use a gift code?</summary>"),
    ("Dans le jeu, va dans PARAMÈTRES, puis touche CODE CADEAU et entre ton code. La récompense arrive tout de suite sur ton compte.",
     "In the game, go to SETTINGS, tap GIFT CODE and enter your code. The reward lands in your account right away."),
    ("<summary>Comment fonctionnent les classements&nbsp;?</summary>", "<summary>How do the leaderboards work?</summary>"),
    ("En Arcade, Rain et Chrono, ton meilleur score compte dans le classement mondial, celui de la semaine et celui du mois. Le top&nbsp;10 de chaque mode reçoit des récompenses chaque semaine, directement dans ta boîte aux lettres.",
     "In Arcade, Rain and Chrono, your best score counts in the world, weekly and monthly leaderboards. The top&nbsp;10 of each mode gets rewards every week, straight to your mailbox."),
    ("<summary>J’ai trouvé un bug ou j’ai une idée&nbsp;: je fais comment&nbsp;?</summary>", "<summary>I found a bug or I have an idea: what do I do?</summary>"),
    ('Écris à <a href="mailto:donttapred.contact@gmail.com">donttapred.contact@gmail.com</a> ou viens en parler sur le <a',
     'Email <a href="mailto:donttapred.contact@gmail.com">donttapred.contact@gmail.com</a> or come and talk about it on <a'),
    ("<summary>Et mes données personnelles&nbsp;?</summary>", "<summary>What about my personal data?</summary>"),
    ('Tout est expliqué dans la <a href="https://sites.google.com/view/donttapred-confidentialite" target="_blank" rel="noopener">politique de confidentialité du jeu</a>.',
     'Everything is explained in the game’s <a href="https://sites.google.com/view/donttapred-confidentialite" target="_blank" rel="noopener">privacy policy</a> (in French).'),
    # ---- Téléchargement
    ("Prêt à relever le défi&nbsp;?", "Ready for the challenge?"),
    ('<i aria-hidden="true"></i>Android le 23 octobre</p>', '<i aria-hidden="true"></i>Android on October 23</p>'),
    ('Une seule règle&nbsp;: <span class="is-red">don’t tap red</span>. Gratuit sur iPhone et Android.', 'One single rule: <span class="is-red">don’t tap red</span>. Free on iPhone and Android.'),
    ("Une question sur le jeu&nbsp;? <a", "A question about the game? <a"),
    ('Journaliste ou créateur&nbsp;? <a class="link-arrow" href="/dont-tap-red/presse/">Le kit presse du jeu</a>',
     'Journalist or creator? <a class="link-arrow" href="/dont-tap-red/presse/">The press kit (English texts included)</a>'),
]
for a, b in T:
    n = main.count(a)
    assert n >= 1, f"introuvable : {a[:80]}"
    main = main.replace(a, b)
# Le magasin des modes (étoiles, sections…) garde ses identifiants français : ce sont des ancres, pas du texte

# ---------------------------------------------------------------- Menu, pied de page
SOCIALS = cut(index, '    <ul class="menu-socials" aria-label="Réseaux sociaux">', "    </ul>\n").replace('aria-label="Réseaux sociaux"', 'aria-label="Social networks"').replace('aria-label="Boutique Lootbar"', 'aria-label="Lootbar shop"')
FOOT_SOCIALS = cut(index, '        <ul class="footer-socials" aria-label="Réseaux sociaux">', "        </ul>\n").replace('aria-label="Réseaux sociaux"', 'aria-label="Social networks"').replace('aria-label="Boutique Lootbar"', 'aria-label="Lootbar shop"')

nav = """  <!-- ===================== Navigation (version anglaise) ===================== -->
  <header class="nav" id="top">
    <div class="nav-bar">
      <a class="brand" href="#jeu" aria-label="Don’t Tap Red, back to top">
        <span class="brand-mark" aria-hidden="true">L2K</span>
        <span class="brand-name">Landers<b>2K</b></span>
      </a>
      <nav class="nav-links" aria-label="Main navigation">
        <span class="nav-pill" aria-hidden="true"></span>
        <a href="#jeu">The game</a>
        <a href="#cubes">Cubes</a>
        <a href="#modes">Modes</a>
        <a href="#progression">Progress</a>
        <a href="#codes">Gift codes</a>
        <a href="#faq">FAQ</a>
        <a href="/dont-tap-red/" hreflang="fr" lang="fr">Français</a>
      </nav>
      <div class="nav-actions">
        <a class="btn-discord" href="https://discord.gg/uGGmDmts8Y" target="_blank" rel="noopener" data-magnetic>
          <svg aria-hidden="true"><use href="#i-discord"/></svg><span>Discord</span>
        </a>
        <button class="nav-burger" type="button" aria-expanded="false" aria-controls="menu" aria-label="Open the menu">
          <span></span><span></span>
        </button>
      </div>
      <span class="nav-progress" aria-hidden="true"></span>
    </div>
  </header>

  <!-- Menu mobile -->
  <div class="menu" id="menu" inert>
    <nav class="menu-links" aria-label="Menu">
      <a href="#jeu">The game</a>
      <a href="#essayer">Try it</a>
      <a href="#cubes">The cubes</a>
      <a href="#modes">Game modes</a>
      <a href="#progression">Progress</a>
      <a href="#codes">Gift codes</a>
      <a href="#faq">FAQ</a>
      <a href="/dont-tap-red/" hreflang="fr" lang="fr">Version française</a>
      <a href="/">Landers2K (French)</a>
    </nav>
""" + SOCIALS + """  </div>

"""

footer = """  <!-- ===================== Pied de page (version anglaise) ===================== -->
  <footer class="footer">
    <div class="wrap-wide">
      <div class="footer-top">
        <a class="brand" href="/" aria-label="Landers2K website (French)">
          <span class="brand-mark" aria-hidden="true">L2K</span>
          <span class="brand-name">Landers<b>2K</b></span>
        </a>
        <p class="footer-tagline">Creation · Innovation · Community</p>
""" + FOOT_SOCIALS + """      </div>
      <nav class="footer-cols" aria-label="Site map">
        <div>
          <h4>Don’t Tap Red</h4>
          <ul>
            <li><a href="#jeu">The game</a></li>
            <li><a href="#codes">Gift codes</a></li>
            <li><a href="https://apps.apple.com/app/id6820198356" target="_blank" rel="noopener">App Store</a></li>
            <li><a href="https://play.google.com/store/apps/details?id=com.landers2k.donttapred" target="_blank" rel="noopener">Google Play</a></li>
          </ul>
        </div>
        <div>
          <h4>Help</h4>
          <ul>
            <li><a href="#faq">FAQ</a></li>
            <li><a href="mailto:donttapred.contact@gmail.com">Game support</a></li>
            <li><a href="https://sites.google.com/view/donttapred-confidentialite" target="_blank" rel="noopener">Privacy policy</a></li>
            <li><a href="/dont-tap-red/presse/">Press kit</a></li>
          </ul>
        </div>
        <div>
          <h4>Landers2K</h4>
          <ul>
            <li><a href="/">Website (French)</a></li>
            <li><a href="https://www.twitch.tv/landers2k" target="_blank" rel="noopener">Twitch</a></li>
            <li><a href="https://www.tiktok.com/@landers2k" target="_blank" rel="noopener">TikTok</a></li>
            <li><a href="https://discord.gg/uGGmDmts8Y" target="_blank" rel="noopener">Discord</a></li>
          </ul>
        </div>
        <div>
          <h4>Contact</h4>
          <ul>
            <li><a href="mailto:contact@landers2k.com">contact@landers2k.com</a></li>
            <li><a href="/partenariats.html">Partnerships (French)</a></li>
          </ul>
        </div>
      </nav>
      <div class="footer-bottom">
        <p>© <span id="year">2026</span> Landers2K. All rights reserved.</p>
        <p class="footer-note"><a href="/mentions-legales.html" hreflang="fr">Legal notice and privacy (French)</a></p>
      </div>
    </div>
  </footer>

  <div class="flash" aria-hidden="true"></div>
  <p class="score-toast" aria-live="polite" hidden></p>

  <script src="/script.js" defer></script>
"""

ANALYTICS = cut(index, "  <!-- Cloudflare Web Analytics", "</script>\n")
PRELOAD = cut(fr, "  <!-- Les cubes animés sont ajoutés par script.js", 'cube-orange.webp" type="image/webp">\n')

ld = {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    "name": "Don't Tap Red",
    "url": "https://www.landers2k.com/dont-tap-red/en/",
    "image": "https://www.landers2k.com/assets/img/dtr-icon.jpg",
    "description": "Free reflex game: tap the right cubes, never touch the red one. Four modes (Arcade, Rain, Challenge, Chrono), missions, titles, events and leaderboards.",
    "operatingSystem": "iOS, Android",
    "applicationCategory": "GameApplication",
    "inLanguage": ["en", "fr"],
    "datePublished": "2026-10-20",
    "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
    "author": {"@type": "Person", "name": "Landers2K", "url": "https://www.landers2k.com/"},
    "installUrl": ["https://apps.apple.com/app/id6820198356", "https://play.google.com/store/apps/details?id=com.landers2k.donttapred"],
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
  <meta property="og:title" content="Don’t Tap Red — out now on iPhone">
  <meta property="og:description" content="The free reflex game by Landers2K for iPhone and Android. One single rule: never touch the red one.">
  <meta property="og:image" content="https://www.landers2k.com/assets/img/partage-dtr-en.jpg">
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
