"""Construit la version anglaise du site (/en/) à partir des pages françaises.

Accueil, setup et partenariats : même structure et mêmes animations, textes traduits par des
paires (français → anglais), liens internes vers les pages anglaises. Les sections du jeu
reprennent les traductions de tools/textes_jeu_en.py.
Ordre : tools/build_dtr.py → tools/sync_pages.py → tools/build_en.py → tools/build_dtr_en.py
(la page anglaise du jeu reprend le menu et le pied de page anglais construits ici).
"""
import pathlib, re

from textes_jeu_en import T as JEU

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://www.landers2k.com"

# (page française, page anglaise, adresse française, adresse anglaise)
PAGES = [
    ("index.html", "en/index.html", "/", "/en/"),
    ("setup.html", "en/setup.html", "/setup.html", "/en/setup.html"),
    ("partenariats.html", "en/partnerships.html", "/partenariats.html", "/en/partnerships.html"),
]

# ---------------------------------------------------------------- Menu, menu mobile, pied de page (toutes les pages)
COMMUN = [
    ('<html lang="fr">', '<html lang="en">'),
    ('<meta property="og:locale" content="fr_FR">', '<meta property="og:locale" content="en_US">'),
    ('/assets/img/partage.jpg">', '/assets/img/partage-en.jpg">'),  # image de partage en anglais
    ('<a class="skip-link" href="#main">Aller au contenu</a>', '<a class="skip-link" href="#main">Skip to content</a>'),
    ('aria-label="Landers2K, retour à l’accueil"', 'aria-label="Landers2K, back to home"'),
    ('aria-label="Navigation principale"', 'aria-label="Main navigation"'),
    (">À propos</a>", ">About</a>"),
    (">Vidéos</a>", ">Videos</a>"),
    (">Communauté</a>", ">Community</a>"),
    (">Soutenir</a>", ">Support</a>"),
    (">Partenariats</a>", ">Partnerships</a>"),
    ('aria-label="Statut du live Twitch"', 'aria-label="Twitch live status"'),
    ('aria-label="Ouvrir le menu"', 'aria-label="Open the menu"'),
    (">Tous mes liens</a>", ">All my links</a>"),
    (">Me soutenir</a>", ">Support me</a>"),
    (">Mon setup</a>", ">My setup</a>"),
    (">Live Twitch</a>", ">Twitch streams</a>"),
    ('aria-label="Réseaux sociaux"', 'aria-label="Social networks"'),
    ('aria-label="Boutique Lootbar"', 'aria-label="Lootbar shop"'),
    ('<p class="footer-tagline">Création · Innovation · Communauté</p>', '<p class="footer-tagline">Creation · Innovation · Community</p>'),
    ('aria-label="Plan du site"', 'aria-label="Site map"'),
    ("<h4>Contenus</h4>", "<h4>Content</h4>"),
    (">Le jeu</a>", ">The game</a>"),
    (">Codes cadeaux</a>", ">Gift codes</a>"),
    ("<h4>Aide</h4>", "<h4>Help</h4>"),
    (">FAQ du jeu</a>", ">Game FAQ</a>"),
    (">Kit presse</a>", ">Press kit</a>"),
    (">Support du jeu</a>", ">Game support</a>"),
    (">Confidentialité du jeu</a>", ">Game privacy</a>"),
    (">Boutique Lootbar</a>", ">Lootbar shop</a>"),
    ("Landers2K. Tous droits réservés.", "Landers2K. All rights reserved."),
    ('<a href="/mentions-legales.html">Mentions légales et confidentialité</a> · Les contenus TikTok, YouTube et Twitch ne se chargent qu’après ton accord.',
     '<a href="/mentions-legales.html" hreflang="fr">Legal notice and privacy (French)</a> · TikTok, YouTube and Twitch content only loads once you agree.'),
]

