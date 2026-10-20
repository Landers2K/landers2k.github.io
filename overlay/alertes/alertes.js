/* ==========================================================================
   Alertes Don't Tap Red pour OBS, déclenchées par Streamlabs (Socket API).
   Chaque alerte reprend un cube du jeu et ses points :
     follow → cube bleu +1 · bits → vert +5 · abonnement → violet +21 à +40
     don → étoile dorée +100 · raid → pluie de cubes (mode Rain)
   Les sons sont synthétisés en direct (Web Audio) : aucun fichier audio.
   Une alerte à la fois : les suivantes attendent leur tour.
   ========================================================================== */
(() => {
  'use strict';

  const W = 2560;
  const H = 1440;
  const params = new URLSearchParams(location.search);
  const stage = document.querySelector('.stage');
  const layer = document.querySelector('.alerts');
  const rnd = n => Math.floor(Math.random() * n);
  const fit = () => { stage.style.transform = `scale(${Math.min(innerWidth / W, innerHeight / H)})`; };
  addEventListener('resize', fit);
  fit();

  /* ---------------------------------------------------------------- Sons */
  const VOLUME = Math.min(1, Math.max(0, parseFloat(params.get('volume') ?? '0.5')));
  let audio = null;
  const ctx = () => {
    if (!audio) {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      audio.master = audio.createGain();
      audio.master.gain.value = VOLUME;
      audio.master.connect(audio.destination);
    }
    if (audio.state === 'suspended') audio.resume();
    return audio;
  };
  // Une note : fréquence, départ (s), durée (s), forme d'onde, volume
  const note = (f, at, dur, type = 'triangle', vol = .5, slideTo = 0) => {
    const a = ctx();
    const t = a.currentTime + at;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + .012);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(a.master);
    o.start(t);
    o.stop(t + dur + .05);
  };
  // Un bruit filtré (claquement, souffle, tambour)
  const noise = (at, dur, freq = 1500, vol = .4, q = 1) => {
    const a = ctx();
    const t = a.currentTime + at;
    const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = a.createBufferSource();
    src.buffer = buf;
    const bp = a.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = q;
    const g = a.createGain();
    g.gain.value = vol;
    src.connect(bp).connect(g).connect(a.master);
    src.start(t);
  };
  // Le « pop » du cube tapé, commun à toutes les alertes
  const pop = at => { noise(at, .08, 1800, .5, 1.2); note(520, at, .12, 'sine', .45, 1250); };
  const SOUNDS = {
    follow() {          // deux notes claires qui montent
      pop(1);
      note(1318.5, 1.1, .16, 'triangle', .35);
      note(1760, 1.24, .32, 'triangle', .35);
    },
    bits() {            // petites notes rapides, façon pièces de jeu
      pop(1);
      [1046.5, 1318.5, 1568, 2093].forEach((f, i) => note(f, 1.08 + i * .07, .12, 'square', .12));
    },
    sub() {             // accord majeur arpégé qui reste en l'air
      pop(1);
      [523.3, 659.3, 784, 1046.5].forEach((f, i) => {
        note(f, 1.08 + i * .09, .9, 'sine', .28);
        note(f * 1.005, 1.08 + i * .09, .9, 'triangle', .1);
      });
    },
    donation() {        // « ka-ching » puis des étincelles
      pop(1);
      note(987.8, 1.08, .09, 'square', .22);
      note(1318.5, 1.17, .5, 'square', .22);
      [2093, 2637, 3136, 4186].forEach((f, i) => note(f, 1.4 + i * .06, .3, 'sine', .12));
    },
    raid() {            // roulement de tambour puis fanfare
      for (let i = 0; i < 14; i++) noise(.05 + i * .055 - i * i * .0012, .09, 180, .55, .7);
      [392, 523.3, 659.3, 784].forEach((f, i) => note(f, .8 + i * .13, i === 3 ? .9 : .2, 'sawtooth', .13));
      [392, 523.3, 659.3, 784].forEach((f, i) => note(f / 2, .8 + i * .13, i === 3 ? .9 : .2, 'triangle', .2));
    },
  };
  const play = kind => { try { SOUNDS[kind](); } catch { /* son indisponible : l'alerte s'affiche quand même */ } };

  /* ---------------------------------------------------------------- Alertes */
  const special = () => 21 + rnd(20);
  const TYPES = {
    follow: { cube: 'blue', c: '#2997ff', ink: '#5ab0ff', pts: () => '+1', kicker: 'Nouveau follow', time: 6500 },
    bits: { cube: 'green', c: '#30d158', ink: '#30d158', pts: () => '+5', kicker: 'Bits', time: 7000 },
    sub: { cube: 'purple', c: '#bf5af2', ink: '#d68cff', pts: () => `+${special()}`, kicker: 'Nouvel abonné', time: 7500 },
    donation: { cube: 'gold', c: '#ffd60a', ink: '#ffd60a', pts: () => '+100', kicker: 'Don', time: 8000 },
    raid: { cube: 'red', c: '#ff375f', ink: '#ff6b8a', pts: () => 'RAID !', kicker: 'Raid', time: 9000 },
  };

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const fmtNum = n => new Intl.NumberFormat('fr-FR').format(n);

  const build = (kind, d) => {
    const t = TYPES[kind];
    const box = el('div', 'alert');
    box.style.setProperty('--c', t.c);
    box.style.setProperty('--ink', t.ink);

    const cube = el('div', 'a-cube');
    cube.innerHTML = `<img src="/assets/img/cube-${t.cube}.webp" alt="">`;
    const ring = el('i', 'a-ring');
    box.append(cube, ring);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + Math.random() * .3;
      const dist = 220 + Math.random() * 180;
      const bit = el('i', 'a-bit');
      bit.style.cssText = `--w:${22 + rnd(22)}px;--dx:${(Math.cos(a) * dist).toFixed(0)}px;--dy:${(Math.sin(a) * dist).toFixed(0)}px;margin:-15px 0 0 -15px`;
      box.append(bit);
    }
    box.append(el('span', 'a-pts', t.pts()));

    // Carte : titre, pseudo, détail et message éventuel
    const card = el('div', 'a-card');
    let kicker = t.kicker;
    const detail = el('p', 'a-detail');
    if (kind === 'follow') detail.textContent = 'Bienvenue dans la team !';
    if (kind === 'bits') detail.append(el('b', '', `${fmtNum(d.amount || 0)} bits`), ' · merci !');
    if (kind === 'donation') detail.append(el('b', '', d.amount || ''), ' · merci pour le soutien !');
    if (kind === 'raid') detail.append('débarque avec ', el('b', '', `${fmtNum(d.raiders || 0)} viewer${d.raiders > 1 ? 's' : ''}`), ' !');
    if (kind === 'sub') {
      if (d.gifter) { kicker = 'Abonnement offert'; detail.append('offert par ', el('b', '', d.gifter)); }
      else if (d.months > 1) { kicker = 'Réabonnement'; detail.append('abonné depuis ', el('b', '', `${d.months} mois`), ' !'); }
      else detail.textContent = 'Merci pour l’abonnement !';
    }
    card.append(el('p', 'a-kicker', kicker), el('p', 'a-name', d.name || 'Quelqu’un'), detail);
    if (d.message) card.append(el('p', 'a-msg', `« ${String(d.message).slice(0, 180)} »`));
    box.append(card);

    // Raid : pluie de cubes sur tout l'écran
    if (kind === 'raid') {
      const colors = ['blue', 'blue', 'green', 'purple', 'gold', 'orange', 'red'];
      for (let i = 0; i < 46; i++) {
        const r = el('div', 'a-rain');
        const s = 70 + rnd(120);
        r.style.cssText = `--x:${rnd(W - s)}px;--s:${s}px;--t:${(1.6 + Math.random() * 1.8).toFixed(2)}s;--d:${(Math.random() * 4.5).toFixed(2)}s;--r:${rnd(720) - 360}deg`;
        r.innerHTML = `<img src="/assets/img/cube-${colors[rnd(colors.length)]}.webp" alt="">`;
        box.append(r);
      }
    }
    return box;
  };

  const queue = [];
  let busy = false;
  const next = () => {
    if (busy || !queue.length) return;
    busy = true;
    const [kind, d] = queue.shift();
    const box = build(kind, d);
    layer.append(box);
    play(kind);
    const time = TYPES[kind].time + (d.message ? 1500 : 0);
    setTimeout(() => box.classList.add('is-out'), time);
    setTimeout(() => { box.remove(); busy = false; setTimeout(next, 400); }, time + 650);
  };
  const show = (kind, d) => { queue.push([kind, d]); next(); };

  /* ---------------------------------------------------------------- Streamlabs */
  const seen = new Set();
  const handle = e => {
    if (!e || !e.message) return;
    const list = Array.isArray(e.message) ? e.message : [e.message];
    for (const m of list) {
      const id = m._id || m.id || m.event_id;
      if (id) { if (seen.has(id)) continue; seen.add(id); }
      const name = m.display_name || m.name || m.from;
      if (e.type === 'follow' && e.for === 'twitch_account') show('follow', { name });
      else if ((e.type === 'subscription' || e.type === 'resub') && e.for === 'twitch_account') {
        show('sub', { name, months: Number(m.months) || 1, gifter: m.gifter_display_name || m.gifter || '', message: m.message });
      } else if (e.type === 'donation') {
        show('donation', { name, amount: m.formatted_amount || `${m.amount} ${m.currency || ''}`.trim(), message: m.message });
      } else if (e.type === 'bits') show('bits', { name, amount: Number(m.amount) || 0, message: m.message });
      else if (e.type === 'raid' && e.for === 'twitch_account') show('raid', { name, raiders: Number(m.raiders) || 0 });
    }
  };
  const token = new URLSearchParams(location.hash.slice(1)).get('token');
  if (token) {
    const lib = document.createElement('script');
    lib.src = 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.3.0/socket.io.js';
    lib.onload = () => {
      const socket = window.io(`https://sockets.streamlabs.com?token=${encodeURIComponent(token)}`, { transports: ['websocket'] });
      socket.on('event', handle);
    };
    document.head.append(lib);
  }

  /* ---------------------------------------------------------------- Aperçu (?demo) */
  if (params.has('demo')) {
    const DEMO = [
      ['follow', { name: 'CubeBleu42' }],
      ['bits', { name: 'ViewerVert', amount: 500, message: 'GG pour le live !' }],
      ['sub', { name: 'DontTapRedFan', months: 3 }],
      ['donation', { name: 'LaBatataShow', amount: '5,00 €', message: 'Pour la Key Light !' }],
      ['raid', { name: 'StreameurAmi', raiders: 42 }],
    ];
    const loop = () => { DEMO.forEach(([k, d]) => show(k, d)); setTimeout(loop, 42000); };
    loop();
    // Dans un navigateur, le son ne peut démarrer qu'après un clic (dans OBS, il démarre tout seul)
    if (!window.obsstudio) {
      const hint = el('p', 'sound-hint', '🔊 Clique n’importe où pour activer le son');
      stage.append(hint);
      addEventListener('pointerdown', () => { ctx(); hint.remove(); }, { once: true });
    }
  }
})();
