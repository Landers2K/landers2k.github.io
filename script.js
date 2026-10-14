/* ==========================================================================
   Landers2K — animations, intégrations des réseaux et mini-jeu
   (JavaScript natif, sans dépendance)
   ========================================================================== */

/* Comptes utilisés par les intégrations automatiques */
const CONFIG = {
  tiktok: 'landers2k',
  youtubeChannelId: 'UCo0V0OxkmIJ9MgkuLxN_ukg',
  twitch: 'landers2k',
  discordInvite: 'uGGmDmts8Y',
  // ✎ Lien de ta page de dons (Tipeee, Ko-fi, PayPal…). Vide = bouton « Faire un don » caché.
  donate: 'https://streamlabs.com/landers2k/tip',
};

(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const fmt = new Intl.NumberFormat('fr-FR');

  let vw = innerWidth;
  let vh = innerHeight;

  /* ------------------------------------------------------------------------
     Boucle scroll / resize : tout ce qui suit le scroll passe par un seul rAF
     ------------------------------------------------------------------------ */
  const scrollTasks = [];
  const resizeTasks = [];
  let queued = false;
  const run = () => { queued = false; for (const task of scrollTasks) task(); };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(run); } };

  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', () => {
    vw = innerWidth;
    vh = innerHeight;
    for (const task of resizeTasks) task();
    queue();
  });

  /* ------------------------------------------------------------------------
     Découpage des textes en mots (les espaces insécables sont conservés)
     ------------------------------------------------------------------------ */
  function splitWords(el, cls) {
    const words = [];
    const walk = node => {
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/([ \t\n\r]+)/).forEach(part => {
            if (!part) return;
            if (/^[ \t\n\r]+$/.test(part)) { frag.append(' '); return; }
            const w = document.createElement('span');
            w.className = cls;
            if (cls === 'w') {
              const inner = document.createElement('span');
              inner.textContent = part;
              inner.style.setProperty('--i', words.length);
              w.append(inner);
            } else {
              w.textContent = part;
            }
            words.push(w);
            frag.append(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
    return words;
  }

  /* Compteur animé */
  function countUp(el, to, dur = 1800, format = n => fmt.format(n)) {
    if (reduced) { el.textContent = format(to); return; }
    const t0 = performance.now();
    const tick = now => {
      const t = clamp((now - t0) / dur);
      el.textContent = format(Math.round(t === 1 ? to : to * (1 - Math.pow(2, -10 * t))));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------------------
     Apparitions au scroll
     ------------------------------------------------------------------------ */
  $$('[data-stagger]').forEach(parent => {
    Array.from(parent.children).forEach((child, i) => {
      child.classList.add('reveal');
      child.style.setProperty('--d', `${i * 90}ms`);
    });
  });
  $$('[data-split]').forEach(el => splitWords(el, 'w'));

  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      revealIO.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -10% 0px' });
  $$('.reveal, [data-split]:not(.hero-title)').forEach(el => revealIO.observe(el));

  /* ------------------------------------------------------------------------
     Cubes de Don't Tap Red : on peut les taper partout sur le site.
     Mêmes points que dans le jeu. Le score est commun à tout le site.
     ------------------------------------------------------------------------ */
  // Points de 21 à 40, comme les cubes violet et orange du mode Arcade
  const special = () => 21 + Math.floor(Math.random() * 20);
  // Couleur du halo et points rapportés (null = cube rouge : game over)
  const CUBE_COLORS = {
    blue: ['#2997ff', () => 1],
    green: ['#30d158', () => 5],
    purple: ['#bf5af2', special],
    orange: ['#ff9f0a', () => -special()],
    gold: ['#ffd60a', () => 50],
    red: ['#ff375f', null],
  };
  const hero = $('.hero');
  const toast = $('.score-toast');
  const flash = $('.flash');
  let score = 0;
  let toastTimer = 0;
  let hintTimer = 0;

  const showScore = (label, value, lost) => {
    const b = document.createElement('b');
    b.textContent = value;
    toast.replaceChildren(`${label} `, b);
    toast.hidden = false;
    toast.classList.toggle('is-lost', lost);
    toast.classList.remove('is-bump');
    void toast.offsetWidth;
    toast.classList.add('is-on');
    if (!lost) toast.classList.add('is-bump');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2600);
  };

  const burst = (c, color, text) => {
    const r = c.el.getBoundingClientRect();
    const base = c.layer.getBoundingClientRect();
    const cx = r.left + r.width / 2 - base.left;
    const cy = r.top + r.height / 2 - base.top;
    const plus = document.createElement('span');
    plus.className = 'hc-plus';
    plus.textContent = text;
    plus.style.cssText = `left:${cx}px;top:${cy}px;--c:${color}`;
    c.layer.append(plus);
    setTimeout(() => plus.remove(), 950);
    if (reduced) return;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.random() * .5;
      const d = r.width * (.6 + Math.random() * .5);
      const bit = document.createElement('span');
      bit.className = 'hc-bit';
      bit.style.cssText = `left:${cx}px;top:${cy}px;--c:${color};--dx:${(Math.cos(a) * d).toFixed(0)}px;--dy:${(Math.sin(a) * d).toFixed(0)}px`;
      c.layer.append(bit);
      setTimeout(() => bit.remove(), 750);
    }
  };

  const tapCube = c => {
    if (c.busy) return;
    clearTimeout(hintTimer);
    hero?.classList.remove('show-hint');
    const [color, pointsOf] = CUBE_COLORS[c.color];
    c.busy = true;

    if (!pointsOf) {
      const r = c.el.getBoundingClientRect();
      flash.style.setProperty('--fx', `${(r.left + r.width / 2).toFixed(0)}px`);
      flash.style.setProperty('--fy', `${(r.top + r.height / 2).toFixed(0)}px`);
      c.el.classList.remove('is-angry');
      c.root.classList.remove('is-hit');
      flash.classList.remove('is-on');
      void flash.offsetWidth;
      c.el.classList.add('is-angry');
      c.root.classList.add('is-hit');
      flash.classList.add('is-on');
      showScore('GAME OVER ! Score final', score, true);
      score = 0;
      setTimeout(() => { c.busy = false; }, 600);
      return;
    }

    // L'orange retire des points (le score ne descend pas sous 0)
    const points = pointsOf();
    score = Math.max(0, score + points);
    showScore('Score', score, points < 0);
    burst(c, color, points > 0 ? `+${points}` : `${points}`);
    c.el.classList.remove('is-back');
    c.el.classList.add('is-pop');
    setTimeout(() => {
      c.el.classList.remove('is-pop');
      c.el.classList.add('is-back');
      c.busy = false;
    }, 2200 + Math.random() * 1500);
  };

  // Crée les cubes d'un calque à partir d'une liste { s: taille, color, z: profondeur, hint }
  const makeCubes = (layer, root, items) => {
    layer.replaceChildren();
    return items.map((item, i) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.tabIndex = -1;
      el.className = item.z < .4 ? 'hc is-far' : 'hc';
      el.style.cssText = [
        `--s:${item.s}px`, `--glow:${CUBE_COLORS[item.color][0]}88`, `z-index:${Math.round(item.z * 10)}`,
        `--dur:${(3.2 + (i * .37) % 2).toFixed(2)}s`, `--delay:${(-i * .53).toFixed(2)}s`,
        `--r:${3 + (i % 4) * 1.5}deg`, `--in:${(.35 + i * .06).toFixed(2)}s`,
      ].join(';');
      el.innerHTML = `<span class="hc-float"><img class="hc-img" src="assets/img/cube-${item.color}.png" alt="" draggable="false"></span>${item.hint ? '<span class="hc-hint">Tape-moi&nbsp;!</span>' : ''}`;
      layer.append(el);
      const c = Object.assign({ el, layer, root, sign: i % 2 ? 1 : -1, busy: false }, item);
      el.addEventListener('click', () => tapCube(c));
      return c;
    });
  };

  // Les animations ne tournent que pour les calques visibles
  const watched = new Map();
  const liveIO = new IntersectionObserver(entries => entries.forEach(entry => {
    for (const el of watched.get(entry.target)) {
      el.classList.toggle('is-live', entry.isIntersecting);
      if (entry.isIntersecting) el.classList.add('is-seen');
    }
  }), { rootMargin: '0px 0px -12% 0px' });
  const watch = (target, ...els) => { watched.set(target, els); liveIO.observe(target); };

  /* ------------------------------------------------------------------------
     Accueil : les cubes flottent autour du titre. Au scroll, ils s'envolent
     vers l'écran et laissent place à « Création. Innovation. Communauté. »
     ------------------------------------------------------------------------ */
  let heroP = 0;
  let mx = 0, my = 0, tmx = 0, tmy = 0, parallaxRaf = 0;
  let placeHero = () => {};
  let buildHero = () => {};

  if (hero) {
    const heroSticky = $('.hero-sticky');
    const heroContent = $('.hero-content');
    const heroStatement = $('.hero-statement');
    const statementKicker = $('.kicker', heroStatement);
    const statementWords = $$('.st-word', heroStatement);
    const dock = $('.dock');
    const heroLayer = $('.hero-cubes');

    // [x %, y %, taille px, couleur, profondeur 0 (loin) → 1 (proche), bulle « Tape-moi »]
    const HERO_LAYOUTS = {
      wide: [
        [9, 26, 120, 'blue', .9], [20, 13, 56, 'purple', .35], [5, 52, 70, 'red', .5], [17, 45, 46, 'gold', .25],
        [90, 22, 112, 'red', .85], [80, 12, 52, 'blue', .3], [95, 47, 64, 'green', .45], [85, 41, 44, 'blue', .2],
        [11, 79, 96, 'blue', .7], [26, 68, 58, 'orange', .4], [29, 87, 128, 'blue', 1], [50, 75, 56, 'red', .35],
        [71, 88, 100, 'gold', .75], [74, 68, 72, 'blue', .5, true], [89, 81, 124, 'red', .95], [97, 64, 48, 'purple', .3],
      ],
      narrow: [
        [13, 71, 66, 'blue', .75, true], [38, 81, 50, 'red', .5], [62, 70, 56, 'gold', .6],
        [87, 78, 74, 'blue', .9], [6, 86, 38, 'purple', .3], [94, 64, 38, 'green', .35],
      ],
    };

    let heroCubes = [];
    let heroLayout = '';

    placeHero = () => {
      const W = heroSticky.clientWidth, H = heroSticky.clientHeight;
      const fly = reduced ? 0 : easeInOut(clamp(heroP / .6));
      for (const c of heroCubes) {
        const bx = c.x / 100 * W, by = c.y / 100 * H;
        const k = fly * c.z * 2.2;
        const x = bx + (bx - W / 2) * k + mx * c.z * 40;
        const y = by + (by - H / 2) * k + my * c.z * 28;
        const scale = 1 + fly * c.z * 1.5;
        const rot = fly * c.z * 50 * c.sign;
        // Les cubes proches disparaissent en s'envolant, les lointains restent en fond
        const fade = c.z >= .4 ? 1 - clamp((heroP - .15) / .35) : lerp(1, .45, clamp(heroP / .5));
        c.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(3)}) rotate(${rot.toFixed(1)}deg)`;
        c.el.style.opacity = fade.toFixed(3);
        c.el.style.visibility = fade < .02 ? 'hidden' : '';
      }
    };

    buildHero = () => {
      const name = vw < 735 ? 'narrow' : 'wide';
      if (name === heroLayout) return;
      heroLayout = name;
      heroCubes = makeCubes(heroLayer, hero, HERO_LAYOUTS[name].map(([x, y, s, color, z, hint]) => ({ x, y, s, color, z, hint })));
    };

    buildHero();
    placeHero();
    watch(heroSticky, $('.hero-bg'), heroLayer);

    let heroStickyH = heroSticky.offsetHeight;
    resizeTasks.push(() => {
      heroStickyH = heroSticky.offsetHeight;
      buildHero();
      placeHero();
    });

    if (!reduced) {
      scrollTasks.push(() => {
        const r = hero.getBoundingClientRect();
        if (r.bottom < 0) return;
        const total = r.height - heroStickyH;
        const p = total > 0 ? clamp(-r.top / total) : 0;

        heroContent.style.transform = `translate3d(0, ${(-p * 180).toFixed(1)}px, 0) scale(${(1 - p * .06).toFixed(4)})`;
        heroContent.style.opacity = clamp(1 - p * 2.6).toFixed(3);
        heroContent.style.visibility = p > .42 ? 'hidden' : '';

        dock.style.opacity = clamp(1 - p * 5).toFixed(3);
        dock.style.transform = `translate3d(-50%, ${(p * 90).toFixed(1)}px, 0)`;
        dock.style.visibility = p > .22 ? 'hidden' : '';
        if (p > .08) hero.classList.remove('show-hint');

        const q = clamp((p - .45) / .4);
        heroStatement.style.opacity = q > 0 ? '1' : '0';
        statementKicker.style.opacity = easeOut(clamp(q * 3)).toFixed(3);
        statementWords.forEach((w, i) => {
          const k = easeOut(clamp(q * 3.2 - i * .8));
          w.style.opacity = k.toFixed(3);
          w.style.transform = `translateY(${((1 - k) * 30).toFixed(1)}px) scale(${(.94 + k * .06).toFixed(4)})`;
          w.style.filter = k < .999 ? `blur(${((1 - k) * 10).toFixed(2)}px)` : 'none';
        });

        heroP = p;
        placeHero();
      });
    }
  }

  /* ------------------------------------------------------------------------
     Les autres sections : chacune a ses cubes aux couleurs de son réseau,
     ses halos et son sol quadrillé. Les cubes se placent dans les marges et
     glissent en parallaxe au scroll.
     ------------------------------------------------------------------------ */
  const SCENES = {
    links: { colors: ['blue', 'gold', 'purple', 'red', 'green', 'orange'], a: '#2997ff', b: '#bf5af2' },
    about: { colors: ['blue', 'purple', 'red', 'gold'], a: '#2997ff', b: '#bf5af2' },
    tiktok: { colors: ['blue', 'red', 'purple', 'blue'], a: '#25f4ee', b: '#fe2c55' },
    youtube: { colors: ['red', 'orange', 'gold', 'blue'], a: '#ff0033', b: '#ff9f0a' },
    twitch: { colors: ['purple', 'blue', 'purple', 'red'], a: '#9146ff', b: '#2997ff' },
    discord: { colors: ['blue', 'purple', 'green', 'red'], a: '#5865f2', b: '#bf5af2' },
    game: { colors: ['blue', 'red', 'gold', 'green', 'purple', 'orange'], a: '#2997ff', b: '#ff375f' },
    modes: { colors: ['blue', 'gold', 'red', 'green'], a: '#2997ff', b: '#ffd60a' },
    progress: { colors: ['orange', 'purple', 'red', 'blue'], a: '#ff9f0a', b: '#bf5af2' },
    stats: { colors: ['gold', 'green', 'blue', 'red'], a: '#ffd60a', b: '#30d158' },
    download: { colors: ['blue', 'red', 'gold', 'purple'], a: '#2997ff', b: '#ff375f' },
    // Contact : comme l'accueil, les cubes occupent tout le bas de l'écran
    contact: { colors: ['blue', 'purple', 'red', 'gold', 'blue', 'green'], a: '#5865f2', b: '#ff375f', free: [9, 5] },
    support: { colors: ['purple', 'gold', 'red', 'blue'], a: '#9146ff', b: '#ffb300' },
    // Page Partenariats
    partner: { colors: ['blue', 'purple', 'red', 'gold', 'green', 'blue'], a: '#2997ff', b: '#bf5af2', free: [9, 5], top: 74 },
    proof: { colors: ['blue', 'orange', 'red', 'gold'], a: '#2997ff', b: '#ff9f0a' },
    formats: { colors: ['red', 'purple', 'blue', 'green'], a: '#fe2c55', b: '#5865f2' },
    // Page Setup
    setup: { colors: ['red', 'green', 'purple', 'blue', 'gold', 'orange'], a: '#ff375f', b: '#30d158', free: [9, 5], top: 74 },
    parts: { colors: ['red', 'green', 'blue', 'purple', 'gold'], a: '#2997ff', b: '#ff9f0a' },
  };

  // Tirage pseudo-aléatoire reproductible : les cubes gardent leur place d'une visite à l'autre
  const seeded = seed => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const scenes = $$('[data-scene]').map((section, index) => {
    const conf = SCENES[section.dataset.scene];
    const scene = document.createElement('div');
    scene.className = 'scene';
    scene.setAttribute('aria-hidden', 'true');
    scene.style.setProperty('--sa', conf.a);
    scene.style.setProperty('--sb', conf.b);
    scene.style.setProperty('--line', `color-mix(in srgb, ${conf.a} 60%, transparent)`);
    scene.innerHTML = '<div class="scene-floor"><div class="grid-floor"></div></div><div class="scene-cubes"></div>';
    section.prepend(scene);
    const layer = scene.lastElementChild;
    watch(section, scene, layer);
    return { section, layer, conf, seed: index + 1, cubes: [], layout: '' };
  });

  const buildScene = sc => {
    const narrow = vw < 735;
    const free = sc.conf.free;
    const n = free ? free[narrow ? 1 : 0] : narrow ? 3 : Math.round(clamp(sc.section.offsetHeight / 260, 4, 8));
    const key = `${narrow}-${n}`;
    if (key === sc.layout) return;
    sc.layout = key;
    const rnd = seeded(sc.seed * 7919);
    const colors = sc.conf.colors;
    sc.cubes = makeCubes(sc.layer, sc.section, Array.from({ length: n }, (_, i) => {
      const z = .2 + rnd() * .75;
      const cube = {
        z,
        s: Math.round(narrow ? lerp(38, 64, z) : lerp(46, 120, z)),
        color: colors[(i + sc.seed) % colors.length],
      };
      if (free) {
        // Répartis sur toute la largeur, sous le texte
        cube.x = clamp(((i + .5) / n) * 92 + 4 + (rnd() - .5) * 6, 3, 97);
        const top = sc.conf.top || 62;
        cube.y = top + rnd() * (94 - top);
      } else {
        // Dans les marges, à gauche et à droite en alternance
        cube.side = (i + sc.seed) % 2 ? 1 : -1;
        cube.y = clamp(((i + .5) / n) * 100 + (rnd() - .5) * 12, 6, 94);
        cube.j = rnd();
        cube.s = Math.round(narrow ? lerp(34, 54, z) : lerp(42, 104, z));
      }
      return cube;
    }));
  };

  const placeScene = sc => {
    const r = sc.section.getBoundingClientRect();
    if (r.bottom < -150 || r.top > vh + 150) return;
    const W = sc.section.clientWidth, H = sc.section.offsetHeight;
    const margin = Math.max(0, (W - Math.min(W - 2 * (vw < 735 ? 16 : 22), 1200)) / 2);
    const t = reduced ? 0 : (r.top + r.height / 2 - vh / 2) / vh;
    for (const c of sc.cubes) {
      const edge = margin / 2 + c.j * margin * .3;
      const x = (c.side ? (c.side < 0 ? edge : W - edge) : c.x / 100 * W) + mx * c.z * 30;
      const y = c.y / 100 * H - t * c.z * 160 + my * c.z * 24;
      const rot = t * c.z * 30 * c.sign;
      c.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rot.toFixed(1)}deg)`;
    }
  };

  scenes.forEach(sc => { buildScene(sc); placeScene(sc); });
  scrollTasks.push(() => scenes.forEach(placeScene));

  // Parallaxe : les cubes proches suivent davantage la souris
  if (finePointer && !reduced) {
    const step = () => {
      mx += (tmx - mx) * .08;
      my += (tmy - my) * .08;
      placeHero();
      scenes.forEach(placeScene);
      parallaxRaf = Math.abs(tmx - mx) + Math.abs(tmy - my) > .001 ? requestAnimationFrame(step) : 0;
    };
    addEventListener('pointermove', e => {
      tmx = e.clientX / vw - .5;
      tmy = e.clientY / vh - .5;
      if (!parallaxRaf) parallaxRaf = requestAnimationFrame(step);
    }, { passive: true });
  }

  resizeTasks.push(() => scenes.forEach(sc => { buildScene(sc); placeScene(sc); }));


  /* ------------------------------------------------------------------------
     Barre de navigation : état au scroll, masquage, progression,
     pastille qui suit le survol et la section active
     ------------------------------------------------------------------------ */
  (function nav() {
    const bar = $('.nav');
    const links = $$('.nav-links a');
    const pill = $('.nav-pill');
    const progress = $('.nav-progress');
    // Les liens vers une autre page n'ont pas de section à suivre ; celui de la page en cours reste actif
    const samePage = a => a.pathname.replace(/index\.html$/, '') === location.pathname.replace(/index\.html$/, '');
    const targets = links.map(a => (a.hash && samePage(a) ? $(a.hash) : null));
    const here = links.find(a => !a.hash && samePage(a)) || null;
    let active = null;
    let hovering = false;
    let lastY = scrollY;

    const movePill = a => {
      if (!a) { pill.style.opacity = '0'; return; }
      pill.style.opacity = '1';
      pill.style.width = `${a.offsetWidth}px`;
      pill.style.transform = `translateX(${a.offsetLeft}px)`;
    };
    links.forEach(a => a.addEventListener('mouseenter', () => { hovering = true; movePill(a); }));
    $('.nav-links').addEventListener('mouseleave', () => { hovering = false; movePill(active); });
    bar.addEventListener('focusin', () => bar.classList.remove('is-hidden'));
    resizeTasks.push(() => movePill(active));

    scrollTasks.push(() => {
      const y = scrollY;
      const dy = y - lastY;
      lastY = y;
      bar.classList.toggle('is-scrolled', y > 30);
      if (!document.body.classList.contains('menu-open')) {
        if (y > vh * .9 && dy > 6) bar.classList.add('is-hidden');
        else if (dy < -6 || y < vh * .5) bar.classList.remove('is-hidden');
      }

      const max = root.scrollHeight - vh;
      progress.style.transform = `scaleX(${max > 0 ? clamp(y / max).toFixed(4) : 0})`;

      let current = here;
      targets.forEach((t, i) => {
        if (t && t.getBoundingClientRect().top <= vh * .4) current = links[i];
      });
      if (current !== active) {
        active = current;
        links.forEach(a => {
          a.classList.toggle('is-active', a === active);
          if (a === active) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
        if (!hovering) movePill(active);
      }
    });
  })();

  /* ------------------------------------------------------------------------
     À propos : les mots s'illuminent au fil du scroll
     ------------------------------------------------------------------------ */
  const manifesto = $('[data-highlight]');
  if (manifesto) {
    const words = splitWords(manifesto, 'hw');
    let lit = -1;
    scrollTasks.push(() => {
      const r = manifesto.getBoundingClientRect();
      const p = clamp((vh * .85 - r.top) / (r.height + vh * .4));
      const n = Math.round(p * words.length);
      if (n === lit) return;
      lit = n;
      words.forEach((w, i) => w.classList.toggle('lit', i < n));
    });
  }

  /* ------------------------------------------------------------------------
     Modes du jeu : l'écran du téléphone change selon le paragraphe actif
     ------------------------------------------------------------------------ */
  (function scrolly() {
    const wrap = $('.scrolly');
    if (!wrap) return;
    const steps = $$('.step', wrap);
    const screens = $$('.screen', wrap);
    const visual = $('.scrolly-visual', wrap);
    const phone = $('.phone', visual);
    let active = -1;

    scrollTasks.push(() => {
      const wr = wrap.getBoundingClientRect();
      if (wr.bottom < 0 || wr.top > vh) return;

      const stacked = vw <= 833;
      const vr = visual.getBoundingClientRect();
      const ref = stacked ? (vr.bottom + vh) / 2 : vh / 2;
      let best = 0, bestD = Infinity;
      steps.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        const d = Math.abs((r.top + r.bottom) / 2 - ref);
        if (d < bestD) { bestD = d; best = i; }
      });
      if (best !== active) {
        active = best;
        steps.forEach((s, i) => s.classList.toggle('is-active', i === best));
        screens.forEach((s, i) => s.classList.toggle('is-active', i === best));
        visual.style.setProperty('--glow', steps[best].dataset.glow);
      }

      if (!reduced) {
        const p = easeOut(clamp((vh - wr.top) / (vh * .9)));
        phone.style.transform = `perspective(1800px) rotateX(${((1 - p) * 18).toFixed(2)}deg) scale(${(.84 + p * .16).toFixed(4)})`;
      }
    });
  })();

  /* ------------------------------------------------------------------------
     Typographie géante : deux lignes qui glissent en sens inverse
     ------------------------------------------------------------------------ */
  const bigtype = $('.bigtype');
  if (bigtype && !reduced) {
    const rows = $$('.bt-row', bigtype);
    scrollTasks.push(() => {
      const r = bigtype.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      const p = (vh - r.top) / (vh + r.height);
      rows.forEach(row => {
        const x = (p - .5) * parseFloat(row.dataset.speed) * vw * 1.8;
        row.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
      });
    });
  }

  /* ------------------------------------------------------------------------
     Compteurs
     ------------------------------------------------------------------------ */
  $$('[data-count]').forEach(el => {
    const to = parseFloat(el.dataset.count);
    if (reduced) return;
    el.textContent = '0';
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      countUp(el, to, 2000);
    }, { threshold: .8 });
    io.observe(el);
  });

  /* ------------------------------------------------------------------------
     Survol : inclinaison 3D + halo lumineux, boutons magnétiques
     ------------------------------------------------------------------------ */
  if (finePointer && !reduced) {
    $$('[data-tilt]').forEach(el => {
      let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
      const strength = el.classList.contains('phone') ? 14 : 8;
      const loop = () => {
        cx += (tx - cx) * .12;
        cy += (ty - cy) * .12;
        el.style.setProperty('--rx', `${cy.toFixed(3)}deg`);
        el.style.setProperty('--ry', `${cx.toFixed(3)}deg`);
        raf = Math.abs(tx - cx) > .01 || Math.abs(ty - cy) > .01 ? requestAnimationFrame(loop) : 0;
      };
      const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        tx = (x - .5) * strength;
        ty = (.5 - y) * strength;
        el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
        kick();
      });
      el.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
    });

    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${(x * .22).toFixed(1)}px, ${(y * .32).toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ------------------------------------------------------------------------
     Statut du live Twitch (barre de navigation + section Twitch).
     Service public decapi.me : aucun cookie, mis à jour toutes les 2 minutes.
     ------------------------------------------------------------------------ */
  const liveChip = $('.live-chip');
  const liveBadge = $('.live-badge');
  const setLive = state => {
    if (liveChip) {
      liveChip.dataset.live = state;
      liveChip.lastElementChild.textContent = state === 'online' ? 'En live' : state === 'offline' ? 'Hors ligne' : 'Live';
    }
    if (liveBadge) {
      liveBadge.dataset.live = state;
      liveBadge.lastElementChild.textContent = state === 'online' ? 'En direct' : state === 'offline' ? 'Hors ligne' : 'Statut du live';
    }
  };
  const refreshLive = async () => {
    try {
      const res = await fetch(`https://decapi.me/twitch/uptime/${encodeURIComponent(CONFIG.twitch)}`, { cache: 'no-store' });
      if (!res.ok) return;
      const text = (await res.text()).toLowerCase();
      if (text.includes('offline')) setLive('offline');
      else if (/\d/.test(text) && !/error|not found|invalid/.test(text)) setLive('online');
    } catch { /* réseau indisponible : le badge reste neutre */ }
  };
  refreshLive();
  setInterval(refreshLive, 120000);

  /* ------------------------------------------------------------------------
     Chiffres en direct : chaque élément [data-stat="…"] de la page est rempli,
     avec un compteur animé quand il arrive à l'écran. TikTok depuis
     assets/data/tiktok.json, Twitch via decapi.me, Discord via l'invitation
     du serveur (qui donne aussi le nom et l'icône pour la carte Discord).
     Sans réseau, les valeurs écrites dans le HTML restent affichées.
     ------------------------------------------------------------------------ */
  (function liveStats() {
    const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });
    const statIO = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      statIO.unobserve(entry.target);
      const el = entry.target;
      countUp(el, Number(el.dataset.value), 1800, el.dataset.format === 'compact' ? n => compact.format(n) : undefined);
    }), { threshold: .5 });
    const put = (name, value) => {
      if (typeof value !== 'number' || !Number.isFinite(value)) return;
      $$(`[data-stat="${name}"]`).forEach(el => {
        el.dataset.value = value;
        statIO.observe(el);
      });
    };
    const needs = prefix => !!$(`[data-stat^="${prefix}"]`);
    const getJSON = url => fetch(url, { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null);

    if (needs('tiktok-')) {
      getJSON('assets/data/tiktok.json').then(d => {
        if (!d) return;
        put('tiktok-followers', d.followers);
        put('tiktok-likes', d.likes);
        put('tiktok-views', d.recentViews);
        put('tiktok-best', d.bestViews);
      });
    }

    if (needs('twitch-')) {
      fetch(`https://decapi.me/twitch/followcount/${encodeURIComponent(CONFIG.twitch)}`)
        .then(r => (r.ok ? r.text() : ''))
        .then(text => { if (/^\d+$/.test(text.trim())) put('twitch-followers', Number(text.trim())); })
        .catch(() => {});
    }

    const card = $('.discord-card');
    if (needs('discord-') || card) {
      getJSON(`https://discord.com/api/v10/invites/${encodeURIComponent(CONFIG.discordInvite)}?with_counts=true`).then(data => {
        if (!data) return;
        const guild = data.guild || {};
        if (card && guild.name) $('[data-discord="name"]', card).textContent = guild.name;
        if (card && guild.icon && /^\d+$/.test(guild.id) && /^\w+$/.test(guild.icon)) {
          const img = $('.discord-icon img', card);
          img.onload = () => { img.hidden = false; };
          img.src = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`;
        }
        if (card && typeof data.approximate_member_count === 'number') $('.discord-stats', card).hidden = false;
        put('discord-members', data.approximate_member_count);
        put('discord-online', data.approximate_presence_count);
      });
    }
  })();

  // Bouton « Faire un don » : affiché seulement si un lien est renseigné dans CONFIG
  if (/^https:\/\//.test(CONFIG.donate)) {
    $$('[data-donate]').forEach(el => { el.hidden = false; });
    $$('[data-donate-link]').forEach(a => { a.href = CONFIG.donate; });
  }

  /* ------------------------------------------------------------------------
     Dernier TikTok : légende, date et chiffres lus dans assets/data/tiktok.json
     (mis à jour par tools/update_tiktok.py). Sans ce fichier, la page garde
     les valeurs écrites dans le HTML.
     ------------------------------------------------------------------------ */
  (async function latestTikTok() {
    const section = $('#tiktok');
    if (!section) return;
    let data;
    try {
      const res = await fetch('assets/data/tiktok.json', { cache: 'no-cache' });
      if (!res.ok) return;
      data = await res.json();
    } catch { return; }
    const latest = data && data.latest;
    if (!latest || !/^\d{10,25}$/.test(String(latest.id))) return;

    const field = name => $(`[data-tt="${name}"]`, section);
    const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });

    const frame = $('[data-embed="tiktok"]', section);
    if (!frame.classList.contains('is-loaded')) frame.dataset.videoId = latest.id;
    $('.tt-cover', frame).src = `assets/img/tiktok-latest.jpg?v=${latest.id}`;
    field('link').href = `https://www.tiktok.com/@${encodeURIComponent(CONFIG.tiktok)}/video/${latest.id}`;

    const text = String(latest.description || '');
    const caption = text.replace(/#[^\s#]+/g, '').replace(/\s+/g, ' ').trim();
    const tags = (text.match(/#[^\s#]+/g) || []).slice(0, 3);
    if (caption) field('caption').textContent = caption;
    field('tags').replaceChildren(...tags.map(t => Object.assign(document.createElement('li'), { textContent: t })));
    field('tags').hidden = !tags.length;

    if (/^\d{4}-\d{2}-\d{2}$/.test(latest.published || '')) {
      const date = new Date(`${latest.published}T12:00:00Z`);
      field('published').dateTime = latest.published;
      field('published').textContent = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (typeof data.followers === 'number') field('followers').textContent = fmt.format(data.followers);
    if (typeof data.likes === 'number') field('likes').textContent = compact.format(data.likes);
  })();

  /* ------------------------------------------------------------------------
     Intégrations TikTok, YouTube et Twitch.
     Rien n'est chargé (ni cookies tiers) avant que le visiteur clique sur
     « Afficher » ; son choix est ensuite mémorisé sur son appareil.
     ------------------------------------------------------------------------ */
  (function embeds() {
    const KEY = 'l2k-embeds';
    const boxes = $$('[data-embed]');
    const consent = {
      get() { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } },
      set() { try { localStorage.setItem(KEY, '1'); } catch { /* stockage indisponible */ } },
    };

    const scripts = {};
    const loadScript = src => {
      scripts[src] = scripts[src] || new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = resolve;
        s.onerror = reject;
        document.head.append(s);
      });
      return scripts[src];
    };

    const loaders = {
      // Dernier TikTok : lecteur officiel d'une seule vidéo
      tiktok(target, box, play) {
        const id = box.dataset.videoId;
        if (!/^\d{10,25}$/.test(id || '')) return;
        target.innerHTML = `<iframe src="https://www.tiktok.com/player/v1/${id}?music_info=1&description=1&rel=0&autoplay=${play ? 1 : 0}" title="Mon dernier TikTok" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
      },
      // Profil TikTok : mes autres vidéos récentes
      'tiktok-profile'(target) {
        const u = CONFIG.tiktok;
        target.innerHTML = `<blockquote class="tiktok-embed" cite="https://www.tiktok.com/@${u}" data-unique-id="${u}" data-embed-type="creator" style="max-width:780px;min-width:288px"><section><a target="_blank" rel="noopener" href="https://www.tiktok.com/@${u}?refer=creator_embed">@${u}</a></section></blockquote>`;
        loadScript('https://www.tiktok.com/embed.js');
      },
      youtube(target) {
        // La playlist « UU… » contient toutes les mises en ligne de la chaîne, la plus récente d'abord.
        const list = `UU${CONFIG.youtubeChannelId.slice(2)}`;
        target.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/videoseries?list=${list}&rel=0" title="Dernières vidéos YouTube de Landers2K" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
      },
      twitch(target) {
        const host = location.hostname;
        const channel = CONFIG.twitch;
        loadScript('https://player.twitch.tv/js/embed/v1.js').then(() => {
          const player = new window.Twitch.Player(target, {
            channel, parent: [host], width: '100%', height: '100%', autoplay: false, muted: true,
          });
          player.addEventListener(window.Twitch.Player.ONLINE, () => setLive('online'));
          player.addEventListener(window.Twitch.Player.OFFLINE, () => setLive('offline'));
        });
        const chat = $('.twitch-chat');
        if (chat && matchMedia('(min-width: 1069px)').matches) {
          chat.innerHTML = `<iframe src="https://www.twitch.tv/embed/${channel}/chat?parent=${host}&darkpopout" title="Chat Twitch de ${channel}"></iframe>`;
        }
      },
    };

    const load = (box, play = false) => {
      if (box.classList.contains('is-loaded')) return;
      box.classList.add('is-loaded');
      loaders[box.dataset.embed]($('.embed-target', box), box, play);
    };

    // Une fois l'accord donné, chaque intégration se charge à l'approche de l'écran.
    const io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      io.unobserve(entry.target);
      load(entry.target);
    }), { rootMargin: '600px 0px' });
    const enableAll = () => boxes.forEach(box => io.observe(box));

    boxes.forEach(box => {
      $('.embed-load', box).addEventListener('click', () => {
        consent.set();
        load(box, true);
        enableAll();
      });
    });

    if (consent.get()) enableAll();
  })();

  /* ------------------------------------------------------------------------
     Mini-jeu : 20 secondes pour taper les bleus sans toucher un rouge
     ------------------------------------------------------------------------ */
  (function miniGame() {
    const game = $('.mg');
    if (!game) return;
    const arena = $('.mg-arena', game);
    const scoreEl = $('.mg-score', game);
    const timeEl = $('.mg-time', game);
    const bestEl = $('.mg-best', game);
    const title = $('.mg-title', game);
    const text = $('.mg-text', game);
    const startBtn = $('.mg-start', game);
    const storeLink = $('.mg-store', game);
    const KEY = 'l2k-mg-best';
    const DURATION = 20000;

    let best = 0;
    try { best = parseInt(localStorage.getItem(KEY) || '0', 10) || 0; } catch { /* stockage indisponible */ }
    bestEl.textContent = best;

    let playing = false, score = 0, t0 = 0, raf = 0, spawnTimer = 0;
    const progress = () => clamp((performance.now() - t0) / DURATION);

    const spawn = () => {
      const w = arena.clientWidth, h = arena.clientHeight;
      const s = Math.round(clamp(w / 7, 56, 84));
      const red = Math.random() < .26 + progress() * .12;
      const live = $$('.mg-cube:not(.is-gone):not(.is-pop)', arena);
      let x = 0, y = 0;
      for (let tries = 0; tries < 14; tries++) {
        x = Math.random() * (w - s);
        y = Math.random() * (h - s);
        if (live.every(c => Math.hypot(c.offsetLeft - x, c.offsetTop - y) > s * .95)) break;
      }
      const cube = document.createElement('button');
      cube.type = 'button';
      cube.className = `mg-cube ${red ? 'is-red' : 'is-blue'}`;
      cube.style.setProperty('--s', `${s}px`);
      cube.style.left = `${x.toFixed(0)}px`;
      cube.style.top = `${y.toFixed(0)}px`;
      cube.setAttribute('aria-label', red ? 'Cube rouge, à ne pas toucher' : 'Cube bleu, à toucher');
      cube.innerHTML = `<img src="assets/img/cube-${red ? 'red' : 'blue'}.png" alt="">`;
      cube.addEventListener('click', () => hit(cube, red));
      arena.append(cube);
      setTimeout(() => {
        if (!cube.isConnected || cube.dataset.done) return;
        cube.dataset.done = '1';
        cube.classList.add('is-gone');
        setTimeout(() => cube.remove(), 300);
      }, lerp(1300, 820, progress()) + (red ? 500 : 0));
    };

    const loop = () => {
      if (!playing) return;
      spawn();
      spawnTimer = setTimeout(loop, lerp(700, 360, progress()));
    };

    const tick = () => {
      if (!playing) return;
      const left = Math.max(0, DURATION - (performance.now() - t0));
      timeEl.textContent = Math.ceil(left / 1000);
      if (left <= 0) { end(true); return; }
      raf = requestAnimationFrame(tick);
    };

    const hit = (cube, red) => {
      if (!playing || cube.dataset.done) return;
      cube.dataset.done = '1';
      if (red) {
        cube.classList.add('is-hit');
        game.classList.add('is-shake');
        end(false);
        return;
      }
      score += 1;
      scoreEl.textContent = score;
      cube.classList.add('is-pop');
      setTimeout(() => cube.remove(), 320);
      const plus = document.createElement('span');
      plus.className = 'mg-plus';
      plus.textContent = '+1';
      plus.style.left = `${cube.offsetLeft + cube.offsetWidth / 2 - 14}px`;
      plus.style.top = `${cube.offsetTop - 8}px`;
      arena.append(plus);
      setTimeout(() => plus.remove(), 720);
    };

    const end = timeUp => {
      playing = false;
      cancelAnimationFrame(raf);
      clearTimeout(spawnTimer);
      const record = score > best;
      if (record) {
        best = score;
        bestEl.textContent = best;
        try { localStorage.setItem(KEY, String(best)); } catch { /* stockage indisponible */ }
      }
      $$('.mg-cube', arena).forEach(c => {
        if (c.classList.contains('is-hit')) return;
        c.dataset.done = '1';
        c.classList.add('is-gone');
      });
      title.textContent = !timeUp ? 'Perdu, c’était rouge !' : record ? 'Nouveau record !' : 'Temps écoulé !';
      text.textContent = `Score : ${score}. ${timeUp ? 'Dans le vrai jeu, ça ne fait que commencer.' : 'Dans le vrai jeu, tu as trois vies…'}`;
      startBtn.textContent = 'Rejouer';
      storeLink.hidden = false;
      setTimeout(() => game.classList.remove('is-playing'), timeUp ? 150 : 650);
    };

    const start = () => {
      $$('.mg-cube, .mg-plus', arena).forEach(n => n.remove());
      score = 0;
      scoreEl.textContent = '0';
      timeEl.textContent = String(DURATION / 1000);
      game.classList.remove('is-shake');
      game.classList.add('is-playing');
      playing = true;
      t0 = performance.now();
      loop();
      tick();
    };

    startBtn.addEventListener('click', start);
  })();

  /* ------------------------------------------------------------------------
     Menu mobile
     ------------------------------------------------------------------------ */
  (function menu() {
    const panel = $('#menu');
    const burger = $('.nav-burger');
    $$('.menu-links a', panel).forEach((a, i) => a.style.setProperty('--i', i));
    $$('.menu-socials li', panel).forEach((li, i) => li.style.setProperty('--i', i + 8));

    const set = open => {
      document.body.classList.toggle('menu-open', open);
      panel.inert = !open;
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      if (open) $('.nav').classList.remove('is-hidden');
    };
    burger.addEventListener('click', () => set(!document.body.classList.contains('menu-open')));
    $$('a', panel).forEach(a => a.addEventListener('click', () => set(false)));
    addEventListener('keydown', e => {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) set(false);
    });
  })();

  /* ------------------------------------------------------------------------
     Démarrage
     ------------------------------------------------------------------------ */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  const ready = () => {
    root.classList.add('is-loaded');
    if (hero) {
      $('.hero-title').classList.add('is-in');
      // Petite bulle « Tape-moi ! » si personne n'a encore touché un cube
      hintTimer = setTimeout(() => { if (heroP < .08 && toast.hidden) hero.classList.add('show-hint'); }, 2600);
    }
    // Les polices sont chargées : on remesure tout ce qui dépend des hauteurs de texte
    for (const task of resizeTasks) task();
    queue();
  };
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(r => setTimeout(r, 700))]).then(() => requestAnimationFrame(ready));

  run();
})();