ACCUEIL = [
    # ---- En-tête de la page
    ("<title>Landers2K — Créateur de contenu, streamer et développeur de jeux</title>", "<title>Landers2K — Content creator, streamer and game developer</title>"),
    ("L’univers Landers2K : mes vidéos TikTok et YouTube, mes lives Twitch, le Discord de la communauté et Don’t Tap Red, mon jeu mobile gratuit sur iPhone et Android.",
     "The Landers2K universe: my TikTok and YouTube videos, my Twitch streams, the community Discord and Don’t Tap Red, my free mobile game for iPhone and Android."),
    ('content="Landers2K — Vidéos, lives Twitch et Don’t Tap Red"', 'content="Landers2K — Videos, Twitch streams and Don’t Tap Red"'),
    ("Mes TikToks, mes vidéos YouTube, mes lives Twitch, le Discord de la communauté et Don’t Tap Red, mon jeu mobile gratuit.",
     "My TikToks, YouTube videos, Twitch streams, the community Discord and Don’t Tap Red, my free mobile game."),
    ('content="Landers2K : vidéos, lives Twitch et Don’t Tap Red"', 'content="Landers2K: videos, Twitch streams and Don’t Tap Red"'),
    # ---- Accueil
    ("Créateur de contenu · Streamer · Dev indé</p>", "Content creator · Streamer · Indie dev</p>"),
    ('Bienvenue dans<br>l’univers <span class="grad">Landers2K</span>.', 'Welcome to<br>the <span class="grad">Landers2K</span> universe.'),
    ("Vidéos, lives et jeux vidéo&nbsp;: tout ce que je crée, réuni au même endroit.", "Videos, live streams and video games: everything I create, all in one place."),
    ("</svg>Rejoindre le Discord", "</svg>Join the Discord"),
    (">Jouer à Don’t Tap Red</a>", ">Play Don’t Tap Red</a>"),
    ('<p class="kicker">Landers2K, c’est</p>', '<p class="kicker">Landers2K is</p>'),
    ('<span class="st-word">Création.</span>', '<span class="st-word">Creation.</span>'),
    ('<span class="st-word is-red">Communauté.</span>', '<span class="st-word is-red">Community.</span>'),
    ('aria-label="Mes réseaux"', 'aria-label="My socials"'),
    ('<span class="sr">Boutique Lootbar</span>', '<span class="sr">Lootbar shop</span>'),
    # ---- Liens
    ('<p class="kicker reveal">Tous mes liens</p>', '<p class="kicker reveal">All my links</p>'),
    ("data-split>Retrouve-moi partout.</h2>", "data-split>Find me everywhere.</h2>"),
    ("<small>@landers2k · mes lives</small>", "<small>@landers2k · my live streams</small>"),
    ("<small>Le serveur de la communauté</small>", "<small>The community server</small>"),
    ("<small>Ma boutique Landers2K</small>", "<small>My Landers2K shop</small>"),
    ("<small>Disponible sur l’App Store</small>", "<small>Available on the App Store</small>"),
    ("<small>Disponible sur Google Play</small>", "<small>Available on Google Play</small>"),
    ("<b>Me contacter</b>", "<b>Contact me</b>"),
    # ---- À propos
    ('<p class="kicker reveal" id="about-title">À propos</p>', '<p class="kicker reveal" id="about-title">About</p>'),
    ("Je suis Tony, mais tu me connais probablement en tant que Landers2K. J’ai 32&nbsp;ans et je suis créateur de contenu, streamer et développeur de jeux vidéo indépendant.",
     "I’m Tony, but you probably know me as Landers2K. I’m 32 and I’m a content creator, streamer and indie video game developer."),
    ('<b><span data-count="10">10</span>+ ans</b><span>de passion pour le gaming et le streaming</span>',
     '<b><span data-count="10">10</span>+ years</b><span>of passion for gaming and streaming</span>'),
    ("<span>le grand saut&nbsp;: le matériel et les ressources pour passer à la vitesse supérieure</span>",
     "<span>the big leap: the gear and resources to take things up a notch</span>"),
    ("<b>3 univers</b><span>des vidéos, des lives et mes propres jeux vidéo</span>", "<b>3 worlds</b><span>videos, live streams and my own video games</span>"),
    ("<b>1<sup>er</sup> jeu</b><span>Don’t Tap Red, gratuit sur iPhone et Android</span>", "<b>1<sup>st</sup> game</b><span>Don’t Tap Red, free on iPhone and Android</span>"),
    ("Passionné de gaming et de streaming depuis plus de <strong>10 ans</strong>, j’ai décidé de donner une nouvelle dimension à cette passion en <strong>septembre 2025</strong>, lorsque j’ai enfin pu investir dans le matériel et les ressources nécessaires pour concrétiser mes ambitions.",
     "I’ve been passionate about gaming and streaming for more than <strong>10 years</strong>, and in <strong>September 2025</strong> I decided to take that passion to a new level, when I could finally invest in the gear and resources I needed to make my ambitions real."),
    ("Aujourd’hui, je partage mon univers à travers mes <strong>vidéos sur YouTube et TikTok</strong>, mes <strong>diffusions en direct sur Twitch</strong> et le développement de mes propres jeux vidéo, dont <strong>Don’t Tap Red</strong>, disponible gratuitement sur iOS et Android.",
     "Today, I share my universe through my <strong>videos on YouTube and TikTok</strong>, my <strong>live streams on Twitch</strong> and the development of my own video games, including <strong>Don’t Tap Red</strong>, free on iOS and Android."),
    (">Découvrir mon setup</a>", ">Check out my setup</a>"),
    ('<strong>Landers2K, c’est bien plus qu’une chaîne gaming</strong>&nbsp;: c’est un projet qui réunit <span class="is-blue">création</span>, <span class="grad-text">innovation</span> et <span class="is-red">communauté</span>.',
     '<strong>Landers2K is much more than a gaming channel</strong>: it’s a project that brings together <span class="is-blue">creation</span>, <span class="grad-text">innovation</span> and <span class="is-red">community</span>.'),
    ("Ce site est le point central de cet univers, où vous retrouverez mes dernières vidéos, mes lives, mes jeux et toutes les nouveautés de mes projets.",
     "This site is the heart of that universe: you’ll find my latest videos, my live streams, my games and all the news about my projects."),
    ("<strong>Bienvenue dans l’univers Landers2K.</strong>", "<strong>Welcome to the Landers2K universe.</strong>"),
    # ---- TikTok (la légende et les chiffres sont remplacés par script.js)
    ("data-split>Mon dernier TikTok.</h2>", "data-split>My latest TikTok.</h2>"),
    ('<p class="tt-date reveal">Publié le <time', '<p class="tt-date reveal">Posted on <time'),
    (">9 octobre 2026</time>", ">October 9, 2026</time>"),
    ('<b data-tt="followers">6&nbsp;190</b><span>abonnés</span>', '<b data-tt="followers">6,190</b><span>followers</span>'),
    ('<b data-tt="likes">76,1&nbsp;k</b><span>j’aime</span>', '<b data-tt="likes">76.1K</b><span>likes</span>'),
    ("</svg>S’abonner sur TikTok", "</svg>Follow on TikTok"),
    (">Voir sur TikTok</a>", ">Watch on TikTok</a>"),
    ('alt="Miniature de mon dernier TikTok"', 'alt="Thumbnail of my latest TikTok"'),
    ('aria-label="Lire mon dernier TikTok"', 'aria-label="Play my latest TikTok"'),
    ("Lecteur fourni par TikTok, qui peut déposer des cookies.", "Player provided by TikTok, which may set cookies."),
    ("Mes autres vidéos récentes</p>", "My other recent videos</p>"),
    (">Toutes mes vidéos sur TikTok</a>", ">All my videos on TikTok</a>"),
    # ---- YouTube
    ("data-split>Mes vidéos YouTube.</h2>", "data-split>My YouTube videos.</h2>"),
    ("</svg>S’abonner à la chaîne", "</svg>Subscribe to the channel"),
    ('<p class="facade-title">Les dernières vidéos de la chaîne</p>', '<p class="facade-title">The channel’s latest videos</p>'),
    ("Contenu fourni par YouTube, qui peut déposer des cookies.", "Content provided by YouTube, which may set cookies."),
    (">Afficher les vidéos</button>", ">Show the videos</button>"),
    ("Les vidéos les plus récentes s’enchaînent automatiquement dans le lecteur.", "The latest videos play one after another in the player."),
    # ---- Twitch
    ("data-split>En direct sur Twitch.</h2>", "data-split>Live on Twitch.</h2>"),
    ("<span>Statut du live</span>", "<span>Live status</span>"),
    ("</svg>Suivre sur Twitch", "</svg>Follow on Twitch"),
    ('<p class="facade-title">Le live et le chat</p>', '<p class="facade-title">The stream and the chat</p>'),
    ("Contenu fourni par Twitch, qui peut déposer des cookies.", "Content provided by Twitch, which may set cookies."),
    (">Afficher le live</button>", ">Show the stream</button>"),
    ('aria-label="Chat Twitch"', 'aria-label="Twitch chat"'),
    # ---- Discord
    ('<p class="discord-label">Serveur Discord</p>', '<p class="discord-label">Discord server</p>'),
    ("Le QG de la communauté&nbsp;: on y discute, on partage et on se retrouve entre deux lives.", "The community HQ: we chat, share and hang out between streams."),
    ("</b> en ligne</span>", "</b> online</span>"),
    ("</b> membres</span>", "</b> members</span>"),
    ("</svg>Rejoindre le serveur", "</svg>Join the server"),
    # ---- Typographie géante
    ('aria-label="Création, innovation, communauté"', 'aria-label="Creation, innovation, community"'),
    ('<span class="bt-blue">Création</span>', '<span class="bt-blue">Creation</span>'),
    ('<span class="bt-red">Communauté</span>', '<span class="bt-red">Community</span>'),
    ('<span class="bt-blue">Tape le bleu</span>', '<span class="bt-blue">Tap the blue</span>'),
    ('<span class="bt-red">Évite le rouge</span>', '<span class="bt-red">Avoid the red</span>'),
    # ---- Jeu (le reste vient de textes_jeu_en.py)
    (">Tout savoir sur le jeu</a>", ">All about the game</a>"),
    # ---- Me soutenir
    ('<p class="kicker reveal">Me soutenir</p>', '<p class="kicker reveal">Support me</p>'),
    ('Un coup de pouce&nbsp;?<br><span class="muted">Merci, ça compte énormément.</span>', 'Want to help out?<br><span class="muted">Thank you, it means a lot.</span>'),
    ("<h3>M’abonner sur Twitch</h3>", "<h3>Subscribe on Twitch</h3>"),
    ("Ton abonnement soutient directement les lives. Et si tu as Amazon Prime, <strong>tu as un abonnement Twitch offert chaque mois</strong> avec Prime Gaming&nbsp;!",
     "Your sub directly supports the streams. And if you have Amazon Prime, <strong>you get a free Twitch sub every month</strong> with Prime Gaming!"),
    ("</svg>S’abonner sur Twitch", "</svg>Subscribe on Twitch"),
    ("<h3>Recharger tes jeux via ma boutique</h3>", "<h3>Top up your games through my shop</h3>"),
    ("Des réductions sur tes recharges (Seven Deadly Sins&nbsp;: Origin, Genshin Impact, Valorant…). <strong>Chaque achat via ma boutique Lootbar me reverse une commission</strong>, sans que tu paies plus cher.",
     "Discounts on your top-ups (Seven Deadly Sins: Origin, Genshin Impact, Valorant…). <strong>Every purchase through my Lootbar shop earns me a commission</strong>, at no extra cost to you."),
    ('<p class="support-note">Lien affilié</p>', '<p class="support-note">Affiliate link</p>'),
    ("</svg>Voir ma boutique", "</svg>Visit my shop"),
    ("<h3>Faire un don</h3>", "<h3>Make a donation</h3>"),
    ("Un coup de pouce ponctuel, du montant que tu veux, pour m’aider à créer plus de vidéos, de lives et de jeux. Paiement sécurisé via Streamlabs.",
     "A one-time boost, any amount you like, to help me create more videos, streams and games. Secure payment via Streamlabs."),
    ("</svg>Faire un don", "</svg>Donate"),
    ("<h3>Gratuit, et tout aussi précieux</h3>", "<h3>Free, and just as valuable</h3>"),
    ("Chaque abonnement, like ou partage aide mes contenus à être vus par plus de monde.", "Every follow, like or share helps my content reach more people."),
    ("</svg>S’abonner sur YouTube</a>", "</svg>Subscribe on YouTube</a>"),
    ("</svg>Me suivre sur TikTok</a>", "</svg>Follow me on TikTok</a>"),
    ("</svg>Noter Don’t Tap Red sur iPhone</a>", "</svg>Rate Don’t Tap Red on iPhone</a>"),
    ("</svg>Noter Don’t Tap Red sur Android</a>", "</svg>Rate Don’t Tap Red on Android</a>"),
    # ---- Contact
    ("data-split>Une idée&nbsp;? Écris-moi.</h2>", "data-split>Got an idea? Write to me.</h2>"),
    ("Une proposition de partenariat, une collaboration ou juste un message&nbsp;: je lis tout.", "A partnership offer, a collaboration or just a message: I read everything."),
    ("</svg>M’envoyer un e-mail", "</svg>Send me an email"),
    ("Tu représentes une marque ou un jeu&nbsp;? <a", "Representing a brand or a game? <a"),
    (">Découvre mon espace partenariats</a>", ">Visit my partnerships page</a>"),
]

