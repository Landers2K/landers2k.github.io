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
  // Pages en anglais (<html lang="en">) : les textes affichés par ce script passent en anglais
  const EN = root.lang === 'en';
  const tr = (fr, en) => (EN ? en : fr);
  const LOCALE = EN ? 'en-US' : 'fr-FR';
  const fmt = new Intl.NumberFormat(LOCALE);
  // Images AVIF (skins transparents) : version PNG si le navigateur ne sait pas les lire
  addEventListener('error', e => {
    const img = e.target;
    if (img.tagName === 'IMG' && /\.avif$/.test(img.src)) img.src = img.src.replace(/\.avif$/, '.png');
  }, true);
  // Noël : du 1er décembre au 2 janvier (ou « ?noel » dans l'adresse pour tester)
  const NOEL = (() => {
    const d = new Date();
    return /[?&]noel\b/.test(location.search) || d.getMonth() === 11 || (d.getMonth() === 0 && d.getDate() <= 2);
  })();
  // Image d'un cube : en tenue de Noël pendant les fêtes
  const cubeSrc = color => (NOEL ? `/assets/img/noel/cube-${color}.png` : `/assets/img/cube-${color}.webp`);

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
     Choix de la langue (drapeau dans la barre) : l'autre langue mène à la
     traduction de la page (balise hreflang), sinon à l'accueil dans cette langue.
     ------------------------------------------------------------------------ */
  (function language() {
    const box = $('[data-lang]');
    if (!box) return;
    const alt = $(`link[rel="alternate"][hreflang="${EN ? 'fr' : 'en'}"]`);
    const other = $('[data-lang-alt]', box);
    if (alt && other) other.href = new URL(alt.href).pathname;
    const current = $('[aria-current]', box);
    if (current) current.href = location.pathname;
    document.addEventListener('click', e => { if (box.open && !box.contains(e.target)) box.open = false; });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && box.open) { box.open = false; $('summary', box).focus(); }
    });
  })();

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

  // Rangs atteints au fil du score, inspirés des titres du jeu
  const RANKS = [
    { at: 100, name: 'Bronze', color: '#d08a4e' },
    { at: 250, name: tr('Argent', 'Silver'), color: '#d1d5db' },
    { at: 500, name: tr('Or', 'Gold'), color: '#ffd60a' },
    { at: 1000, name: 'LEGEND', color: '#d68cff' },
  ];
  const rankOf = s => RANKS.filter(r => s >= r.at).length;
  // Code cadeau Don't Tap Red débloqué au rang LEGEND (déclaré dans le Google Sheets du jeu)
  const GIFT_CODE = atob('U0lURTJL');
  const GIFT_AT = RANKS[RANKS.length - 1].at;
  const saved = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, String(value)); } catch { /* stockage indisponible */ } },
  };
  // Record et meilleur rang du visiteur, gardés sur son appareil
  let best = parseInt(saved.get('l2k-cube-best') || '0', 10) || 0;
  let bestRank = parseInt(saved.get('l2k-cube-rank') || '0', 10) || 0;
  let giftUnlocked = saved.get('l2k-gift') === '1';

  const showScore = (label, value, lost) => {
    const b = document.createElement('b');
    b.textContent = fmt.format(value);
    const parts = [`${label} `, b];
    const rank = rankOf(value);
    if (rank && !lost) {
      const chip = document.createElement('span');
      chip.className = 'score-rank';
      chip.style.setProperty('--rc', RANKS[rank - 1].color);
      chip.textContent = RANKS[rank - 1].name;
      parts.push(chip);
    }
    if (best) {
      const record = document.createElement('span');
      record.className = 'score-best';
      record.textContent = value > 0 && value >= best ? tr('Nouveau record !', 'New record!') : `${tr('Record', 'Best')} ${fmt.format(best)}`;
      parts.push(record);
    }
    if (!giftUnlocked) {
      const goal = document.createElement('span');
      goal.className = 'score-goal';
      goal.textContent = tr(`🎁 Cadeau Don’t Tap Red à ${fmt.format(GIFT_AT)} points`, `🎁 Don’t Tap Red gift at ${fmt.format(GIFT_AT)} points`);
      parts.push(goal);
    }
    toast.replaceChildren(...parts);
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
      showScore(tr('GAME OVER ! Score final', 'GAME OVER! Final score'), score, true);
      score = 0;
      setTimeout(() => { c.busy = false; }, 600);
      return;
    }

    // L'orange retire des points (le score ne descend pas sous 0)
    const points = pointsOf();
    const before = score;
    score = Math.max(0, score + points);
    if (score > best) {
      best = score;
      saved.set('l2k-cube-best', best);
    }
    const rank = rankOf(score);
    const newRank = rank > rankOf(before) && rank > bestRank;
    showScore(newRank ? tr('Nouveau rang ! Score', 'New rank! Score') : 'Score', score, points < 0);
    burst(c, color, points > 0 ? `+${points}` : `${points}`);
    const unlocking = score >= GIFT_AT && before < GIFT_AT && !giftUnlocked;
    if (newRank) {
      bestRank = rank;
      saved.set('l2k-cube-rank', bestRank);
      if (!unlocking) confetti();
    }
    if (unlocking) unlockGift();
    c.el.classList.remove('is-back');
    c.el.classList.add('is-pop');
    setTimeout(() => {
      c.el.classList.remove('is-pop');
      c.el.classList.add('is-back');
      c.busy = false;
    }, 2200 + Math.random() * 1500);
  };

  // Pluie de confettis aux couleurs des cubes (dans la fenêtre du cadeau si elle est ouverte)
  function confetti(container = document.body) {
    if (reduced) return;
    const colors = Object.values(CUBE_COLORS).map(([hex]) => hex);
    const layer = document.createElement('div');
    layer.className = 'confetti';
    layer.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 90; i++) {
      const bit = document.createElement('i');
      bit.style.cssText = [
        `left:${(Math.random() * 100).toFixed(1)}%`, `--c:${colors[i % colors.length]}`,
        `--dx:${((Math.random() - .5) * 260).toFixed(0)}px`, `--dr:${(Math.random() * 900 - 450).toFixed(0)}deg`,
        `--t:${(1.8 + Math.random() * 1.6).toFixed(2)}s`, `--d:${(Math.random() * .5).toFixed(2)}s`,
        `--w:${(6 + Math.random() * 7).toFixed(1)}px`,
      ].join(';');
      layer.append(bit);
    }
    container.append(layer);
    setTimeout(() => layer.remove(), 4200);
  }

  /* Fenêtre du code cadeau, rouvrable depuis le bouton 🎁 de la barre du haut */
  let giftDialog = null;
  const openGift = () => {
    if (!giftDialog) {
      giftDialog = document.createElement('dialog');
      giftDialog.className = 'gift-modal';
      giftDialog.setAttribute('aria-labelledby', 'gift-title');
      giftDialog.innerHTML = `
        <div class="gift-card">
          <img class="gift-cube" src="/assets/img/cube-gold.webp" alt="" width="96" height="96">
          <p class="gift-rank">${tr('Rang', 'Rank')} LEGEND</p>
          <h2 id="gift-title">${fmt.format(GIFT_AT)} ${tr('points, bravo&nbsp;!', 'points, well done!')}</h2>
          <p class="gift-text">${tr('Tu as débloqué un code cadeau pour Don’t Tap Red&nbsp;:', 'You unlocked a gift code for Don’t Tap Red:')}</p>
          <div class="gift-code"><span class="gift-code-value"></span><button type="button" class="btn btn-light gift-copy">${tr('Copier', 'Copy')}</button></div>
          <ul class="gift-rewards">
            <li><b>${fmt.format(1000)}</b> coins</li>
            <li><b>${fmt.format(1000)}</b> gems</li>
            <li><b>${fmt.format(1000)}</b> XP</li>
          </ul>
          <p class="gift-how">${tr('Dans le jeu&nbsp;: <b>PARAMÈTRES › CODE CADEAU</b>. Utilisable une fois par joueur.', 'In the game: <b>SETTINGS › GIFT CODE</b>. One use per player.')}</p>
          <div class="gift-actions">
            <a class="btn btn-brand" href="${tr('/#jeu', '/dont-tap-red/en/')}" style="--brand:#2997ff">${tr('Découvrir le jeu', 'Discover the game')}</a>
            <button type="button" class="btn gift-close">${tr('Fermer', 'Close')}</button>
          </div>
        </div>`;
      $('.gift-code-value', giftDialog).textContent = GIFT_CODE;
      const copyBtn = $('.gift-copy', giftDialog);
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(GIFT_CODE);
          copyBtn.textContent = tr('Copié !', 'Copied!');
        } catch {
          // Presse-papiers indisponible : on sélectionne le code pour une copie manuelle
          getSelection().selectAllChildren($('.gift-code-value', giftDialog));
        }
      });
      $('.gift-close', giftDialog).addEventListener('click', () => giftDialog.close());
      $('a', giftDialog).addEventListener('click', () => giftDialog.close());
      giftDialog.addEventListener('click', e => { if (e.target === giftDialog) giftDialog.close(); });
      document.body.append(giftDialog);
    }
    $('.gift-copy', giftDialog).textContent = tr('Copier', 'Copy');
    giftDialog.showModal();
  };

  const showGiftButton = () => {
    if ($('.nav-gift')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-gift';
    btn.setAttribute('aria-label', tr('Mon code cadeau Don’t Tap Red', 'My Don’t Tap Red gift code'));
    btn.innerHTML = '<span aria-hidden="true">🎁</span>';
    btn.addEventListener('click', openGift);
    $('.nav-actions')?.prepend(btn);
  };

  const unlockGift = () => {
    giftUnlocked = true;
    saved.set('l2k-gift', 1);
    showGiftButton();
    setTimeout(() => {
      openGift();
      confetti(giftDialog);
    }, 450);
  };

  if (giftUnlocked) showGiftButton();

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
      el.innerHTML = `<span class="hc-float"><img class="hc-img" src="${cubeSrc(item.color)}" alt="" draggable="false"></span>${item.hint ? `<span class="hc-hint">${tr('Tape-moi&nbsp;!', 'Tap me!')}</span>` : ''}`;
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
    // Page 404
    lost: { colors: ['red', 'blue', 'gold', 'red', 'purple', 'green'], a: '#ff375f', b: '#2997ff', free: [9, 5], top: 74 },
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
      // Marge étroite : le cube rétrécit pour rester dans la marge (sans jamais passer sous 45 %)
      const fit = c.side ? clamp(2 * (margin - 8 - edge) / c.s, .45, 1) : 1;
      const x = (c.side ? (c.side < 0 ? edge : W - edge) : c.x / 100 * W) + mx * c.z * 30;
      const y = c.y / 100 * H - t * c.z * 160 + my * c.z * 24;
      const rot = t * c.z * 30 * c.sign;
      c.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rot.toFixed(1)}deg)${fit < 1 ? ` scale(${fit.toFixed(2)})` : ''}`;
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
      liveChip.lastElementChild.textContent = state === 'online' ? tr('En live', 'Live now') : state === 'offline' ? tr('Hors ligne', 'Offline') : 'Live';
    }
    if (liveBadge) {
      liveBadge.dataset.live = state;
      liveBadge.lastElementChild.textContent = state === 'online' ? tr('En direct', 'Live') : state === 'offline' ? tr('Hors ligne', 'Offline') : tr('Statut du live', 'Live status');
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
    const compact = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 });
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
      getJSON('/assets/data/tiktok.json').then(d => {
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
          img.src = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=256`;
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

  // Boutons « Copier » du kit presse : copient le texte de l'élément visé par data-copy
  $$('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = $$('p', $(btn.dataset.copy)).map(p => p.textContent.trim()).join('\n\n');
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Copié ✓';
        btn.classList.add('is-done');
      } catch {
        btn.textContent = 'Sélectionne le texte';
      }
      setTimeout(() => { btn.textContent = 'Copier'; btn.classList.remove('is-done'); }, 2200);
    });
  });

  /* ------------------------------------------------------------------------
     Dernier TikTok : légende, date et chiffres lus dans assets/data/tiktok.json
     (mis à jour par tools/update_tiktok.py). Sans ce fichier, la page garde
     les valeurs écrites dans le HTML.
     ------------------------------------------------------------------------ */
  (async function latestTikTok() {
    const section = $('#tiktok');
    if (!section) return;
    const field = name => $(`[data-tt="${name}"]`, section);
    const grid = field('recent');
    // Sans données, on retire les emplacements vides des vidéos récentes (le lien vers TikTok reste).
    const noRecent = () => { if (grid) grid.hidden = true; };
    let data;
    try {
      const res = await fetch('/assets/data/tiktok.json', { cache: 'no-cache' });
      if (!res.ok) return noRecent();
      data = await res.json();
    } catch { return noRecent(); }
    const latest = data && data.latest;
    if (!latest || !/^\d{10,25}$/.test(String(latest.id))) return noRecent();

    const compact = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 });

    const frame = $('[data-embed="tiktok"]', section);
    if (!frame.classList.contains('is-loaded')) frame.dataset.videoId = latest.id;
    $('.tt-cover', frame).src = `/assets/img/tiktok-latest.jpg?v=${latest.id}`;
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
      field('published').textContent = date.toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (typeof data.followers === 'number') field('followers').textContent = fmt.format(data.followers);
    if (typeof data.likes === 'number') field('likes').textContent = compact.format(data.likes);

    // Mes autres vidéos récentes : miniatures hébergées par le site, lien vers TikTok
    const recent = (Array.isArray(data.recent) ? data.recent : []).filter(v => v && /^\d{10,25}$/.test(String(v.id)));
    if (!grid) return;
    if (!recent.length) return noRecent();
    const el = (tag, className, text) => Object.assign(document.createElement(tag), className ? { className } : {}, text ? { textContent: text } : {});
    grid.replaceChildren(...recent.slice(0, 6).map(video => {
      const caption = String(video.description || '').replace(/#[^\s#]+/g, '').replace(/\s+/g, ' ').trim() || 'TikTok';
      const views = typeof video.plays === 'number' ? compact.format(video.plays) : '';
      const link = el('a', 'tt-card');
      link.href = `https://www.tiktok.com/@${encodeURIComponent(CONFIG.tiktok)}/video/${video.id}`;
      link.target = '_blank';
      link.rel = 'noopener';
      link.setAttribute('aria-label', views ? tr(`${caption} · ${views} vues, sur TikTok`, `${caption} · ${views} views, on TikTok`) : tr(`${caption}, sur TikTok`, `${caption}, on TikTok`));
      const thumb = el('span', 'tt-thumb');
      if (/^assets\/img\/tiktok\/\d{10,25}\.(webp|jpg)$/.test(video.cover || '')) {
        thumb.append(Object.assign(document.createElement('img'), { src: `/${video.cover}`, alt: '', width: 300, height: 400, loading: 'lazy', decoding: 'async' }));
      }
      if (views) {
        const count = el('span', 'tt-views');
        count.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
        count.append(views);
        thumb.append(count);
      }
      link.append(thumb, el('span', 'tt-card-text', caption));
      const item = el('li');
      item.append(link);
      return item;
    }));
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
      // Dernier TikTok : lecteur officiel d'une seule vidéo. S'il signale une erreur (TikTok limite parfois
      // les lectures), on remplace son écran noir par la miniature, un lien vers TikTok et « Réessayer ».
      tiktok(target, box, play) {
        const id = box.dataset.videoId;
        if (!/^\d{10,25}$/.test(id || '')) return;
        target.innerHTML = `<iframe src="https://www.tiktok.com/player/v1/${id}?music_info=1&description=1&rel=0&autoplay=${play ? 1 : 0}" title="Mon dernier TikTok" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
        const player = $('iframe', target);
        const onMessage = e => {
          if (e.source !== player.contentWindow) return;
          let msg = e.data;
          if (typeof msg === 'string') { try { msg = JSON.parse(msg); } catch { return; } }
          if (!msg || !msg['x-tiktok-player']) return;
          // 3002 = lecture automatique bloquée par le navigateur : le visiteur peut encore appuyer sur lecture.
          const failed = msg.type === 'onPlayerError' ? Number(msg.value && msg.value.errorCode) !== 3002
            : msg.type === 'onError' && Number(msg.value) > 1;
          if (!failed) return;
          removeEventListener('message', onMessage);
          target.innerHTML = `<div class="tt-fallback"><img alt=""><p>${tr('TikTok n’arrive pas à lire la vidéo ici pour le moment.', 'TikTok can’t play the video here right now.')}</p><a class="btn btn-light" href="https://www.tiktok.com/@${encodeURIComponent(CONFIG.tiktok)}/video/${id}" target="_blank" rel="noopener">${tr('Regarder sur TikTok', 'Watch on TikTok')}</a><button class="tt-retry" type="button">${tr('Réessayer', 'Try again')}</button></div>`;
          $('img', target).src = $('.tt-cover', box).src;
          $('.tt-retry', target).addEventListener('click', () => loaders.tiktok(target, box, true));
        };
        addEventListener('message', onMessage);
      },
      youtube(target) {
        // La playlist « UULF… » contient les vidéos normales de la chaîne, sans les Shorts ni les lives,
        // la plus récente d'abord.
        const list = `UULF${CONFIG.youtubeChannelId.slice(2)}`;
        target.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/videoseries?list=${list}&rel=0" title="${tr('Dernières vidéos YouTube de Landers2K', 'Latest YouTube videos from Landers2K')}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
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
      cube.setAttribute('aria-label', red ? tr('Cube rouge, à ne pas toucher', 'Red cube, don’t tap it') : tr('Cube bleu, à toucher', 'Blue cube, tap it'));
      cube.innerHTML = `<img src="${cubeSrc(red ? 'red' : 'blue')}" alt="">`;
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
      title.textContent = !timeUp ? tr('Perdu, c’était rouge !', 'Oops, that was red!') : record ? tr('Nouveau record !', 'New record!') : tr('Temps écoulé !', 'Time’s up!');
      text.textContent = EN
        ? `Score: ${score}. ${timeUp ? 'In the real game, this is just the beginning.' : 'In the real game, you get three lives…'}`
        : `Score : ${score}. ${timeUp ? 'Dans le vrai jeu, ça ne fait que commencer.' : 'Dans le vrai jeu, tu as trois vies…'}`;
      startBtn.textContent = tr('Rejouer', 'Play again');
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
     Don't Tap Red : données du jeu lues par le robot (assets/data/classement.json)
     ------------------------------------------------------------------------ */
  let gameDataPromise = null;
  const gameData = () => {
    if (!gameDataPromise) {
      gameDataPromise = fetch('/assets/data/classement.json', { cache: 'no-cache' })
        .then(r => (r.ok ? r.json() : null)).catch(() => null);
    }
    return gameDataPromise;
  };
  const DAY = 864e5;
  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const monthName = (y, m) => new Intl.DateTimeFormat(LOCALE, { month: 'long' }).format(new Date(y, m, 1));
  const ago = iso => {
    const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 6e4));
    if (min < 60) return tr(`il y a ${min} min`, `${min} min ago`);
    const h = Math.round(min / 60);
    if (h < 24) return tr(`il y a ${h} h`, `${h} h ago`);
    const d = Math.round(h / 24);
    return tr(`il y a ${d} jour${d > 1 ? 's' : ''}`, `${d} day${d > 1 ? 's' : ''} ago`);
  };

  /* ------------------------------------------------------------------------
     Skins animés du niveau 30 des pass : mêmes effets que dans le jeu
     (skins/skin_fx.gd) — halo de rayons, reflet qui balaie, étincelles,
     particules qui montent ou jaillissent.
     ------------------------------------------------------------------------ */
  const SKIN_FX = {
    blue_pioneer: { a1: '#3B82F6', a2: '#FDE68A', rim: '#93C5FD', glint: '#FDE68A', shine: 2.0, pulse: 2.0, spark: true, star: true, parts: ['#FFFFFF', '#BFDBFE', '#FDE68A', '#60A5FA'] },
    blue_poseidon: { a1: '#0EA5E9', a2: '#FDE68A', rim: '#7DD3FC', glint: '#FDE68A', shine: 2.2, pulse: 1.6, flow: '#67E8F9', parts: ['#FFFFFF', '#BAE6FD', '#7DD3FC', '#FDE68A'] },
    blue_icedragon: { a1: '#0EA5E9', a2: '#FDE68A', rim: '#BAE6FD', glint: '#E0F2FE', shine: 2.0, pulse: 1.6, flow: '#E0F2FE', star: true, parts: ['#FFFFFF', '#E0F2FE', '#7DD3FC'] },
    blue_dragon: { a1: '#0EA5E9', a2: '#FDE68A', rim: '#93C5FD', glint: '#FDE68A', shine: 2.0, pulse: 1.6, flow: '#93C5FD', star: true, parts: ['#FFFFFF', '#BFDBFE', '#60A5FA', '#FDE68A'] },
  };
  const rand = (a, b) => a + Math.random() * (b - a);
  const animSkin = img => {
    const m = /\/pass\/(blue_(?:pioneer|poseidon|icedragon|dragon))\.(?:avif|png|jpg)/.exec(img.getAttribute('src') || '');
    if (!m || img.closest('.askin')) return;
    const fx = SKIN_FX[m[1]];
    const src = img.currentSrc || img.src;
    const box = document.createElement('span');
    box.className = `askin${fx.spark ? ' is-spark' : ''}`;
    box.setAttribute('aria-hidden', 'true');
    // Les réglages de place de l'image (éventail « à la une ») passent sur le cadre animé
    box.style.cssText = `${img.style.cssText};--a1:${fx.a1};--a2:${fx.a2};--rim:${fx.rim};--glint:${fx.glint};--shine:${fx.shine}s;--pulse:${fx.pulse};--flow:${fx.flow || fx.rim}`;
    img.removeAttribute('style');
    img.classList.remove('is-cut');
    img.src = src;
    img.parentNode.insertBefore(box, img);
    const aura = document.createElement('span');
    aura.className = 'askin-aura';
    const tile = document.createElement('span');
    tile.className = 'askin-tile';
    tile.append(img);
    for (const cls of ['askin-shine', fx.flow ? 'askin-flow' : '']) {
      if (!cls) continue;
      const layer = document.createElement('span');
      layer.className = cls;
      layer.style.webkitMaskImage = layer.style.maskImage = `url("${src}")`;
      tile.append(layer);
    }
    for (let i = 0; i < 6; i++) {
      const s = document.createElement('span');
      s.className = 'askin-spark';
      s.style.cssText = `left:${rand(14, 78).toFixed(0)}%;top:${rand(12, 76).toFixed(0)}%;--c:${fx.parts[i % fx.parts.length]};animation-delay:${rand(0, 2.4).toFixed(2)}s;animation-duration:${rand(1.8, 3).toFixed(2)}s`;
      tile.append(s);
    }
    box.append(aura, tile);
    for (let i = 0; i < 12; i++) {
      const part = document.createElement('span');
      part.className = `askin-part${fx.star && i % 2 ? ' is-star' : ''}`;
      const a = rand(0, Math.PI * 2), r = rand(700, 1200);
      const move = fx.spark
        ? `--x1:${(Math.cos(a) * r).toFixed(0)}%;--y1:${(Math.sin(a) * r).toFixed(0)}%`
        : `--x0:${rand(-500, 500).toFixed(0)}%;--x1:${rand(-700, 700).toFixed(0)}%;--y1:${rand(-1600, -900).toFixed(0)}%`;
      part.style.cssText = `--c:${fx.parts[i % fx.parts.length]};${move};animation-delay:${rand(0, 3).toFixed(2)}s;animation-duration:${rand(fx.spark ? 1.2 : 2.4, fx.spark ? 2 : 3.6).toFixed(2)}s`;
      box.append(part);
    }
  };

  /* ------------------------------------------------------------------------
     Quoi de neuf : « Nouveau », « Dans 6 jours »… selon la date du jour
     ------------------------------------------------------------------------ */
  (function news() {
    const list = $('.news-list');
    if (!list) return;
    const today = startOfDay(new Date());
    const items = $$('.news-item[data-date]', list).map(item => {
      const [y, m, d] = item.dataset.date.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return { item, date, diff: Math.round((date - today) / DAY) };
    });
    const label = diff => (diff > 30 ? tr('Bientôt', 'Coming soon')
      : diff > 1 ? tr(`Dans ${diff} jours`, `In ${diff} days`)
      : diff === 1 ? tr('Demain', 'Tomorrow')
      : diff === 0 ? tr('Aujourd’hui', 'Today')
      : diff >= -14 ? tr('Nouveau', 'New') : '');
    items.forEach(({ item, diff }) => {
      const tag = $('.news-tag', item);
      const l = label(diff);
      if (tag && l) { tag.textContent = l; tag.hidden = false; }
      item.classList.add(diff >= 0 ? 'is-soon' : 'is-past');
      if (diff < 0 && diff >= -14) item.classList.add('is-new');
    });

    // À la une : le prochain événement (sinon la dernière nouveauté)
    const soon = items.filter(i => i.diff >= 0).sort((a, b) => a.date - b.date);
    const past = items.filter(i => i.diff < 0).sort((a, b) => b.date - a.date);
    const top = soon[0] || past[0];
    const feat = $('[data-news-feature]');
    if (feat && top) {
      const { item, date, diff } = top;
      item.classList.add('is-featured');
      feat.style.setProperty('--brand', item.style.getPropertyValue('--brand'));
      const visuals = (item.dataset.visual || '').split(/\s+/).filter(Boolean).slice(0, 3);
      const vis = document.createElement('div');
      vis.className = `nf-visual${visuals.length > 1 ? ' is-fan' : ''}`;
      vis.setAttribute('aria-hidden', 'true');
      visuals.forEach((src, i) => {
        const k = i - (visuals.length - 1) / 2;   // -1, 0, 1 : gauche, centre, droite
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        if (/\.(png|avif)$/.test(src)) img.className = 'is-cut';
        img.style.cssText = `--x:${k * (vw < 860 ? 70 : 92)}px;--y:${Math.abs(k) * 16}px;--r:${k * 10}deg;--z:${3 - Math.abs(k) * 2};--d:${i * -1.4}s`;
        vis.append(img);
      });
      const when = $('time', item).textContent;
      const body = document.createElement('div');
      const kick = diff > 0 ? tr('Prochainement', 'Up next') : diff === 0 ? tr('Aujourd’hui', 'Today') : tr('Dernière nouveauté', 'Latest news');
      body.innerHTML = `<p class="nf-kicker"></p><h3>${$('h3', item).innerHTML}</h3><p class="nf-text">${$('.news-body > p:not(.news-date)', item).innerHTML}</p>
        <div class="nf-count" hidden><span><b data-n="d">0</b>${tr('jours', 'days')}</span><span><b data-n="h">0</b>${tr('heures', 'hours')}</span><span><b data-n="m">0</b>min</span></div>
        <div class="nf-cta"></div>`;
      $('.nf-kicker', body).textContent = `${kick} · ${when}`;
      const link = $('.link-arrow', item);
      if (link) {
        const btn = link.cloneNode(true);
        btn.className = 'btn btn-light';
        $('.nf-cta', body).append(btn);
      }
      feat.append(vis, ...body.childNodes);
      feat.hidden = false;
      if (diff > 0) {
        const count = $('.nf-count', feat);
        count.hidden = false;
        const pad = n => String(n).padStart(2, '0');
        const tick = () => {
          let s = Math.max(0, Math.floor((date - Date.now()) / 1000));
          $('[data-n="d"]', count).textContent = Math.floor(s / 86400); s %= 86400;
          $('[data-n="h"]', count).textContent = pad(Math.floor(s / 3600)); s %= 3600;
          $('[data-n="m"]', count).textContent = pad(Math.floor(s / 60));
        };
        tick();
        setInterval(tick, 20000);
      }
    }

    // La frise : « À venir » (le plus proche d'abord), puis « Déjà sorti » (le plus récent d'abord)
    const group = text => { const li = document.createElement('li'); li.className = 'news-group'; li.textContent = text; return li; };
    const rest = arr => arr.filter(i => i !== top).map(i => i.item);
    const s = rest(soon), p = rest(past);
    if (s.length) list.append(group(tr('À venir', 'Coming up')), ...s);
    if (p.length) list.append(group(tr('Déjà sorti', 'Already out')), ...p);
    if (top) list.append(top.item);   // gardée dans la liste, cachée (elle est à la une)
  })();

  /* ------------------------------------------------------------------------
     Prochain boss : compte à rebours, puis barre de vie en direct pendant
     la semaine de combat (dégâts lus par le robot du classement)
     ------------------------------------------------------------------------ */
  (function bossCountdown() {
    const box = $('[data-boss-count]');
    if (!box) return;
    const start = new Date(box.dataset.start).getTime();
    const end = new Date(box.dataset.end).getTime();
    const hp = Number(box.dataset.hp) || 0;
    const label = $('.boss-count-label', box);
    const grid = $('.boss-count-grid', box);
    const live = $('.boss-live', box);
    const units = { d: $('[data-u="d"]', box), h: $('[data-u="h"]', box), m: $('[data-u="m"]', box), s: $('[data-u="s"]', box) };
    const pad = n => String(n).padStart(2, '0');
    const set = (el, v) => {
      v = String(v);
      if (el.textContent === v) return;
      el.textContent = v;
      el.classList.remove('flip');
      void el.offsetWidth;
      el.classList.add('flip');
    };
    let phase = '';

    const showHp = () => gameData().then(data => {
      const boss = data && data.boss;
      if (!boss || boss.week !== box.dataset.week || !hp) return;
      const left = Math.max(0, hp - boss.damage);
      live.hidden = false;
      $('.hp-bar span', live).style.setProperty('--hp', (left / hp).toFixed(4));
      $('.hp-text', live).innerHTML = left > 0
        ? tr(`<b>${fmt.format(left)} PV</b> restants · ${fmt.format(boss.damage)} dégâts infligés par tous les joueurs`, `<b>${fmt.format(left)} HP</b> left · ${fmt.format(boss.damage)} damage dealt by all players`)
        : tr('<b>Vaincu !</b> Bravo à tous les joueurs.', '<b>Defeated!</b> Well done, everyone.');
    });

    const tick = () => {
      const now = Date.now();
      const next = now < start ? 'before' : now <= end ? 'live' : 'after';
      if (next !== phase) {
        phase = next;
        label.textContent = phase === 'before' ? tr('Il arrive dans', 'It arrives in')
          : phase === 'live' ? tr('Combat en cours ! Fin dans', 'Fight in progress! Ends in')
          : tr('Le combat est terminé', 'The fight is over');
        grid.hidden = phase === 'after';
        if (phase !== 'before') showHp();
      }
      if (phase === 'after') return;
      let left = Math.max(0, Math.floor(((phase === 'before' ? start : end) - now) / 1000));
      set(units.d, Math.floor(left / 86400)); left %= 86400;
      set(units.h, pad(Math.floor(left / 3600))); left %= 3600;
      set(units.m, pad(Math.floor(left / 60)));
      set(units.s, pad(left % 60));
      setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    tick();
  })();

  /* ------------------------------------------------------------------------
     Mini-jeu « découpe » : entraînement contre le Cadeau Piégé.
     On glisse le doigt (ou clic + glisser) pour trancher les cubes lancés.
     ------------------------------------------------------------------------ */
  (function sliceGame() {
    const game = $('.slice');
    if (!game) return;
    const canvas = $('.slice-canvas', game);
    const ctx = canvas.getContext('2d');
    const dmgEl = $('.slice-dmg', game);
    const timeEl = $('.slice-time', game);
    const bestEl = $('.slice-best', game);
    const title = $('.slice-title', game);
    const text = $('.slice-text', game);
    const startBtn = $('.slice-start', game);
    const hpFill = $('.slice-hp span', game);
    const hpText = $('.slice-hp-text', game);
    const KEY = 'l2k-slice-best';
    const DURATION = 20000;
    const BOSS_HP = 1000;
    // Dégâts de chaque cube (comme dans le jeu) et sa fréquence d'apparition
    const TYPES = { blue: [1, 44], green: [5, 20], purple: [20, 9], gold: [50, 4], red: [-10, 23] };
    const GLOW = { blue: '#2997ff', green: '#30d158', purple: '#bf5af2', gold: '#ffd60a', red: '#ff375f' };
    const FONT = getComputedStyle(root).getPropertyValue('--f-display').trim() || 'sans-serif';
    const imgs = {};
    Object.keys(TYPES).forEach(c => { imgs[c] = new Image(); imgs[c].src = cubeSrc(c); });

    let best = 0;
    try { best = parseInt(localStorage.getItem(KEY) || '0', 10) || 0; } catch { /* stockage indisponible */ }
    bestEl.textContent = fmt.format(best);

    let W = 0, H = 0, dpr = 1;
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    resizeTasks.push(size);

    let playing = false, dmg = 0, t0 = 0, last = 0, nextSpawn = 0, raf = 0;
    let cubes = [], halves = [], sparks = [], texts = [], trail = [];
    let slicing = false, gesture = 0;
    const progress = () => clamp((performance.now() - t0) / DURATION);
    const pick = () => {
      const bonus = progress() * 10;   // un peu plus de bombes au fil du temps
      const list = Object.entries(TYPES).map(([c, [, w]]) => [c, c === 'red' ? w + bonus : w]);
      let r = Math.random() * list.reduce((a, [, w]) => a + w, 0);
      for (const [c, w] of list) { if ((r -= w) <= 0) return c; }
      return 'blue';
    };

    const spawnWave = () => {
      const n = 1 + Math.floor(Math.random() * (1.6 + progress() * 2));
      const g = H * 1.5;
      for (let i = 0; i < n; i++) {
        const s = clamp(W / 8, 52, 80);
        const x = W * (.15 + Math.random() * .7);
        const apex = H * (.18 + Math.random() * .3);
        cubes.push({
          c: pick(), s, x, y: H + s, g,
          vx: (W / 2 - x) * (.15 + Math.random() * .35) + (Math.random() - .5) * W * .12,
          vy: -Math.sqrt(2 * g * (H + s - apex)),
          r: Math.random() * 6, vr: (Math.random() - .5) * 5, alive: true,
        });
      }
    };

    const updateHp = () => {
      const left = Math.max(0, BOSS_HP - dmg);
      hpFill.style.setProperty('--hp', (left / BOSS_HP).toFixed(3));
      hpText.textContent = tr(`${fmt.format(left)} / ${fmt.format(BOSS_HP)} PV`, `${fmt.format(left)} / ${fmt.format(BOSS_HP)} HP`);
      dmgEl.textContent = fmt.format(dmg);
    };

    const hitBoss = () => {
      game.classList.add('is-hit');
      clearTimeout(hitBoss.t);
      hitBoss.t = setTimeout(() => game.classList.remove('is-hit'), 120);
    };

    const slice = cube => {
      cube.alive = false;
      const [value] = TYPES[cube.c];
      for (const side of [-1, 1]) {
        halves.push({ ...cube, side, vx: cube.vx + side * 140, vy: Math.min(cube.vy, 0) - 80, vr: cube.vr + side * 4, life: 1 });
      }
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 220;
        sparks.push({ x: cube.x, y: cube.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, col: GLOW[cube.c] });
      }
      if (value < 0) {
        dmg = Math.max(0, dmg + value);
        texts.push({ x: cube.x, y: cube.y, txt: `${value}`, col: '#ff375f', life: 1 });
        game.classList.remove('is-shake');
        void game.offsetWidth;
        game.classList.add('is-shake');
      } else {
        gesture += 1;
        const mult = gesture >= 2 ? Math.min(7, gesture) : 1;
        const add = value * mult;
        dmg += add;
        texts.push({ x: cube.x, y: cube.y, txt: `+${add}`, col: '#fff', life: 1 });
        if (mult > 1) texts.push({ x: cube.x, y: cube.y - 30, txt: `x${mult}`, col: '#ffd60a', life: 1, big: true });
        hitBoss();
      }
      updateHp();
      if (dmg >= BOSS_HP) end(true);
    };

    // Segment [a, b] : quels cubes touche-t-il ?
    const cut = (a, b) => {
      for (const cube of cubes) {
        if (!cube.alive) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = dx * dx + dy * dy || 1;
        const t = clamp(((cube.x - a.x) * dx + (cube.y - a.y) * dy) / len);
        if (Math.hypot(a.x + t * dx - cube.x, a.y + t * dy - cube.y) < cube.s * .5) slice(cube);
      }
    };

    const point = e => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() };
    };
    canvas.addEventListener('pointerdown', e => {
      if (!playing) return;
      slicing = true;
      gesture = 0;
      trail = [point(e)];
      try { canvas.setPointerCapture(e.pointerId); } catch { /* ignoré */ }
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', e => {
      if (!playing || !slicing) return;
      const p = point(e);
      const prev = trail[trail.length - 1];
      trail.push(p);
      if (prev) cut(prev, p);
    });
    const stop = () => { slicing = false; gesture = 0; };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);

    const draw = (img, x, y, s, r, clip) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r);
      if (clip) { ctx.beginPath(); ctx.rect(clip < 0 ? -s : 0, -s, s, s * 2); ctx.clip(); }
      if (img.complete && img.naturalWidth) ctx.drawImage(img, -s / 2, -s / 2, s, s);
      ctx.restore();
    };

    const frame = now => {
      const dt = Math.min(.05, (now - last) / 1000);
      last = now;
      if (playing) {
        const left = Math.max(0, DURATION - (now - t0));
        timeEl.textContent = Math.ceil(left / 1000);
        if (left <= 0) { end(false); }
        else if (now >= nextSpawn) {
          spawnWave();
          nextSpawn = now + lerp(950, 520, progress());
        }
      }
      ctx.clearRect(0, 0, W, H);
      for (const c of cubes) {
        c.vy += c.g * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.r += c.vr * dt;
        if (c.alive) draw(imgs[c.c], c.x, c.y, c.s, c.r);
      }
      cubes = cubes.filter(c => c.alive && c.y < H + c.s * 2);
      for (const h of halves) {
        h.vy += h.g * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.r += h.vr * dt; h.life -= dt * .9;
        ctx.globalAlpha = clamp(h.life);
        draw(imgs[h.c], h.x, h.y, h.s, h.r, h.side);
      }
      halves = halves.filter(h => h.life > 0 && h.y < H + h.s * 2);
      for (const p of sparks) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt * 2.2;
        ctx.globalAlpha = clamp(p.life);
        ctx.fillStyle = p.col;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
      sparks = sparks.filter(p => p.life > 0);
      ctx.textAlign = 'center';
      for (const t of texts) {
        t.y -= 50 * dt; t.life -= dt * 1.4;
        ctx.globalAlpha = clamp(t.life);
        ctx.font = `800 ${t.big ? 30 : 22}px ${FONT}`;
        ctx.fillStyle = t.col;
        ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 8;
        ctx.fillText(t.txt, t.x, t.y);
        ctx.shadowBlur = 0;
      }
      texts = texts.filter(t => t.life > 0);
      // Traînée lumineuse du geste
      trail = trail.filter(p => now - p.t < 160);
      if (trail.length > 1) {
        ctx.globalAlpha = 1;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#9fd0ff';
        ctx.shadowBlur = 14;
        for (let i = 1; i < trail.length; i++) {
          ctx.lineWidth = 2 + (i / trail.length) * 6;
          ctx.strokeStyle = `rgba(255,255,255,${(i / trail.length).toFixed(2)})`;
          ctx.beginPath();
          ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
          ctx.lineTo(trail[i].x, trail[i].y);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
      if (playing || cubes.length || halves.length || sparks.length || texts.length) raf = requestAnimationFrame(frame);
      else raf = 0;
    };

    const end = won => {
      if (!playing) return;
      playing = false;
      slicing = false;
      cubes.forEach(c => { if (c.alive) { c.alive = false; } });
      const record = dmg > best;
      if (record) {
        best = dmg;
        bestEl.textContent = fmt.format(best);
        try { localStorage.setItem(KEY, String(best)); } catch { /* stockage indisponible */ }
      }
      const secs = Math.max(1, Math.round((performance.now() - t0) / 1000));
      title.textContent = won ? tr('Cadeau détruit !', 'Gift destroyed!') : record ? tr('Nouveau record !', 'New record!') : tr('Temps écoulé !', 'Time’s up!');
      text.textContent = won
        ? tr(`1 000 dégâts en ${secs} secondes. Tu es prêt pour le 4 janvier !`, `1,000 damage in ${secs} seconds. You’re ready for January 4!`)
        : tr(`${fmt.format(dmg)} dégâts. Le vrai Cadeau Piégé a 10 milliards de PV… Rendez-vous le 4 janvier, tous ensemble !`,
             `${fmt.format(dmg)} damage. The real Trapped Gift has 10 billion HP… See you on January 4, all together!`);
      startBtn.textContent = tr('Rejouer', 'Play again');
      setTimeout(() => game.classList.remove('is-playing'), 500);
    };

    const start = () => {
      size();
      cubes = []; halves = []; sparks = []; texts = []; trail = [];
      dmg = 0;
      updateHp();
      game.classList.remove('is-shake');
      game.classList.add('is-playing');
      playing = true;
      t0 = last = performance.now();
      nextSpawn = t0 + 300;
      if (!raf) raf = requestAnimationFrame(frame);
    };
    startBtn.addEventListener('click', start);
    updateHp();
  })();

  /* ------------------------------------------------------------------------
     Pass de saison : onglets. Chaque pass est « en prévente » dès le 21 du
     mois précédent, « en cours » pendant son mois, puis « terminé ». Avant
     sa prévente, il reste mystérieux : un seul skin dévoilé, le reste flouté.
     ------------------------------------------------------------------------ */
  (function seasonPass() {
    const tabs = $$('.pass-tab');
    if (!tabs.length) return;
    const now = new Date();
    const panels = tabs.map(tab => $(`#${tab.getAttribute('aria-controls')}`));
    const states = tabs.map((tab, i) => {
      const [y, m] = tab.dataset.month.split('-').map(Number);
      const start = new Date(y, m - 1, 1), end = new Date(y, m, 1), presale = new Date(y, m - 2, 21);
      const panel = panels[i];
      const status = $('[data-pass-status]', panel);
      let state, label, tag = '';
      if (now >= end) {
        state = 'ended';
        label = tr('Terminé', 'Ended');
      } else if (now >= start) {
        state = 'live';
        const days = Math.ceil((end - now) / DAY);
        label = tr(`En cours · plus que ${days} jour${days > 1 ? 's' : ''}`, `Live now · ${days} day${days > 1 ? 's' : ''} left`);
        tag = tr('En cours', 'Live');
      } else if (now >= presale) {
        state = 'presale';
        label = tr(`En prévente · dès le 1er ${monthName(y, m - 1)}`, `Presale · from ${monthName(y, m - 1)} 1`);
        tag = tr('Prévente', 'Presale');
      } else {
        state = 'secret';
        label = tr(`Mystère · révélé le 21 ${monthName(y, m - 2)}`, `Mystery · revealed on ${monthName(y, m - 2)} 21`);
        tag = tr('Bientôt', 'Soon');
        panel.classList.add('is-secret');
        tab.classList.add('is-secret');
        $$('.pass-track li', panel).forEach((li, k) => {
          if (k === 0) return;
          li.classList.add('is-hidden');
          $('b', li).textContent = '???';
        });
        const hero = $('.pass-hero', panel);
        if (hero) {
          hero.classList.add('is-hidden');
          $('b', hero).textContent = '???';
        }
      }
      status.textContent = label;
      if (tag) {
        const t = document.createElement('span');
        t.className = 'pass-tab-tag';
        t.textContent = tag;
        tab.append(t);
      }
      return state;
    });

    const select = (i, focus) => {
      tabs.forEach((tab, k) => {
        const on = k === i;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        panels[k].classList.toggle('is-active', on);
      });
      if (focus) tabs[i].focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i));
      tab.addEventListener('keydown', e => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        select((i + d + tabs.length) % tabs.length, true);
      });
    });
    // Onglet ouvert au départ : le pass en cours, sinon le prochain, sinon le dernier
    let first = states.indexOf('live');
    if (first < 0) first = states.indexOf('presale');
    if (first < 0) first = states.indexOf('secret');
    select(first < 0 ? tabs.length - 1 : first);
    // Le grand skin de chaque pass et ceux de « à la une » : animés comme dans le jeu
    $$('.pass-skin-xl img, .news-feature img').forEach(animSkin);
    // Liens « Voir le pass » (Quoi de neuf) : ouvrent le bon onglet
    $$('[data-pass-link]').forEach(link => link.addEventListener('click', () => {
      const i = tabs.findIndex(t => t.dataset.month === link.dataset.passLink);
      if (i >= 0) select(i);
    }));
  })();

  /* ------------------------------------------------------------------------
     Accueil : vitrine Don't Tap Red (prochain boss, pass du mois, top 3)
     ------------------------------------------------------------------------ */
  (function dtrShow() {
    const pad = n => String(n).padStart(2, '0');
    const count = $('[data-mini-count]');
    if (count) {
      const start = new Date(count.dataset.start).getTime();
      const end = new Date(count.dataset.end).getTime();
      const tick = () => {
        const now = Date.now();
        if (now < start) {
          let s = Math.floor((start - now) / 1000);
          const d = Math.floor(s / 86400); s %= 86400;
          const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
          count.innerHTML = tr(`Dans <b>${d}</b> j <b>${pad(h)}</b> h <b>${pad(m)}</b> min`, `In <b>${d}</b>d <b>${pad(h)}</b>h <b>${pad(m)}</b>m`);
        } else if (now <= end) {
          count.textContent = tr('Combat en cours ! Viens le frapper.', 'Fight in progress! Come and hit it.');
        } else {
          count.textContent = tr('Le combat est terminé.', 'The fight is over.');
        }
      };
      tick();
      setInterval(tick, 30000);
    }

    // Pass du mois : celui du mois en cours (sinon le prochain), avec son skin animé
    const tile = $('[data-potm]');
    if (tile) {
      const items = $$('.potm', tile);
      const now = new Date();
      const key = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
      const cur = items.find(i => i.dataset.month === key) || items.find(i => i.dataset.month > key) || items[items.length - 1];
      items.forEach(i => { i.hidden = i !== cur; });
      tile.style.setProperty('--brand', cur.dataset.color);
      const [y, m] = cur.dataset.month.split('-').map(Number);
      const startM = new Date(y, m - 1, 1), endM = new Date(y, m, 1);
      const status = $('[data-potm-status]', tile);
      if (now >= startM && now < endM) {
        const days = Math.ceil((endM - now) / DAY);
        let txt = tr(`En cours · plus que ${days} jour${days > 1 ? 's' : ''}`, `Live now · ${days} day${days > 1 ? 's' : ''} left`);
        const next = items[items.indexOf(cur) + 1];
        if (next && now.getDate() >= 21) txt += tr(` · ${$('b', next).textContent} en prévente`, ` · ${$('b', next).textContent} on presale`);
        status.textContent = txt;
      } else if (now < startM) {
        status.textContent = tr(`Dès le 1er ${monthName(y, m - 1)}`, `From ${monthName(y, m - 1)} 1`);
      }
      animSkin($('img', cur));
    }

    // Top 3 mondial en Arcade
    const top = $('[data-top3]');
    if (top) {
      gameData().then(d => {
        const list = d && d.modes && d.modes.arcade && d.modes.arcade.all;
        if (!list || !list.length) return;
        top.innerHTML = '';
        list.slice(0, 3).forEach((r, i) => {
          const li = document.createElement('li');
          li.innerHTML = `<span class="rank r${i + 1}">${i + 1}</span><span class="mini-name"></span><span class="mini-score"></span>`;
          $('.mini-name', li).textContent = r.name;
          $('.mini-score', li).textContent = fmt.format(r.score);
          top.append(li);
        });
      });
    }
  })();

  /* ------------------------------------------------------------------------
     Page du jeu : le sommaire collant suit la section affichée
     ------------------------------------------------------------------------ */
  (function subnav() {
    const bar = $('.subnav-bar');
    if (!bar) return;
    const links = $$('a[href^="#"]', bar);
    const byId = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const link = byId.get(entry.target.id);
        links.forEach(l => l.classList.toggle('is-active', l === link));
        if (link && bar.scrollWidth > bar.clientWidth) {
          bar.scrollTo({ left: link.offsetLeft - (bar.clientWidth - link.offsetWidth) / 2, behavior: reduced ? 'auto' : 'smooth' });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    byId.forEach((link, id) => { const section = document.getElementById(id); if (section) io.observe(section); });
  })();

  /* ------------------------------------------------------------------------
     Classement en direct (top 10 par mode, de toujours ou de la semaine)
     ------------------------------------------------------------------------ */
  (function liveRanking() {
    const box = $('[data-rank]');
    if (!box) return;
    const list = $('.rank-list', box);
    const podium = $('[data-podium]', box);
    const foot = $('[data-rank-foot]', box);
    const CROWN = '<svg class="pod-crown" viewBox="0 0 40 28" aria-hidden="true"><path fill="currentColor" d="M2 8l9 7 9-13 9 13 9-7-4 18H6z"/></svg>';
    const lvlText = r => (r.prestige ? `P${r.prestige} · ` : '') + tr(`Niv. ${r.level}`, `Lv. ${r.level}`);
    const modeBtns = $$('[data-mode]', box);
    const periodBtns = $$('[data-period]', box);
    const NAMES = { arcade: 'Arcade', rain: 'Rain', chrono: 'Chrono', fusion: 'Fusion' };
    let data = null, mode = 'arcade', period = 'all';

    const empty = msg => {
      podium.innerHTML = '';
      list.innerHTML = '';
      const li = document.createElement('li');
      li.className = 'rank-empty';
      li.textContent = msg;
      list.append(li);
    };
    const render = () => {
      modeBtns.forEach(b => b.setAttribute('aria-selected', String(b.dataset.mode === mode)));
      periodBtns.forEach(b => b.setAttribute('aria-selected', String(b.dataset.period === period)));
      if (!data) return;
      const rows = (data.modes[mode] || {})[period] || [];
      if (!rows.length) {
        empty(period === 'week'
          ? tr(`Personne n’a encore joué en ${NAMES[mode]} cette semaine. La 1re place t’attend !`, `Nobody has played ${NAMES[mode]} yet this week. First place is waiting for you!`)
          : tr('Pas encore de score dans ce mode.', 'No scores in this mode yet.'));
        return;
      }
      list.innerHTML = '';
      podium.innerHTML = '';
      // Podium : 2e, 1er, 3e (le 1er au milieu, plus haut)
      [1, 0, 2].forEach((i, k) => {
        const r = rows[i];
        if (!r) { podium.append(document.createElement('span')); return; }
        const pod = document.createElement('div');
        pod.className = `pod pod-${i + 1}`;
        pod.style.setProperty('--d', `${k * 90}ms`);
        pod.innerHTML = `${i === 0 ? CROWN : ''}<span class="pod-medal">${i + 1}</span><span class="pod-name"></span><span class="pod-lvl"></span><span class="pod-score"></span><span class="pod-step"></span>`;
        $('.pod-name', pod).textContent = r.name;
        $('.pod-lvl', pod).textContent = lvlText(r);
        countUp($('.pod-score', pod), r.score, 1200);
        podium.append(pod);
      });
      list.start = 4;
      rows.slice(3).forEach((r, k) => {
        const i = k + 3;
        const li = document.createElement('li');
        li.className = 'rank-row';
        li.style.setProperty('--i', k);
        const rank = document.createElement('span');
        rank.className = 'rank';
        rank.textContent = i + 1;
        const name = document.createElement('span');
        name.className = 'rank-name';
        name.textContent = r.name;
        const lvl = document.createElement('span');
        lvl.className = `rank-lvl${r.prestige ? ' is-prestige' : ''}`;
        lvl.textContent = lvlText(r);
        const score = document.createElement('span');
        score.className = 'rank-score';
        score.textContent = fmt.format(r.score);
        li.append(rank, name, lvl, score);
        list.append(li);
      });
    };
    modeBtns.forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; render(); }));
    periodBtns.forEach(b => b.addEventListener('click', () => { period = b.dataset.period; render(); }));
    gameData().then(d => {
      if (!d || !d.modes) { empty(tr('Le classement n’est pas disponible pour le moment.', 'The leaderboard isn’t available right now.')); return; }
      data = d;
      if (d.updated) foot.textContent = tr(`Lu dans le jeu toutes les heures · dernier changement ${ago(d.updated)}`, `Read from the game every hour · last change ${ago(d.updated)}`);
      render();
    });
  })();

  /* ------------------------------------------------------------------------
     Noël (1er décembre → 2 janvier, ou ?noel dans l'adresse pour tester) :
     neige, cubes de Noël et petit bandeau
     ------------------------------------------------------------------------ */
  (function christmas() {
    if (!NOEL) return;
    root.classList.add('is-noel');
    const now = new Date();
    const inGame = (now.getMonth() === 11 && now.getDate() >= 20) || now.getMonth() === 0;

    // Petit bandeau (fermé = caché jusqu'au lendemain)
    const today = now.toDateString();
    let closed = '';
    try { closed = localStorage.getItem('l2k-noel-bar') || ''; } catch { /* stockage indisponible */ }
    if (closed !== today) {
      const bar = document.createElement('div');
      bar.className = 'noel-bar';
      bar.setAttribute('role', 'status');
      const boss = EN ? '/dont-tap-red/en/#boss' : '/dont-tap-red/#boss';
      const msg = document.createElement('span');
      msg.textContent = inGame
        ? tr('🎄 C’est Noël dans Don’t Tap Red ! ', '🎄 It’s Christmas in Don’t Tap Red! ')
        : tr('🎄 La saison de Noël arrive dans le jeu le 20 décembre. ', '🎄 Christmas comes to the game on December 20. ');
      const link = document.createElement('a');
      link.href = boss;
      link.textContent = tr('Le boss du 4 janvier', 'The January 4 boss');
      msg.append(link);
      const close = document.createElement('button');
      close.type = 'button';
      close.setAttribute('aria-label', tr('Fermer', 'Close'));
      close.textContent = '×';
      close.addEventListener('click', () => {
        bar.remove();
        try { localStorage.setItem('l2k-noel-bar', today); } catch { /* stockage indisponible */ }
      });
      bar.append(msg, close);
      document.body.append(bar);
    }

    // Neige légère (pas d'animation si l'appareil demande moins de mouvement)
    if (reduced) return;
    const c = document.createElement('canvas');
    c.className = 'snow';
    c.setAttribute('aria-hidden', 'true');
    document.body.append(c);
    const g = c.getContext('2d');
    let w = 0, h = 0, flakes = [];
    const fit = () => {
      w = c.width = innerWidth;
      h = c.height = innerHeight;
      const n = Math.round(clamp(w / 18, 30, 80));
      flakes = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, r: .8 + Math.random() * 2.2, v: 18 + Math.random() * 40, s: Math.random() * 6, a: .35 + Math.random() * .5 }));
    };
    fit();
    resizeTasks.push(fit);
    let lastT = performance.now();
    const fall = t => {
      const dt = Math.min(.05, (t - lastT) / 1000);
      lastT = t;
      g.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.y += f.v * dt;
        f.s += dt;
        const x = f.x + Math.sin(f.s) * 14;
        if (f.y > h + 4) { f.y = -4; f.x = Math.random() * w; }
        g.globalAlpha = f.a;
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(x, f.y, f.r, 0, Math.PI * 2);
        g.fill();
      }
      requestAnimationFrame(fall);
    };
    requestAnimationFrame(fall);
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
