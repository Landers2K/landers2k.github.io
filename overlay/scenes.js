/* ==========================================================================
   Scènes de live Landers2K (OBS) : les cubes de Don't Tap Red apparaissent,
   se font taper avec leur score au-dessus, puis disparaissent. Les rouges
   s'énervent et repartent sans être touchés. Mêmes points que le mode Arcade.
   ========================================================================== */
(() => {
  'use strict';

  const W = 2560;
  const H = 1440;
  const params = new URLSearchParams(location.search);
  const $ = s => document.querySelector(s);
  const stage = $('.stage');
  const chatScene = document.body.classList.contains('chat-scene');
  const rnd = n => Math.floor(Math.random() * n);
  const pad = n => String(n).padStart(2, '0');
  const fmt = new Intl.NumberFormat('fr-FR');

  // La scène est dessinée en 2560 × 1440 : on l'adapte à la taille de la source OBS
  const fit = () => { stage.style.transform = `scale(${Math.min(innerWidth / W, innerHeight / H)})`; };
  addEventListener('resize', fit);
  fit();

  /* ---------------------------------------------------------------- Réseaux, site et jeu */
  const ICONS = {
    twitch: 'M11.57 4.71h1.72v5.15h-1.72zm4.72 0H18v5.15h-1.71zM6 0 1.71 4.29v15.42h5.15V24l4.28-4.29h3.43L22.29 12V0zm14.57 11.14-3.43 3.43h-3.43l-3 3v-3H6.86V1.71h13.71z',
    youtube: 'M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.87.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z',
    tiktok: 'M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  };
  const SOCIALS = [
    ['twitch', '#9146ff', 'Twitch', 'Landers2K'],
    ['youtube', '#ff0033', 'YouTube', 'xLanders2K'],
    ['tiktok', '#fe2c55', 'TikTok', 'Landers2K'],
  ];
  const socials = $('[data-socials]');
  if (socials) {
    socials.innerHTML = SOCIALS.map(([icon, brand, name, handle]) =>
      `<div class="social"><i style="--brand:${brand}"><svg viewBox="0 0 24 24"><path d="${ICONS[icon]}"/></svg></i><span><small>${name}</small><b>${handle}</b></span></div>`).join('');
  }
  const bottom = $('[data-bottom]');
  if (bottom) {
    bottom.innerHTML = '<div class="pill">🌐 <span class="grad">landers2k.com</span></div>'
      + '<div class="pill"><img src="/assets/img/dtr-icon.jpg" alt="">Don’t Tap <span class="red">Red</span>&nbsp;·&nbsp;dispo sur iPhone et Android</div>';
  }

  /* ---------------------------------------------------------------- Chronos */
  const startedAt = Date.now();
  const clock = s => `${s >= 3600 ? Math.floor(s / 3600) + ':' : ''}${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
  const start = $('[data-start]');        // scène COMMENCE : « dans 04:59 » si l'URL contient ?min=5
  const since = $('[data-since]');        // scène PAUSE : « en pause depuis 01:23 »
  const minutes = parseFloat(params.get('min'));
  if (start && !minutes) start.innerHTML = 'dans quelques instants<span class="dots"></span>';
  const tick = () => {
    const now = Date.now();
    if (start && minutes) {
      const left = Math.round(minutes * 60 - (now - startedAt) / 1000);
      start.innerHTML = left > 0 ? `dans <b>${clock(left)}</b>` : 'c’est parti&nbsp;!';
    }
    if (since) since.textContent = clock(Math.floor((now - startedAt) / 1000));
  };
  tick();
  setInterval(tick, 1000);

  /* ---------------------------------------------------------------- Derniers évènements (scène CHAT)
     Remplis en direct par Streamlabs : dans OBS, ajouter #token=JETON à la fin de l'adresse, avec le
     « Jeton API Socket » de Streamlabs (Paramètres › Paramètres de l'API › Jetons API). Placé après le #,
     le jeton reste dans OBS : il n'est jamais envoyé au site. Les derniers noms sont gardés d'un live à l'autre.
     ?demo affiche des exemples, sans rien enregistrer. */
  const slots = [...document.querySelectorAll('[data-last]')];
  if (slots.length) {
    const store = {
      get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
      set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } },
    };
    const show = (kind, name, detail, fresh, keep = true) => {
      const el = slots.find(s => s.dataset.last === kind);
      if (!el || !name) return;
      const b = document.createElement('b');
      b.textContent = name;
      el.replaceChildren(b);
      if (detail) el.append(Object.assign(document.createElement('span'), { textContent: detail }));
      if (!fresh) return;
      el.classList.remove('is-new');
      void el.offsetWidth;
      el.classList.add('is-new');
      if (keep) store.set(`l2k-last-${kind}`, [name, detail]);
    };
    for (const el of slots) {
      const last = store.get(`l2k-last-${el.dataset.last}`);
      if (last) show(el.dataset.last, last[0], last[1], false);
    }
    // Évènement Streamlabs : { type, for, message: [{ name, formatted_amount, months… }] }
    const handle = (e, keep = true) => {
      const m = Array.isArray(e.message) ? e.message[0] : e.message;
      if (!m || !m.name) return;
      if (e.type === 'donation') {
        show('donation', m.name, m.formatted_amount || (m.amount ? `${m.amount} ${m.currency || ''}`.trim() : ''), true, keep);
      } else if (e.type === 'follow' && e.for === 'twitch_account') {
        show('follow', m.name, '', true, keep);
      } else if ((e.type === 'subscription' || e.type === 'resub') && e.for === 'twitch_account') {
        show('subscription', m.name, m.months > 1 ? `${m.months} mois` : '', true, keep);
      }
    };
    const token = new URLSearchParams(location.hash.slice(1)).get('token');
    if (token) {
      const lib = document.createElement('script');
      lib.src = 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.3.0/socket.io.js';
      lib.onload = () => {
        const socket = window.io(`https://sockets.streamlabs.com?token=${encodeURIComponent(token)}`, { transports: ['websocket'] });
        socket.on('event', e => handle(e));
      };
      document.head.append(lib);
    }
    if (params.has('demo')) {
      const demo = [
        { type: 'follow', for: 'twitch_account', message: [{ name: 'CubeBleu42' }] },
        { type: 'donation', for: 'streamlabs', message: [{ name: 'LaBatataShow', formatted_amount: '5,00 €' }] },
        { type: 'subscription', for: 'twitch_account', message: [{ name: 'DontTapRedFan', months: 3 }] },
      ];
      demo.forEach((e, i) => setTimeout(() => handle(e, false), 800 + i * 700));
    }
  }

  /* ---------------------------------------------------------------- Chat Twitch (scène CHAT)
     Lu en direct sur le chat public de la chaîne, en anonyme : aucun jeton nécessaire.
     Les messages restent affichés ; les bots et les commandes « ! » sont masqués ; un message
     supprimé par un modérateur (ou un utilisateur banni) disparaît aussi de l'écran. */
  const chatLog = $('[data-chat]');
  if (chatLog) {
    const CHANNEL = chatLog.dataset.chat;
    // Historique : les derniers messages sont gardés dans OBS et réaffichés après une actualisation
    const HISTORY = 'l2k-chat-history';
    const KEEP = 30;
    const MAX_AGE = 12 * 3600e3;   // au-delà de 12 h, on repart d'un chat vide (nouveau live)
    const history = {
      read() {
        try { return (JSON.parse(localStorage.getItem(HISTORY)) || []).filter(h => Date.now() - h.t < MAX_AGE); } catch { return []; }
      },
      write(list) { try { localStorage.setItem(HISTORY, JSON.stringify(list.slice(-KEEP))); } catch { /* stockage indisponible */ } },
      add(entry) {
        const list = this.read();
        if (entry.tags.id && list.some(h => h.tags.id === entry.tags.id)) return;   // déjà reçu par une autre scène
        list.push(entry);
        this.write(list);
      },
      remove(test) { this.write(this.read().filter(h => !test(h))); },
    };
    const BOTS = new Set(['nightbot', 'streamelements', 'streamlabs', 'moobot', 'fossabot', 'wizebot', 'sery_bot', 'botrixoficial', 'soundalerts']);
    const MAX = 40;
    const PALETTE = ['#5ab0ff', '#d68cff', '#ff6b8a', '#30d158', '#ffd60a', '#ff9f0a', '#64d2ff'];
    const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    // Couleur du pseudo : celle choisie sur Twitch, éclaircie si elle est trop sombre pour le fond nuit
    const nameColor = (hex, login) => {
      const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
      if (!m) return PALETTE[[...login].reduce((n, ch) => n + ch.charCodeAt(0), 0) % PALETTE.length];
      const [r, g, b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return lum < 0.45 ? `color-mix(in srgb, #${m[1]} 55%, #fff)` : `#${m[1]}`;
    };
    // Émoticônes Twitch : « 25:0-4,12-16/1902:6-10 » (positions en caractères)
    const withEmotes = (text, emotes) => {
      const chars = [...text];
      const marks = [];
      for (const part of (emotes || '').split('/').filter(Boolean)) {
        const [id, ranges] = part.split(':');
        for (const r of ranges.split(',')) {
          const [a, b] = r.split('-').map(Number);
          marks.push([a, b, id]);
        }
      }
      marks.sort((x, y) => x[0] - y[0]);
      let html = '';
      let at = 0;
      for (const [a, b, id] of marks) {
        html += esc(chars.slice(at, a).join(''));
        html += `<img class="emote" src="https://static-cdn.jtvnw.net/emoticons/v2/${encodeURIComponent(id)}/default/dark/2.0" alt="${esc(chars.slice(a, b + 1).join(''))}">`;
        at = b + 1;
      }
      return html + esc(chars.slice(at).join(''));
    };
    const ROLES = [['broadcaster', 'Streamer', '#ff375f'], ['moderator', 'Modo', '#30d158'], ['vip', 'VIP', '#ff6b8a'], ['subscriber', 'Abonné', '#bf5af2']];
    const parseTags = raw => Object.fromEntries(raw.slice(1).split(';').map(kv => {
      const i = kv.indexOf('=');
      return [kv.slice(0, i), kv.slice(i + 1).replace(/\\s/g, ' ').replace(/\\:/g, ';').replace(/\\\\/g, '\\')];
    }));
    const addMessage = (tags, login, text, { old = false, keep = true } = {}) => {
      if (BOTS.has(login) || text.startsWith('!')) return;
      if (!old && keep) {
        const { id, color, emotes, badges } = tags;
        history.add({ t: Date.now(), login, text, tags: { id, color, emotes, badges, 'display-name': tags['display-name'], 'user-id': tags['user-id'] } });
      }
      let action = false;
      if (text.startsWith('\u0001ACTION ') && text.endsWith('\u0001')) { text = text.slice(8, -1); action = true; }
      const badges = (tags.badges || '').split(',').map(b => b.split('/')[0]);
      const roles = ROLES.filter(([key]) => badges.includes(key))
        .map(([, label, c]) => `<i style="--c:${c}">${label}</i>`).join('');
      const color = nameColor(tags.color, login);
      const el = document.createElement('div');
      el.className = 'chat-msg' + (action ? ' is-action' : '') + (old ? ' is-old' : '');
      el.dataset.id = tags.id || '';
      el.dataset.user = tags['user-id'] || login;
      el.style.setProperty('--name', color);
      el.innerHTML = `<p class="chat-who"><b>${esc(tags['display-name'] || login)}</b>${roles}</p><p class="chat-text">${withEmotes(text, tags.emotes)}</p>`;
      chatLog.append(el);
      while (chatLog.children.length > MAX) chatLog.firstElementChild.remove();
    };
    const handleLine = (line, keep = true) => {
      const m = /^(@\S+ )?:(\w+)!\S+ PRIVMSG #\S+ :(.*)$/.exec(line);
      if (m) return addMessage(m[1] ? parseTags(m[1].trim()) : {}, m[2].toLowerCase(), m[3], { keep });
      const del = /^(@\S+ )?:tmi\.twitch\.tv CLEARMSG #\S+ :/.exec(line);
      if (del && del[1]) {
        const id = parseTags(del[1].trim())['target-msg-id'];
        chatLog.querySelector(`[data-id="${CSS.escape(id || '')}"]`)?.remove();
        history.remove(h => h.tags.id === id);
        return;
      }
      const clear = /^(@\S+ )?:tmi\.twitch\.tv CLEARCHAT #\S+(?: :(\S+))?$/.exec(line);
      if (clear) {
        const user = clear[1] && parseTags(clear[1].trim())['target-user-id'];
        if (!clear[2]) { chatLog.replaceChildren(); history.write([]); }
        else if (user) {
          chatLog.querySelectorAll(`[data-user="${CSS.escape(user)}"]`).forEach(e => e.remove());
          history.remove(h => h.tags['user-id'] === user);
        }
      }
    };
    for (const h of history.read()) addMessage(h.tags, h.login, h.text, { old: true });
    let retry = 1000;
    const connect = () => {
      const irc = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
      irc.onopen = () => {
        retry = 1000;
        irc.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
        irc.send('PASS SCHMOOPIIE');
        irc.send(`NICK justinfan${10000 + rnd(80000)}`);   // connexion anonyme, en lecture seule
        irc.send(`JOIN #${CHANNEL}`);
      };
      irc.onmessage = e => {
        for (const line of String(e.data).split('\r\n')) {
          if (!line) continue;
          if (line.startsWith('PING')) irc.send('PONG :tmi.twitch.tv');
          else handleLine(line);
        }
      };
      irc.onclose = () => { setTimeout(connect, retry); retry = Math.min(retry * 2, 30000); };
    };
    connect();
    if (params.has('demo')) {
      [
        '@badges=subscriber/6;color=#1E90FF;display-name=CubeBleu42;emotes=;id=a1;user-id=1 :cubebleu42!cubebleu42@cubebleu42.tmi.twitch.tv PRIVMSG #landers2k :salut le boss ! 🔥',
        '@badges=moderator/1;color=#00FF7F;display-name=ModoDuLive;emotes=;id=a2;user-id=2 :mododulive!mododulive@mododulive.tmi.twitch.tv PRIVMSG #landers2k :Bienvenue à tous, soyez sympas 😄',
        '@badges=;color=;display-name=Viewer_Mystere;emotes=25:13-17;id=a3;user-id=3 :viewer_mystere!viewer_mystere@viewer_mystere.tmi.twitch.tv PRIVMSG #landers2k :trop hâte de Kappa jouer à Don\'t Tap Red',
        '@badges=;color=#8A2BE2;display-name=Nightbot;emotes=;id=a4;user-id=4 :nightbot!nightbot@nightbot.tmi.twitch.tv PRIVMSG #landers2k :message de bot, masqué',
        '@badges=broadcaster/1;color=#FF4500;display-name=Landers2K;emotes=;id=a5;user-id=5 :landers2k!landers2k@landers2k.tmi.twitch.tv PRIVMSG #landers2k :merci d\'être là ❤️',
      ].forEach((line, i) => setTimeout(() => handleLine(line, false), 600 + i * 500));   // l'aperçu n'est pas gardé
    }
  }

  /* ---------------------------------------------------------------- Score */
  const scoreEl = $('[data-score]');
  let score = 0;
  const addScore = points => {
    if (!scoreEl) return;
    score = Math.max(0, score + points);   // l'orange retire des points, sans descendre sous 0
    scoreEl.textContent = fmt.format(score);
    scoreEl.classList.remove('bump');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('bump');
  };

  /* ---------------------------------------------------------------- Cubes */
  // [couleur, fréquence, halo, couleur du score, points] — points null : cube rouge, jamais tapé
  const special = () => 21 + rnd(20);
  const COLORS = [
    ['blue', 40, '#2997ff', '#5ab0ff', () => 1],
    ['green', 14, '#30d158', '#30d158', () => 5],
    ['purple', 11, '#bf5af2', '#d68cff', special],
    ['gold', 6, '#ffd60a', '#ffd60a', () => 100],
    ['orange', 11, '#ff9f0a', '#ff9f0a', () => -special()],
    ['red', 18, '#ff375f', '#ff375f', null],
  ];
  const total = COLORS.reduce((n, c) => n + c[1], 0);
  const pick = () => {
    let r = Math.random() * total;
    return COLORS.find(c => (r -= c[1]) < 0) || COLORS[0];
  };

  // Où les cubes ont le droit d'apparaître : [x1, y1, x2, y2]
  const ZONES = chatScene
    ? [[110, 1235, 470, 1410], [1540, 1235, 1890, 1410]]
    : [[70, 70, W - 70, H - 70]];
  // Zones à garder libres (textes, score, pastilles du bas)
  const AVOID = chatScene ? [] : [[280, 300, 2280, 1130], [50, 50, 640, 230], [460, 1240, 2100, 1420]];
  const MAX = chatScene ? 3 : 8;
  const SIZE = chatScene ? [70, 110] : [96, 230];
  const live = [];
  const layer = $('.cubes');

  const inside = (x, y, r, [x1, y1, x2, y2]) => x - r >= x1 && x + r <= x2 && y - r >= y1 && y + r <= y2;
  const overlaps = (x, y, r, [x1, y1, x2, y2]) => x + r > x1 && x - r < x2 && y + r > y1 && y - r < y2;
  const place = s => {
    const r = s / 2;
    for (let i = 0; i < 40; i++) {
      const [x1, y1, x2, y2] = ZONES[rnd(ZONES.length)];
      if (x2 - x1 < s || y2 - y1 < s) continue;
      const x = x1 + r + Math.random() * (x2 - x1 - s);
      const y = y1 + r + Math.random() * (y2 - y1 - s);
      if (!ZONES.some(z => inside(x, y, r, z))) continue;
      if (AVOID.some(z => overlaps(x, y, r, z))) continue;
      if (live.some(c => Math.hypot(c.x - x, c.y - y) < (c.s + s) / 2 + 24)) continue;
      return [x, y];
    }
    return null;
  };

  const burst = (c, color, text) => {
    const ring = document.createElement('i');
    ring.className = 'ring';
    ring.style.cssText = `left:${c.x}px;top:${c.y}px;--s:${c.s}px;--c:${color}`;
    layer.append(ring);
    setTimeout(() => ring.remove(), 520);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.random() * .4;
      const d = c.s * (.7 + Math.random() * .6);
      const bit = document.createElement('i');
      bit.className = 'bit';
      bit.style.cssText = `left:${c.x}px;top:${c.y}px;--c:${color};--w:${Math.round(c.s * (.08 + Math.random() * .06))}px;--dx:${(Math.cos(a) * d).toFixed(0)}px;--dy:${(Math.sin(a) * d).toFixed(0)}px`;
      layer.append(bit);
      setTimeout(() => bit.remove(), 720);
    }
    const pts = document.createElement('span');
    pts.className = 'pts';
    pts.textContent = text;
    const fs = Math.round(Math.max(chatScene ? 44 : 60, c.s * .56));
    // Le score monte au-dessus du cube : on le garde dans l'écran pour les cubes tout en haut
    pts.style.cssText = `left:${c.x}px;top:${Math.max(c.y - c.s * .45, fs * 2.2)}px;--c:${color};--fs:${fs}px`;
    layer.append(pts);
    setTimeout(() => pts.remove(), 1150);
  };

  const spawn = () => {
    if (document.hidden || live.length >= MAX) return;
    const [color, , glow, ink, pointsOf] = pick();
    const z = Math.random();
    const s = Math.round(SIZE[0] + (SIZE[1] - SIZE[0]) * z);
    const at = place(s);
    if (!at) return;
    const c = { x: at[0], y: at[1], s };
    const el = document.createElement('div');
    el.className = 'cube' + (z < .18 && !chatScene ? ' is-far' : '');
    el.style.cssText = `left:${c.x}px;top:${c.y}px;--s:${s}px;--glow:${glow}99;--r:${(Math.random() * 12 - 6).toFixed(1)}deg`;
    el.innerHTML = `<img src="/assets/img/cube-${color}.webp" alt="">`;
    layer.append(el);
    live.push(c);
    const done = () => { el.remove(); live.splice(live.indexOf(c), 1); };
    const life = 900 + Math.random() * 1600;
    if (!pointsOf) {
      // Le rouge : il s'énerve, puis repart sans que personne n'y touche
      setTimeout(() => el.classList.add('is-angry'), life);
      setTimeout(() => { el.classList.add('is-gone'); setTimeout(done, 400); }, life + 1000);
      return;
    }
    setTimeout(() => {
      const points = pointsOf();
      el.classList.add('is-hit');
      burst(c, ink, points > 0 ? `+${points}` : `−${-points}`);
      addScore(points);
      setTimeout(done, 360);
    }, life);
  };

  const loop = () => {
    spawn();
    setTimeout(loop, chatScene ? 900 + Math.random() * 1400 : 260 + Math.random() * 520);
  };
  loop();
})();