SETUP = [
    ("Mon setup — Landers2K", "My setup — Landers2K"),
    ("Le PC de Landers2K pour le stream, le jeu et la création : Ryzen 9 9950X3D, RTX 5090, 64 Go de DDR5. Tous les composants, pièce par pièce.",
     "Landers2K’s PC for streaming, gaming and creating: Ryzen 9 9950X3D, RTX 5090, 64 GB of DDR5. Every component, piece by piece."),
    ("Ryzen 9 9950X3D, RTX 5090, 64 Go de DDR5 : tous les composants de mon PC de stream.", "Ryzen 9 9950X3D, RTX 5090, 64 GB of DDR5: every component of my streaming PC."),
    ('Mon <span class="grad">setup.</span>', 'My <span class="grad">setup.</span>'),
    ("La machine derrière mes lives, mes vidéos et le développement de Don’t Tap Red. Toutes les pièces, une par une.",
     "The machine behind my live streams, my videos and the development of Don’t Tap Red. Every part, one by one."),
    (">Voir les composants</a>", ">See the components</a>"),
    (">Le voir tourner en live</a>", ">See it in action on stream</a>"),
    ('<p class="kicker reveal">En chiffres</p>', '<p class="kicker reveal">By the numbers</p>'),
    ('Taillé pour le stream,<br><span class="muted">le jeu et la création.</span>', 'Built for streaming,<br><span class="muted">gaming and creating.</span>'),
    ("</svg>Processeur</span>", "</svg>Processor</span>"),
    ('<span data-count="16">16</span> cœurs</b>', '<span data-count="16">16</span> cores</b>'),
    ("32 threads, avec 3D V-Cache", "32 threads, with 3D V-Cache"),
    ("</svg>Carte graphique</span>", "</svg>Graphics card</span>"),
    ('<span data-count="32">32</span> Go</b>', '<span data-count="32">32</span> GB</b>'),
    ("de mémoire vidéo GDDR7", "of GDDR7 video memory"),
    ("</svg>Mémoire</span>", "</svg>Memory</span>"),
    ('<span data-count="64">64</span> Go</b>', '<span data-count="64">64</span> GB</b>'),
    ("de DDR5 à 6400 MHz", "of DDR5 at 6400 MHz"),
    ("</svg>Stockage</span>", "</svg>Storage</span>"),
    ('<span data-count="14">14</span> To</b>', '<span data-count="14">14</span> TB</b>'),
    ("2 SSD Samsung et un disque Seagate", "2 Samsung SSDs and a Seagate drive"),
    ('<p class="kicker reveal">Les composants</p>', '<p class="kicker reveal">The components</p>'),
    ("data-split>Pièce par pièce.</h2>", "data-split>Piece by piece.</h2>"),
    ("Le cœur de la machine</h3>", "The heart of the machine</h3>"),
    ('<p class="part-kind">Processeur</p>', '<p class="part-kind">Processor</p>'),
    ("16 cœurs, 32 threads, 4,3 GHz", "16 cores, 32 threads, 4.3 GHz"),
    (">Voir sur Amazon</a>", ">See on Amazon</a>"),
    ('<p class="part-kind">Carte graphique</p>', '<p class="part-kind">Graphics card</p>'),
    ("32 Go de GDDR7", "32 GB of GDDR7"),
    ('<p class="part-kind">Carte mère</p>', '<p class="part-kind">Motherboard</p>'),
    ('<p class="part-kind">Mémoire vive</p>', '<p class="part-kind">RAM</p>'),
    ("64 Go (2 × 32 Go), 6400 MHz, CL32", "64 GB (2 × 32 GB), 6400 MHz, CL32"),
    ('<h3 class="parts-group reveal">Stockage</h3>', '<h3 class="parts-group reveal">Storage</h3>'),
    ('<p class="part-spec">2 To</p>', '<p class="part-spec">2 TB</p>'),
    ('<p class="part-spec">4 To</p>', '<p class="part-spec">4 TB</p>'),
    ('<p class="part-spec">8 To</p>', '<p class="part-spec">8 TB</p>'),
    ('<p class="part-kind">Disque dur</p>', '<p class="part-kind">Hard drive</p>'),
    ("Boîtier, alimentation et refroidissement</h3>", "Case, power and cooling</h3>"),
    ('<p class="part-kind">Boîtier</p>', '<p class="part-kind">Case</p>'),
    ("Noir, avec écran tactile intégré", "Black, with a built-in touchscreen"),
    ('<p class="part-kind">Alimentation</p>', '<p class="part-kind">Power supply</p>'),
    ("1200 W, noire", "1200 W, black"),
    ('<p class="part-kind">Watercooling</p>', '<p class="part-kind">Liquid cooling</p>'),
    ("Radiateur 360 mm, noir", "360 mm radiator, black"),
    ('<p class="part-kind">Ventilateurs</p>', '<p class="part-kind">Fans</p>'),
    ("<span>120 mm, noir</span>", "<span>120 mm, black</span>"),
    ("<span>140 mm, noir</span>", "<span>140 mm, black</span>"),
    ("<span>120 mm, noir, pack de 3</span>", "<span>120 mm, black, 3-pack</span>"),
    # Recherches Amazon : boutique américaine, tailles en GB / TB
    ("https://www.amazon.fr/s?k=", "https://www.amazon.com/s?k="),
    ("+2+To\"", "+2TB\""),
    ("+4+To\"", "+4TB\""),
    ("+8+To\"", "+8TB\""),
    ("+DDR5+64+Go+6400", "+DDR5+64GB+6400"),
    ('<p class="kicker reveal">Une question&nbsp;?</p>', '<p class="kicker reveal">A question?</p>'),
    ("data-split>On en parle sur Discord.</h2>", "data-split>Let’s talk about it on Discord.</h2>"),
    ("Un conseil pour ton PC, une question sur un composant ou sur mes réglages de stream&nbsp;: la communauté et moi, on est là.",
     "Advice for your PC, a question about a component or my stream settings: the community and I are here."),
    ("</svg>Rejoindre le Discord", "</svg>Join the Discord"),
]

PARTENARIATS = [
    ("Partenariats — Landers2K", "Partnerships — Landers2K"),
    ("Marques et studios : travaillez avec Landers2K, créateur de contenu gaming, streamer et développeur de jeux. Audience TikTok, Twitch et Discord à jour et formats de partenariat.",
     "Brands and studios: work with Landers2K, gaming content creator, streamer and game developer. Up-to-date TikTok, Twitch and Discord audience, and partnership formats."),
    ("Créateur gaming, streamer et développeur de jeux : audience en temps réel et formats de partenariat.", "Gaming creator, streamer and game developer: real-time audience and partnership formats."),
    ("Espace marques et studios</p>", "For brands and studios</p>"),
    ('Travaillons <span class="grad">ensemble.</span>', 'Let’s work <span class="grad">together.</span>'),
    ("Créateur de contenu gaming, streamer et développeur de jeux indépendant, je fais découvrir des jeux et des marques à une communauté de joueurs francophones, sur TikTok, YouTube, Twitch et Discord.",
     "Gaming content creator, streamer and indie game developer, I introduce games and brands to a community of French-speaking gamers on TikTok, YouTube, Twitch and Discord."),
    ("subject=Proposition%20de%20partenariat", "subject=Partnership%20proposal"),
    ("</svg>Proposer un partenariat", "</svg>Propose a partnership"),
    (">Voir mon audience</a>", ">See my audience</a>"),
    ('<p class="kicker reveal">Mon audience</p>', '<p class="kicker reveal">My audience</p>'),
    ('Des chiffres à jour,<br><span class="muted">en temps réel.</span>', 'Up-to-date numbers,<br><span class="muted">in real time.</span>'),
    (">6&nbsp;190</b>", ">6,190</b>"),
    (">76,1&nbsp;k</b>", ">76.1K</b>"),
    (">274,4&nbsp;k</b>", ">274.4K</b>"),
    (">91,3&nbsp;k</b>", ">91.3K</b>"),
    ('<span class="kpi-label">abonnés</span>', '<span class="kpi-label">followers</span>'),
    ('<span class="kpi-label">j’aime reçus</span>', '<span class="kpi-label">likes received</span>'),
    ("vues sur mes vidéos épinglées et les plus récentes", "views on my pinned and most recent videos"),
    ("vues sur ma vidéo la plus vue", "views on my most-watched video"),
    ("membres sur le serveur", "members on the server"),
    ("TikTok, Twitch et Discord : chiffres mis à jour automatiquement. Statistiques détaillées (âge, pays, taux d’engagement) envoyées sur demande.",
     "TikTok, Twitch and Discord: numbers updated automatically. Detailed statistics (age, country, engagement rate) available on request."),
    ('<p class="kicker reveal">Mon univers</p>', '<p class="kicker reveal">My universe</p>'),
    ("data-split>Ce que je couvre.</h2>", "data-split>What I cover.</h2>"),
    ('<p class="proof-badge">Partenaire</p>', '<p class="proof-badge">Partner</p>'),
    ("Builds, compositions d’équipe, événements et nouveaux personnages&nbsp;: je couvre le jeu au quotidien sur TikTok et en live.",
     "Builds, team comps, events and new characters: I cover the game every day on TikTok and on stream."),
    ("Tutos et gameplay pour aider les joueurs à progresser, comme ma série sur les dribbles.", "Tutorials and gameplay to help players improve, like my dribbling series."),
    ('<p class="proof-badge">Développeur</p>', '<p class="proof-badge">Developer</p>'),
    ("Je conçois et publie mes propres jeux, disponibles sur iOS et Android. Je parle aussi bien aux joueurs qu’aux studios.",
     "I design and publish my own games, available on iOS and Android. I speak to players and studios alike."),
    ('<p class="kicker reveal">Ce que je propose</p>', '<p class="kicker reveal">What I offer</p>'),
    ('Des formats<br><span class="muted">adaptés à votre projet.</span>', 'Formats<br><span class="muted">tailored to your project.</span>'),
    ("<h3>Vidéo TikTok dédiée</h3>", "<h3>Dedicated TikTok video</h3>"),
    ("Une vidéo courte autour de votre jeu ou produit&nbsp;: découverte, astuces, mise en situation.", "A short video about your game or product: first look, tips, real-life use."),
    ("<h3>Vidéo YouTube</h3>", "<h3>YouTube video</h3>"),
    ("Une présentation intégrée à une vidéo, ou une vidéo complète consacrée à votre jeu.", "An integrated segment in a video, or a full video dedicated to your game."),
    ("<h3>Live Twitch sponsorisé</h3>", "<h3>Sponsored Twitch stream</h3>"),
    ("Une session de jeu en direct, avec votre code créateur, une bannière et des échanges avec le chat.", "A live gaming session with your creator code, a banner and interaction with chat."),
    ("<h3>Communauté Discord</h3>", "<h3>Discord community</h3>"),
    ("Annonces, concours et giveaways auprès des membres de mon serveur.", "Announcements, contests and giveaways for the members of my server."),
    ("Tarifs sur devis, selon le format et la durée. Les contenus sponsorisés sont toujours clairement signalés, conformément à la loi.",
     "Pricing on request, depending on the format and length. Sponsored content is always clearly disclosed, as required by law."),
    ("data-split>Parlons de votre projet.</h2>", "data-split>Let’s talk about your project.</h2>"),
    ("Présentez-moi votre jeu ou votre marque, vos objectifs et vos dates&nbsp;: je vous réponds avec une proposition adaptée.",
     "Tell me about your game or brand, your goals and your dates: I’ll get back to you with a tailored proposal."),
    ("</svg>Écrire un e-mail", "</svg>Send an email"),
]

PAIRES = {"index.html": ACCUEIL, "setup.html": SETUP, "partenariats.html": PARTENARIATS}


def lang_box(fr_url, en_url):
    """Choix de la langue de la version anglaise : drapeau américain, « Français » mène à la page française."""
    return f'''<details class="lang" data-lang>
          <summary class="lang-btn" aria-label="Language: English"><svg class="flag" aria-hidden="true"><use href="#i-flag-us"/></svg><span>EN</span></summary>
          <div class="lang-menu">
            <a href="{fr_url}" hreflang="fr" lang="fr" data-lang-alt><svg class="flag" aria-hidden="true"><use href="#i-flag-fr"/></svg>Français</a>
            <a href="{en_url}" hreflang="en" lang="en" aria-current="true"><svg class="flag" aria-hidden="true"><use href="#i-flag-us"/></svg>English</a>
          </div>
        </details>'''


def to_english_links(page):
    """Liens internes : chemins depuis la racine (les pages sont dans /en/), puis vers les pages anglaises."""
    page = re.sub(r'(href|src)="(?!https?:|mailto:|tel:|data:|#|/)(?:\./)?', r'\1="/', page)
    page = re.sub(r'href="/(#[\w-]+)?"', lambda m: f'href="/en/{m.group(1) or ""}"', page)
    page = re.sub(r'href="/setup\.html(#[\w-]+)?"', lambda m: f'href="/en/setup.html{m.group(1) or ""}"', page)
    page = re.sub(r'href="/partenariats\.html(#[\w-]+)?"', lambda m: f'href="/en/partnerships.html{m.group(1) or ""}"', page)
    page = re.sub(r'href="/dont-tap-red/(#[\w-]+)?"', lambda m: f'href="/dont-tap-red/en/{m.group(1) or ""}"', page)
    return page


def leftover_french(page):
    """Mots français restés dans le texte visible (hors commentaires, scripts, légende TikTok et lien « Français »)."""
    text = re.sub(r"<!--.*?-->|<script.*?</script>|<blockquote class=\"tt-caption.*?</blockquote>|<a [^>]*lang=\"fr\"[^>]*>.*?</a>", " ", page, flags=re.S)
    text = re.sub(r"<head>.*?</head>", " ", text, flags=re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    words = r"le|la|les|des|du|une|pour|avec|dans|sur|ton|tes|est|et|à|où|jeu|gratuit|chaque|mon|mes|ma|je|tu|vous|votre|nous|pas|qui|que|aux|au"
    found = set(re.findall(rf"\b(?:{words})\b", text, flags=re.I))
    found |= {w for w in re.findall(r"\w*[éèêàçùûôîœ]\w*", text) if w not in {"Français"}}
    return sorted(found)


for fr_name, en_name, fr_url, en_url in PAGES:
    page = (ROOT / fr_name).read_text("utf-8")
    page = to_english_links(page)
    for a, b in JEU:  # sections du jeu (accueil seulement)
        page = page.replace(a, b)
    for a, b in COMMUN + PAIRES[fr_name]:
        assert a in page, f"{fr_name} : introuvable : {a[:80]}"
        page = page.replace(a, b)
    for a, b in [
        (f'<link rel="canonical" href="{SITE}{fr_url}">', f'<link rel="canonical" href="{SITE}{en_url}">'),
        (f'<meta property="og:url" content="{SITE}{fr_url}">', f'<meta property="og:url" content="{SITE}{en_url}">'),
    ]:
        assert a in page, f"{fr_name} : introuvable : {a}"
        page = page.replace(a, b)
    page, n = re.subn(r'<details class="lang" data-lang>.*?</details>', lang_box(fr_url, en_url), page, flags=re.S)
    assert n == 1, f"{fr_name} : choix de la langue introuvable"
    page = page.replace("<head>\n", f"<head>\n  <!-- Version anglaise de {fr_url}, construite par tools/build_en.py : ne pas modifier à la main -->\n", 1)
    out = ROOT / en_name
    out.parent.mkdir(exist_ok=True)
    out.write_text(page, "utf-8")
    print("ok", en_name, "| mots français restants :", leftover_french(page) or "aucun")
