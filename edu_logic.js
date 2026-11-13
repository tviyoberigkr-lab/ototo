/* OTOTO — освітня гра «Логіка» (слот 3 модуля «Навчання»). CoLaba Production.

   Мовонезалежні загадки на мислення: мінімум тексту, інструкція — значком і
   анімованою «рукою», тож гра однаково працює всіма 8 мовами і для малюків 3+,
   які ще не читають. Дорослим теж цікаво на верхніх рівнях.

   Типи загадок (усе генерується кодом, нескінченно, без повторів):
     pattern  — продовж візерунок: AB → AAB/ABC → AABB/ABCD → ріст/обертання/два
                ритми → числові послідовності (від +k до кубів і простих чисел);
     odd      — що зайве: колір → форма → розмір → категорія → абстрактне правило → числа;
     pairs    — знайди пари (2×2 … 4×5), рекорд ходів;
     sudoku   — 4×4 (картинки) → 6×6 → 9×9 (цифри), єдиний розв'язок перевіряється кодом;
     shadow   — чия це тінь;
     maze     — лабіринт (4×4 … 9×9), рух стрілками/свайпом/клавішами;
     matrix   — матриця 3×3, якої клітинки бракує;
     hanoi    — Ханойська вежа, 3–5 дисків.

   Раунд = 3–4 різні загадки; після раунду рівень +1 (ctx.progress.level).
   Адаптивна складність усередині вікової смуги: 3 чисті розв'язки → складніше,
   помилки/підказка → трохи легше. Після 2 помилок — підказка сама.
   Зірки 2–8 за складністю через ctx.win, медалі — 'edu.logic.m*' (назва = BO.t(id)).
   Для 14+ — таймер і рекорди часу (progress.times).

   Для автотестів: window.__eduLogicDebug (поточна загадка з відповіддю, генератори). */
(function () {
  'use strict';
  const BO = window.BO;
  if (!BO || !BO.edu) return;

  /* ===================== випадковість ===================== */
  let seed = ((Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0) || 1;
  function rnd() {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = a => a[Math.floor(rnd() * a.length)];
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  const sample = (a, n) => shuffle(a.slice()).slice(0, n);
  const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }

  /* ===================== графіка: фігури, кольори, емодзі ===================== */
  const SHAPES = {
    circle: '<circle cx="50" cy="50" r="40"/>',
    square: '<rect x="13" y="13" width="74" height="74" rx="9"/>',
    triangle: '<polygon points="50,8 93,87 7,87"/>',
    star: '<polygon points="50,5 61.5,37 95,37 68,57.5 78.5,91 50,71 21.5,91 32,57.5 5,37 38.5,37"/>',
    heart: '<path d="M50 89C22 68 6 52 6 32C6 18 17 8 30 8c9 0 16 5 20 13c4-8 11-13 20-13c13 0 24 10 24 24c0 20-16 36-44 57z"/>',
    diamond: '<polygon points="50,4 90,50 50,96 10,50"/>',
    hexagon: '<polygon points="50,6 89,28 89,72 50,94 11,72 11,28"/>',
    arrow: '<polygon points="50,5 90,47 64,47 64,95 36,95 36,47 10,47"/>',
  };
  const SHAPE_KEYS = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond', 'hexagon'];
  const COLORS = { red: '#ff5560', blue: '#3d8bff', green: '#34c96a', yellow: '#ffd23f', purple: '#a46bff', orange: '#ff9a2e', pink: '#ff7ac6', teal: '#22d3c5' };
  const COLOR_KEYS = Object.keys(COLORS);
  // пари кольорів, які не можна робити єдиною відмінністю (дальтонізм/схожість)
  const COLOR_CLASH = [['red', 'green'], ['red', 'orange'], ['pink', 'red'], ['blue', 'purple'], ['green', 'teal'], ['yellow', 'orange'], ['pink', 'purple']];
  const clash = (a, b) => COLOR_CLASH.some(p => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));

  // категорії для «що зайве»; family — категорії однієї родини не змішуються (фрукти/овочі, тварини/море)
  const CATS = {
    animals:  { fam: 'living', list: ['🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🦉', '🐴', '🐘', '🦒'] },
    sea:      { fam: 'living', list: ['🐟', '🐠', '🐡', '🦈', '🐙', '🦀', '🐬', '🐳'] },
    fruits:   { fam: 'food', list: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🍍', '🥝'] },
    veg:      { fam: 'food', list: ['🥕', '🌽', '🥦', '🥒', '🍆', '🥔', '🧅'] },
    vehicles: { fam: 'vehicles', list: ['🚗', '🚕', '🚌', '🚓', '🚑', '🚒', '🚜', '🚲', '🛵', '🚂', '✈️', '🚀', '🚁', '⛵'] },
    clothes:  { fam: 'clothes', list: ['👕', '👖', '👗', '🧥', '🧦', '🧢', '👟', '👒', '🧤', '🧣'] },
    balls:    { fam: 'sport', list: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐'] },
    music:    { fam: 'music', list: ['🎸', '🎹', '🥁', '🎺', '🎻', '🎷'] },
    sky:      { fam: 'sky', list: ['☀️', '🌙', '⭐', '☁️', '🌈', '⚡', '❄️'] },
  };
  const CAT_KEYS = Object.keys(CATS);
  // емодзі з чіткими силуетами (цілі фігури, не мордочки) — для «чия тінь»
  const SHADOW_SETS = {
    animals: ['🐘', '🦒', '🐢', '🐇', '🦋', '🐌', '🦀', '🐙', '🐓', '🦕', '🐿️', '🦔', '🐎', '🐄', '🐈', '🐕', '🦆', '🐝'],
    things:  ['🚲', '🚁', '✈️', '🚀', '⛵', '🚂', '🛴', '🚜', '☂️', '🎸', '🔑', '✂️', '🍄', '🌵', '🌲', '⚓', '🎈', '🏠'],
  };
  const PAIR_EMO = ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐸', '🐵', '🐧', '🦁', '🐯', '🐮', '🐷', '🐙', '🐳', '🦋', '🐞', '🍎', '🍌', '🍇', '🍓', '🍉', '🍒', '🥕', '🌽', '🚗', '🚀', '🚂', '⛵', '⚽', '🏀', '🎈', '🎸', '🌈', '⭐', '🌙', '🍄', '🌻', '🍦', '🧁'];
  const PAT_EMO = [['🍎', '🍌', '🍇', '🍓', '🍊', '🥝'], ['🐶', '🐱', '🐰', '🐸', '🐻', '🐷'], ['🚗', '🚀', '🚂', '⛵', '🚁', '🚲'], ['⭐', '🌙', '☀️', '☁️', '🌈', '❄️'], ['⚽', '🏀', '🎾', '🏈', '⚾', '🏐']];
  const SUDOKU_PICS = { 4: [['🐶', '🐱', '🐰', '🐸'], ['🍎', '🍌', '🍇', '🍓'], ['🔴', '🔵', '🟢', '🟡']], 6: [['🍎', '🍌', '🍇', '🍓', '🍊', '🥝'], ['🐶', '🐱', '🐰', '🐸', '🐻', '🐷']] };
  const POS = {
    1: [[50, 50]], 2: [[27, 50], [73, 50]], 3: [[50, 27], [27, 73], [73, 73]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]], 6: [[28, 20], [72, 20], [28, 50], [72, 50], [28, 80], [72, 80]],
  };

  function shapeSVG(it) {
    const col = COLORS[it.c] || '#fff';
    const n = it.n || 1, k = n === 1 ? (it.z === 2 ? 1 : 0.82) : n <= 4 ? 0.42 : 0.33;
    const fill = it.f === 'hollow' ? `fill="none" stroke="${col}" stroke-width="${n === 1 ? 9 : 12}" stroke-linejoin="round"` : `fill="${col}"`;
    const rot = it.r ? ` rotate(${it.r} 50 50)` : '';
    let g = '';
    POS[n].forEach(([x, y]) => {
      g += `<g transform="translate(${x - 50 * k} ${y - 50 * k}) scale(${k})"><g transform="${rot}" ${fill}>${SHAPES[it.s]}</g></g>`;
    });
    const sc = it.z === 0.5 ? ' class="lgSmall"' : '';
    return `<svg viewBox="0 0 100 100" aria-hidden="true"${sc}>${g}</svg>`;
  }
  function itemHTML(it) {
    if (it.e) return `<span class="lgEmo${it.z === 0.5 ? ' lgSmall' : ''}">${it.e}</span>`;
    if (it.num !== undefined) return `<span class="lgNum" data-len="${String(it.num).length}">${it.num}</span>`;
    return shapeSVG(it);
  }
  const itemKey = it => it.e ? it.e : it.num !== undefined ? 'n' + it.num : [it.s, it.c, it.n || 1, it.f || '', it.r || 0, it.z || 1].join('.');

  /* ===================== вікові плани ===================== */
  // [тип, вага, мін. рівень складності, макс. рівень складності] для кожного віку 3…14
  const PLAN = {
    3:  [['pattern', 3, 0, 1], ['odd', 3, 0, 1], ['pairs', 3, 0, 1]],
    4:  [['pattern', 3, 0, 1], ['odd', 3, 0, 2], ['pairs', 2, 0, 1], ['shadow', 2, 0, 1]],
    5:  [['pattern', 3, 1, 2], ['odd', 2, 1, 2], ['pairs', 2, 1, 2], ['sudoku', 2, 0, 1], ['shadow', 1, 0, 2]],
    6:  [['pattern', 3, 1, 2], ['odd', 2, 1, 3], ['pairs', 2, 1, 2], ['sudoku', 2, 0, 2], ['shadow', 1, 1, 2]],
    7:  [['pattern', 3, 2, 3], ['odd', 2, 2, 3], ['pairs', 2, 2, 3], ['sudoku', 2, 1, 3], ['maze', 2, 0, 2], ['shadow', 1, 1, 2]],
    8:  [['pattern', 3, 2, 4], ['odd', 2, 3, 4], ['pairs', 1, 2, 3], ['sudoku', 2, 2, 4], ['maze', 2, 1, 3], ['shadow', 1, 2, 2]],
    9:  [['pattern', 3, 3, 4], ['odd', 2, 3, 4], ['pairs', 1, 3, 3], ['sudoku', 2, 3, 4], ['matrix', 2, 0, 1], ['maze', 1, 2, 4]],
    10: [['pattern', 3, 4, 5], ['odd', 2, 4, 5], ['pairs', 1, 3, 4], ['sudoku', 2, 4, 5], ['matrix', 2, 0, 2], ['maze', 1, 3, 4]],
    11: [['pattern', 2, 4, 5], ['odd', 2, 4, 5], ['pairs', 1, 3, 4], ['sudoku', 2, 6, 7], ['matrix', 2, 1, 2], ['hanoi', 1, 0, 1], ['maze', 1, 3, 5]],
    12: [['pattern', 2, 5, 6], ['odd', 2, 4, 5], ['pairs', 1, 3, 4], ['sudoku', 2, 6, 7], ['matrix', 2, 1, 3], ['hanoi', 1, 0, 1], ['maze', 1, 4, 5]],
    13: [['pattern', 2, 5, 6], ['odd', 2, 5, 5], ['pairs', 1, 4, 4], ['sudoku', 2, 6, 8], ['matrix', 2, 2, 3], ['hanoi', 1, 1, 2], ['maze', 1, 4, 5]],
    14: [['pattern', 2, 5, 6], ['odd', 2, 5, 5], ['pairs', 1, 4, 4], ['sudoku', 2, 7, 8], ['matrix', 2, 2, 3], ['hanoi', 1, 1, 2], ['maze', 1, 5, 5]],
  };
  // «вага» складності кожного рівня кожного типу → зірки = 2 + вага (стеля 8)
  const DIFF = {
    pattern: [0, 0.5, 1, 2, 3, 4, 5], odd: [0, 0.5, 1, 2, 3, 4], pairs: [0, 1, 2, 3, 4], shadow: [0, 0.5, 1],
    sudoku: [1, 1.5, 2, 3, 3.5, 4, 5, 5.5, 6], maze: [0.5, 1, 1.5, 2.5, 3.5, 4.5], matrix: [3, 4, 5, 6], hanoi: [3, 4.5, 6],
  };
  const ICON = { pattern: '🔮', odd: '🔍', pairs: '🃏', sudoku: '🔢', shadow: '👤', maze: '🧭', matrix: '🔲', hanoi: '🗼' };

  /* ===================== генератори ===================== */

  // ---------- 1. ВІЗЕРУНОК ----------
  function patTokens(k, emoji) {
    if (emoji) return sample(pick(PAT_EMO), k).map(e => ({ e }));
    const sh = sample(SHAPE_KEYS, k), cl = sample(COLOR_KEYS, k);
    return sh.map((s, i) => ({ s, c: cl[i] }));
  }
  function genPattern(tier, soft, band) {
    if (tier >= 4) return genNumbers(tier, soft);
    if (tier === 3) return genPattern3(soft);
    const motif = tier === 0 ? (soft || band <= 3 ? 'AB' : pick(['AB', 'AB', 'ABB', 'AAB'])) : tier === 1 ? pick(['AAB', 'ABB', 'ABC']) : pick(['AABB', 'ABCD', 'ABAC', 'AABC', 'ABCB', 'ABBC']);
    const letters = [...new Set(motif)];
    const toks = patTokens(letters.length + 2, band <= 6 ? rnd() < 0.55 : rnd() < 0.3);
    const per = motif.length;
    const total = tier === 0 ? (per === 2 ? 6 : 8) : tier === 1 ? per * 2 + 2 : Math.min(10, per * 2 + 2);
    const seq = range(0, total - 1).map(i => toks[letters.indexOf(motif[i % per])]);
    const blank = tier === 2 && !soft ? ri(per * 2, total - 1) : total - 1;
    const answer = seq[blank];
    const nOpt = tier === 0 ? (soft && band <= 4 ? 2 : 3) : tier === 1 ? 3 : 4;
    const options = shuffle([answer].concat(sample(toks.filter(t => t !== answer), nOpt - 1)));
    return { type: 'pattern', seq, blank, options, ans: options.indexOf(answer), sig: 'p' + motif + seq.map(itemKey).join() + blank };
  }
  function genPattern3(soft) {
    const v = pick(soft ? ['grow', 'rot'] : ['grow', 'rot', 'dual', 'dual']);
    let seq, answer, options;
    if (v === 'grow') {
      const s = pick(['circle', 'star', 'heart', 'square']), c = pick(COLOR_KEYS);
      const up = rnd() < 0.65, n0 = up ? ri(1, 2) : 6;
      const counts = range(0, 4).map(i => up ? n0 + i : n0 - i);
      seq = counts.map(n => ({ s, c, n }));
      answer = seq[4];
      const a = counts[4];
      const opts = [a];
      [a + 1, a - 1, a + 2, a - 2, a + 3].forEach(x => { if (x >= 1 && x <= 6 && opts.length < 4 && !opts.includes(x)) opts.push(x); });
      options = shuffle(opts.map(n => n === a ? answer : { s, c, n }));
    } else if (v === 'rot') {
      const c = pick(COLOR_KEYS), step = pick([45, 90]) * pick([1, -1]), r0 = 45 * ri(0, 7);
      const norm = r => ((r % 360) + 360) % 360;
      seq = range(0, 5).map(i => ({ s: 'arrow', c, r: norm(r0 + step * i) }));
      answer = seq[5];
      const rs = [answer.r, norm(answer.r + step), norm(answer.r - step), norm(answer.r + 180)];
      options = shuffle(rs.map(r => r === answer.r ? answer : { s: 'arrow', c, r }));
    } else {
      const S = sample(SHAPE_KEYS, 2), C = sample(COLOR_KEYS, 3);
      seq = range(0, 7).map(i => ({ s: S[i % 2], c: C[i % 3] }));
      answer = seq[7];
      options = shuffle([answer, { s: S[0], c: C[1] }, { s: S[1], c: C[0] }, { s: S[1], c: C[2] }]);
    }
    const blank = seq.length - 1;
    return { type: 'pattern', seq, blank, options, ans: options.indexOf(answer), sig: 'p3' + seq.map(itemKey).join() };
  }

  const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61];
  function genNumbers(tier, soft) {
    const mk = (len, f) => range(0, len).map(f);    // len показано + 1 відповідь
    const R4 = [
      () => { const k = ri(2, 5), a = ri(1, 9); return mk(5, i => a + k * i); },
      () => { const k = ri(2, 4), a = ri(6 * k + 2, 6 * k + 20); return mk(5, i => a - k * i); },
      () => { const a = ri(1, 3); return mk(5, i => a * Math.pow(2, i)); },
      () => { const k = pick([5, 10]), a = k * ri(1, 3); return mk(5, i => a + k * i); },
    ];
    const R5 = [
      () => { let x = ri(1, 5), y = ri(1, 5); if (x === y) y = x + 2; const a = ri(1, 9), r = [a]; for (let i = 1; i <= 6; i++) r.push(r[i - 1] + (i % 2 ? x : y)); return r; },
      () => { const a = ri(1, 9), d = ri(1, 2), r = [a]; for (let i = 1; i <= 5; i++) r.push(r[i - 1] + d + i - 1); return r; },
      () => { const s = ri(1, 3); return mk(5, i => (i + s) * (i + s)); },
      () => { const a = ri(1, 2); return mk(4, i => a * Math.pow(3, i)); },
      () => { const r = [ri(1, 3), ri(1, 4)]; for (let i = 2; i <= 6; i++) r.push(r[i - 1] + r[i - 2]); return r; },
      () => { const k = ri(6, 9), a = ri(80, 99); return mk(5, i => a - k * i); },
    ];
    const R6 = [
      () => { const c = ri(1, 5); return mk(5, i => (i + 1) * (i + 1) + c); },
      () => mk(4, i => Math.pow(i + 1, 3)),
      () => { const r = [ri(1, 3)]; for (let i = 1; i <= 5; i++) r.push(r[i - 1] * 2 + 1); return r; },
      () => { const a = ri(1, 4), k1 = ri(1, 3), b = ri(16, 25), k2 = ri(2, 5) * pick([1, -1]); return mk(7, i => i % 2 ? b + k2 * (i >> 1) : a + k1 * (i >> 1)); },
      () => { const s = ri(1, 3); return mk(5, i => (i + s) * (i + s + 1) / 2); },
      () => { const s = ri(0, 4); return mk(5, i => PRIMES[s + i]); },
      () => { const a = ri(1, 9), r = [a]; for (let i = 1; i <= 5; i++) r.push(r[i - 1] + Math.pow(2, i - 1)); return r; },
      () => { const r = [ri(1, 3)]; for (let i = 1; i <= 6; i++) r.push(i % 2 ? r[i - 1] * 2 : r[i - 1] + 1); return r; },
    ];
    const pool = tier === 4 ? R4 : tier === 5 ? (soft ? R4.concat(R5) : R5) : (soft ? R5 : R6.concat(R5.slice(4)));
    const all = pick(pool)();
    const terms = all.slice(0, -1), ans = all[all.length - 1];
    const nOpt = soft ? 3 : 4;
    const last = terms[terms.length - 1], prev = terms[terms.length - 2];
    const cand = [last + (last - prev)].concat(shuffle([ans + 1, ans - 1, ans + 2, ans - 2, ans + (last - prev), ans + 10, ans - 10, last * 2, ans + 3]));
    const opts = [ans];
    cand.forEach(v => { if (v !== ans && v >= 0 && !opts.includes(v) && opts.length < nOpt) opts.push(v); });
    const options = shuffle(opts).map(num => ({ num }));
    const seq = terms.map(num => ({ num })).concat([{ num: ans }]);
    return { type: 'pattern', num: true, seq, blank: seq.length - 1, options, ans: options.findIndex(o => o.num === ans), sig: 'pn' + all.join() };
  }

  // ---------- 2. ЩО ЗАЙВЕ ----------
  const NUM_PROPS = {
    even: n => n % 2 === 0, m3: n => n % 3 === 0, m5: n => n % 5 === 0, m4: n => n % 4 === 0,
    sq: n => Math.round(Math.sqrt(n)) ** 2 === n, prime: n => PRIMES.includes(n) || (n > 61 && isPrime(n)), two: n => n >= 10, m10: n => n % 10 === 0,
  };
  function isPrime(n) { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; }
  const SHAPE_ATTRS = ['s', 'c', 'n', 'f', 'z'];
  // множина індексів, які «вибиваються» за хоча б однією ознакою (усі інші однакові, а цей — ні)
  function oddSet(items, keys) {
    const res = new Set();
    keys.forEach(k => {
      const vals = items.map(it => String(typeof k === 'function' ? k(it) : (it[k] === undefined ? '' : it[k])));
      const cnt = {}; vals.forEach(v => { cnt[v] = (cnt[v] || 0) + 1; });
      const ks = Object.keys(cnt);
      if (ks.length !== 2) return;
      ks.forEach(v => { if (cnt[v] === 1 && items.length > 2) res.add(vals.indexOf(v)); });
    });
    return res;
  }
  function oddKeys(P) {
    if (P.kind === 'cat') return [it => it.cat];
    if (P.kind === 'num') return Object.keys(NUM_PROPS).map(k => it => NUM_PROPS[k](it.num));
    return SHAPE_ATTRS.map(k => it => it[k] === undefined ? (k === 'n' || k === 'z' ? 1 : k === 'f' ? 'solid' : '') : it[k]);
  }
  function genOdd(tier, soft, band) {
    for (let tries = 0; tries < 200; tries++) {
      const P = genOddRaw(tier, soft, band);
      const set = oddSet(P.items, oddKeys(P));
      if (set.size === 1 && set.has(P.ans)) return P;
    }
    return genOddRaw(0, false, band);   // теоретично недосяжно; колір завжди однозначний
  }
  function genOddRaw(tier, soft, band) {
    let items, ans, kind = 'shape';
    const n0 = band <= 3 || (soft && tier <= 1) ? 3 : band >= 9 ? 5 : 4;
    if (tier <= 2) {
      const n = tier === 2 && !soft ? Math.max(n0, 4) : n0;
      ans = ri(0, n - 1);
      const mode = tier === 0 ? 'color' : tier === 1 ? 'shape' : pick(['size', 'shapeMixed', 'fill']);
      const s = pick(SHAPE_KEYS), c = pick(COLOR_KEYS);
      if (mode === 'color') {
        let c2; do { c2 = pick(COLOR_KEYS); } while (c2 === c || clash(c, c2));
        items = range(0, n - 1).map(i => ({ s, c: i === ans ? c2 : c }));
      } else if (mode === 'shape') {
        let s2; do { s2 = pick(SHAPE_KEYS); } while (s2 === s);
        items = range(0, n - 1).map(i => ({ s: i === ans ? s2 : s, c }));
      } else if (mode === 'size') {
        items = range(0, n - 1).map(i => ({ s, c, z: i === ans ? 2 : 0.5 }));
      } else if (mode === 'fill') {
        const cols = sample(COLOR_KEYS, n);
        items = range(0, n - 1).map(i => ({ s, c: cols[i], f: i === ans ? 'hollow' : 'solid' }));
      } else {
        let s2; do { s2 = pick(SHAPE_KEYS); } while (s2 === s);
        const cols = sample(COLOR_KEYS, n);
        items = range(0, n - 1).map(i => ({ s: i === ans ? s2 : s, c: cols[i] }));
      }
    } else if (tier === 3) {
      kind = 'cat';
      const n = soft ? 4 : n0;
      const a = pick(CAT_KEYS); let b; do { b = pick(CAT_KEYS); } while (CATS[b].fam === CATS[a].fam);
      ans = ri(0, n - 1);
      const base = sample(CATS[a].list, n - 1), odd = pick(CATS[b].list);
      items = []; let k = 0;
      for (let i = 0; i < n; i++) items.push(i === ans ? { e: odd, cat: b } : { e: base[k++], cat: a });
    } else if (tier === 4) {
      // абстрактне правило: одна ознака спільна для всіх, крім одного; інші ознаки — «шум»
      const n = soft ? 4 : 5;
      ans = ri(0, n - 1);
      const rule = pick(['s', 'c', 'n', 'f']);
      const sV = sample(SHAPE_KEYS, 4), cV = sample(COLOR_KEYS, 4), nV = [1, 2, 3, 4], fV = ['solid', 'hollow'];
      const val = { s: () => pick(sV), c: () => pick(cV), n: () => pick(nV), f: () => pick(fV) };
      const common = val[rule](); let other, g = 0; do { other = val[rule](); } while ((other === common || (rule === 'c' && clash(other, common))) && g++ < 50);
      items = range(0, n - 1).map(i => {
        const it = { s: val.s(), c: val.c(), n: val.n(), f: val.f() };
        it[rule] = i === ans ? other : common;
        return it;
      });
      // «шумові» ознаки мають бути різноманітні (щоб не було другого правила)
      ['s', 'c', 'n'].filter(k => k !== rule).forEach(k => {
        const vals = shuffle((k === 's' ? sV : k === 'c' ? cV : nV).concat(k === 's' ? sV : k === 'c' ? cV : nV)).slice(0, n);
        items.forEach((it, i) => { it[k] = vals[i]; });
      });
    } else {
      kind = 'num';
      const n = soft ? 4 : 5, max = band >= 13 ? 99 : 60;
      const keys = band >= 13 ? ['even', 'm3', 'm5', 'sq', 'prime', 'm4'] : ['even', 'm3', 'm5', 'm10', 'sq'];
      const rule = pick(keys), f = NUM_PROPS[rule];
      const yes = range(2, max).filter(f), no = range(2, max).filter(x => !f(x));
      const flip = rule === 'even' && rnd() < 0.5;          // «усі непарні, а одне парне»
      const A = flip ? no : yes, B = flip ? yes : no;
      ans = ri(0, n - 1);
      const base = sample(A, n - 1); let k = 0;
      items = range(0, n - 1).map(i => ({ num: i === ans ? pick(B.filter(x => !base.includes(x))) : base[k++] }));
    }
    return { type: 'odd', kind, items, ans, options: items, sig: 'o' + items.map(itemKey).join() };
  }

  // ---------- 3. ПАРИ ----------
  const PAIR_SIZES = [[2, 2], [3, 2], [3, 4], [4, 4], [4, 5]];   // [стовпці, рядки]
  function genPairs(tier, soft) {
    const t = soft ? Math.max(0, tier - 1) : tier;
    const [cols, rows] = PAIR_SIZES[t];
    const n = cols * rows / 2;
    const em = sample(PAIR_EMO, n);
    const cards = shuffle(em.concat(em));
    return { type: 'pairs', size: t, cols, rows, cards, sig: 'm' + cards.join('') };
  }

  // ---------- 4. СУДОКУ ----------
  const SUDOKU_CFG = [[4, 10], [4, 8], [4, 6], [6, 22], [6, 18], [6, 14], [9, 40], [9, 32], [9, 26]];
  const BOXES = { 4: [2, 2], 6: [2, 3], 9: [3, 3] };
  function sdkOk(g, N, br, bc, r, c, v) {
    for (let i = 0; i < N; i++) if (g[r * N + i] === v || g[i * N + c] === v) return false;
    const r0 = r - r % br, c0 = c - c % bc;
    for (let y = r0; y < r0 + br; y++) for (let x = c0; x < c0 + bc; x++) if (g[y * N + x] === v) return false;
    return true;
  }
  function sdkFull(N) {
    const [br, bc] = BOXES[N], g = new Array(N * N).fill(0);
    const fill = idx => {
      if (idx === N * N) return true;
      const r = (idx / N) | 0, c = idx % N;
      for (const v of shuffle(range(1, N))) {
        if (sdkOk(g, N, br, bc, r, c, v)) { g[idx] = v; if (fill(idx + 1)) return true; g[idx] = 0; }
      }
      return false;
    };
    fill(0);
    return g;
  }
  // кількість розв'язків (до limit) — бітові маски + «найменше варіантів спершу»
  function sdkCount(grid, N, limit) {
    const [br, bc] = BOXES[N], g = grid.slice();
    const rows = new Array(N).fill(0), cols = new Array(N).fill(0), boxes = new Array(N).fill(0);
    const bi = (r, c) => ((r / br) | 0) * (N / bc) + ((c / bc) | 0);
    for (let i = 0; i < N * N; i++) {
      const v = g[i]; if (!v) continue;
      const r = (i / N) | 0, c = i % N, b = bi(r, c), bit = 1 << v;
      if ((rows[r] | cols[c] | boxes[b]) & bit) return 0;
      rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
    }
    const full = (1 << (N + 1)) - 2;
    let count = 0;
    const rec = () => {
      let best = -1, bestMask = 0, bestCnt = 99;
      for (let i = 0; i < N * N; i++) {
        if (g[i]) continue;
        const r = (i / N) | 0, c = i % N, m = full & ~(rows[r] | cols[c] | boxes[bi(r, c)]);
        let cnt = 0; for (let x = m; x; x &= x - 1) cnt++;
        if (cnt < bestCnt) { bestCnt = cnt; best = i; bestMask = m; if (cnt <= 1) break; }
      }
      if (best < 0) { count++; return; }
      if (bestCnt === 0) return;
      const r = (best / N) | 0, c = best % N, b = bi(r, c);
      for (let v = 1; v <= N; v++) {
        const bit = 1 << v; if (!(bestMask & bit)) continue;
        g[best] = v; rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
        rec();
        g[best] = 0; rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit;
        if (count >= limit) return;
      }
    };
    rec();
    return count;
  }
  function sdkMake(N, target) {
    const sol = sdkFull(N), g = sol.slice();
    let givens = N * N;
    for (const i of shuffle(range(0, N * N - 1))) {
      if (givens <= target) break;
      const v = g[i]; g[i] = 0;
      if (sdkCount(g, N, 2) !== 1) g[i] = v; else givens--;
    }
    return { sol, puzzle: g, givens };
  }
  function genSudoku(tier, soft, band) {
    let [N, target] = SUDOKU_CFG[tier];
    if (soft) target += N === 4 ? 2 : N === 6 ? 3 : 5;
    const { sol, puzzle, givens } = sdkMake(N, target);
    const pics = band <= 8 && N <= 6 ? pick(SUDOKU_PICS[N]) : null;
    return { type: 'sudoku', N, sol, puzzle, givens, pics, timeKey: 'sudoku' + N + '-' + tier, sig: 's' + puzzle.join('') };
  }

  // ---------- 5. ТІНЬ ----------
  function genShadow(tier, soft) {
    const n = clamp((tier === 0 ? 3 : tier === 1 ? 4 : 5) - (soft ? 1 : 0), 3, 5);
    let opts;
    if (tier === 0) opts = sample(SHADOW_SETS.animals, 2).concat(sample(SHADOW_SETS.things, n - 2));
    else opts = sample(SHADOW_SETS[pick(['animals', 'things'])], n);
    const target = opts[0];
    const options = shuffle(opts).map(e => ({ e }));
    return { type: 'shadow', target, options, ans: options.findIndex(o => o.e === target), sig: 'h' + target + options.map(o => o.e).join('') };
  }

  // ---------- 6. ЛАБІРИНТ ----------
  const DIRS = { u: [-1, 0, 1, 4], r: [0, 1, 2, 8], d: [1, 0, 4, 1], l: [0, -1, 8, 2] };   // dy, dx, біт «вихід сюди», біт протилежний
  function genMaze(tier, soft) {
    const size = [4, 5, 6, 7, 8, 9][soft ? Math.max(0, tier - 1) : tier];
    const R = size, C = size, w = new Array(R * C).fill(0), seen = new Array(R * C).fill(false);
    const stack = [0]; seen[0] = true;
    while (stack.length) {
      const cur = stack[stack.length - 1], y = (cur / C) | 0, x = cur % C;
      const nb = shuffle(Object.keys(DIRS)).filter(d => { const ny = y + DIRS[d][0], nx = x + DIRS[d][1]; return ny >= 0 && nx >= 0 && ny < R && nx < C && !seen[ny * C + nx]; });
      if (!nb.length) { stack.pop(); continue; }
      const d = nb[0], ni = (y + DIRS[d][0]) * C + x + DIRS[d][1];
      w[cur] |= DIRS[d][2]; w[ni] |= DIRS[d][3]; seen[ni] = true; stack.push(ni);
    }
    // ціль — найдальша від старту клітинка (цікавіший шлях)
    const dist = mazeDist(w, R, C, 0);
    let goal = 0; dist.forEach((v, i) => { if (v > dist[goal]) goal = i; });
    return { type: 'maze', R, C, walls: w, start: 0, goal, timeKey: 'maze' + size, sig: 'z' + w.join('.') };
  }
  function mazeDist(w, R, C, from) {
    const dist = new Array(R * C).fill(-1), q = [from]; dist[from] = 0;
    while (q.length) {
      const cur = q.shift(), y = (cur / C) | 0, x = cur % C;
      for (const d in DIRS) {
        if (!(w[cur] & DIRS[d][2])) continue;
        const ni = (y + DIRS[d][0]) * C + x + DIRS[d][1];
        if (dist[ni] < 0) { dist[ni] = dist[cur] + 1; q.push(ni); }
      }
    }
    return dist;
  }
  function mazePath(P, from) {   // список напрямків від from до цілі
    const { walls: w, R, C } = P, dist = mazeDist(w, R, C, P.goal), path = [];
    let cur = from;
    while (cur !== P.goal && path.length < R * C) {
      const y = (cur / C) | 0, x = cur % C;
      const d = Object.keys(DIRS).find(k => (w[cur] & DIRS[k][2]) && dist[(y + DIRS[k][0]) * C + x + DIRS[k][1]] === dist[cur] - 1);
      if (!d) break;
      path.push(d); cur = (y + DIRS[d][0]) * C + x + DIRS[d][1];
    }
    return path;
  }

  // ---------- 7. МАТРИЦЯ 3×3 ----------
  function genMatrix(tier, soft) {
    const S = sample(['circle', 'square', 'triangle', 'star', 'heart', 'diamond'], 3), Cc = sample(COLOR_KEYS, 3);
    const up = rnd() < 0.7, cnt = up ? [1, 2, 3] : [3, 2, 1];
    let cell, miss = tier === 0 ? 8 : ri(0, 8), alt;
    if (tier === 0) {
      cell = (r, c) => ({ s: S[r], c: Cc[c] });
      alt = { s: S, c: Cc };
    } else if (tier === 1) {
      const c0 = pick(COLOR_KEYS);
      const byRow = rnd() < 0.5;
      cell = (r, c) => ({ s: S[r], c: byRow ? Cc[r] : c0, n: cnt[c] });
      alt = { s: S, n: [1, 2, 3, 4], c: byRow ? Cc : [c0, Cc[0], Cc[1]] };
    } else if (tier === 2) {
      cell = (r, c) => ({ s: S[(r + c) % 3], c: Cc[(2 * r + c) % 3], n: cnt[r] });
      alt = { s: S, c: Cc, n: [1, 2, 3, 4] };
    } else {
      const F = ['solid', 'hollow', 'solid'];
      cell = (r, c) => ({ s: S[(r + c) % 3], c: Cc[(2 * r + c) % 3], n: cnt[c], f: F[(r + 2 * c) % 3 === 1 ? 1 : 0] });
      alt = { s: S, c: Cc, n: [1, 2, 3, 4], f: ['solid', 'hollow'] };
    }
    const cells = range(0, 8).map(i => cell((i / 3) | 0, i % 3));
    const answer = cells[miss];
    const nOpt = tier >= 2 && !soft ? 6 : 4;
    const opts = [answer], keys = Object.keys(alt);
    for (let guard = 0; opts.length < nOpt && guard < 200; guard++) {
      const k = pick(keys), it = Object.assign({}, answer);
      it[k] = pick(alt[k]);
      if (guard > 60) { const k2 = pick(keys); it[k2] = pick(alt[k2]); }
      if (!opts.some(o => itemKey(o) === itemKey(it))) opts.push(it);
    }
    const options = shuffle(opts);
    return { type: 'matrix', cells, miss, options, ans: options.indexOf(answer), sig: 'x' + cells.map(itemKey).join() + miss };
  }

  // ---------- 8. ХАНОЙСЬКА ВЕЖА ----------
  function genHanoi(tier, soft) {
    const n = Math.max(3, [3, 4, 5][tier] - (soft ? 1 : 0));
    return { type: 'hanoi', n, pegs: [range(1, n).reverse(), [], []], optimal: Math.pow(2, n) - 1, timeKey: 'hanoi' + n, sig: 'n' + n + ':' + ri(0, 1e6) };
  }
  function hanoiNext(pegs, n) {   // наступний оптимальний хід з будь-якого стану → [звідки, куди]
    const pos = {}; pegs.forEach((p, i) => p.forEach(d => { pos[d] = i; }));
    const solve = (k, T) => {
      if (k === 0) return null;
      const p = pos[k];
      if (p === T) return solve(k - 1, T);
      const other = 3 - p - T;
      return solve(k - 1, other) || [p, T];
    };
    return solve(n, 2);
  }

  const GEN = { pattern: genPattern, odd: genOdd, pairs: genPairs, sudoku: genSudoku, shadow: genShadow, maze: genMaze, matrix: genMatrix, hanoi: genHanoi };

  /* ===================== стан гри ===================== */
  let host = null, ctx = null, p = null, root = null, P = null;
  let timers = [], tickT = null, keyHandler = null, startT = 0;
  let misses = 0, hintUsed = false, busy = false, handShown = false, puzzleNo = 0;

  const later = (fn, ms) => { const id = setTimeout(() => { timers = timers.filter(x => x !== id); if (host) fn(); }, ms); timers.push(id); return id; };
  const sfx = name => { try { if (window.BO_SOUND && BO_SOUND.play) BO_SOUND.play(name); } catch (e) { /* без звуку */ } };
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const T = (k, v) => ctx.t(k, v);
  const timed = () => (ctx && ctx.age >= 14);
  const fmt = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  function initProgress() {
    p = ctx.progress;
    p.level = p.level || 1; p.medals = p.medals || []; p.solved = p.solved || 0;
    if (p.adaptBand !== ctx.band || !p.adapt || typeof p.adapt !== 'object') { p.adapt = {}; p.adaptBand = ctx.band; }
    if (!Array.isArray(p.recent)) p.recent = [];
    p.seen = p.seen || {}; p.times = p.times || {}; p.bestMoves = p.bestMoves || {}; p.cnt = p.cnt || {};
    p.patStreak = p.patStreak || 0; p.streak = p.streak || 0;
    if (!Array.isArray(p.roundTypes) || p.roundBand !== ctx.band || !p.roundTypes.every(t => GEN[t])) { p.roundTypes = null; p.roundPos = 0; }
    p.roundPos = p.roundPos || 0;
  }

  function newRound() {
    const rows = PLAN[ctx.band], n = ctx.band <= 4 ? 3 : 4, out = [];
    let last = p.lastType;
    while (out.length < n) {
      let pool = rows.filter(r => !out.includes(r[0]) && r[0] !== last);
      if (!pool.length) pool = rows.filter(r => r[0] !== last);
      let x = rnd() * pool.reduce((s, r) => s + r[1], 0), ch = pool[0];
      for (const r of pool) { x -= r[1]; if (x < 0) { ch = r; break; } }
      out.push(ch[0]); last = ch[0];
    }
    p.roundTypes = out; p.roundPos = 0; p.roundBand = ctx.band;
  }

  function tierFor(type) {
    const row = PLAN[ctx.band].find(r => r[0] === type);
    const a = p.adapt[type] || 0;
    const lvl = Math.min(1, Math.floor((p.level - 1) / 12) * 0.5);   // повільний дрейф угору з рівнями
    return { tier: Math.min(row[3], row[2] + Math.floor(Math.max(0, a + lvl))), soft: a <= -0.75 };
  }

  function generate(type, tier, soft) {
    let Q = null;
    for (let i = 0; i < 25; i++) { Q = GEN[type](tier, soft, ctx.band); Q.sigH = hash(Q.sig); if (!p.recent.includes(Q.sigH)) break; }
    p.recent.push(Q.sigH); if (p.recent.length > 80) p.recent.splice(0, p.recent.length - 80);
    Q.tier = tier; Q.soft = soft; Q.id = ++puzzleNo;
    return Q;
  }

  /* ===================== каркас екрана ===================== */
  function buildShell() {
    host.innerHTML = '';
    root = el('div', 'lg');
    root.innerHTML =
      '<div class="lgHead"><span class="lgLvl"></span><span class="lgDots"></span>' +
      '<span class="lgTimer"></span><button type="button" class="lgHint">💡</button></div>' +
      '<div class="lgHow"><span class="lgHowIco"></span><span class="lgHowTxt"></span></div>' +
      '<div class="lgBody"></div><div class="lgFx"></div>';
    host.appendChild(root);
    root.querySelector('.lgHint').addEventListener('click', () => { if (!busy && P && P.hint) { hintUsed = true; P.hint(); } });
    keyHandler = e => { if (P && P.onKey && !busy) P.onKey(e); };
    document.addEventListener('keydown', keyHandler);
  }

  function updateHead() {
    root.querySelector('.lgLvl').textContent = T('lvl', { n: p.level });
    const n = p.roundTypes ? p.roundTypes.length : 0;
    let dots = '';
    for (let i = 0; i < n; i++) dots += `<i class="${i < p.roundPos ? 'on' : i === p.roundPos ? 'cur' : ''}"></i>`;
    root.querySelector('.lgDots').innerHTML = dots;
    const hb = root.querySelector('.lgHint');
    hb.setAttribute('aria-label', T('hint')); hb.title = T('hint');
  }

  function tick() {
    if (!root || !P) return;
    const t = root.querySelector('.lgTimer');
    if (!timed()) { t.textContent = ''; return; }
    const best = P.timeKey && p.times[P.timeKey];
    t.textContent = '⏱ ' + fmt((Date.now() - startT) / 1000) + (best ? '  🏆 ' + fmt(best) : '');
  }

  function nextPuzzle() {
    if (!host) return;
    if (!p.roundTypes || p.roundPos >= p.roundTypes.length) newRound();
    const type = p.roundTypes[p.roundPos];
    const { tier, soft } = tierFor(type);
    P = generate(type, tier, soft);
    misses = 0; hintUsed = false; busy = false;
    root.querySelector('.lgFx').innerHTML = '';
    updateHead();
    root.querySelector('.lgHowIco').textContent = ICON[type];
    root.querySelector('.lgHowTxt').textContent = T('how.' + type);
    const body = root.querySelector('.lgBody');
    body.innerHTML = ''; body.className = 'lgBody lgB-' + type;
    root.classList.toggle('lgTight', (type === 'sudoku' && P.N === 9) || type === 'maze');
    RENDER[type](P, body);
    startT = Date.now();
    clearInterval(tickT); tickT = setInterval(tick, 1000); tick();
    // анімована «рука» — малюкам завжди, іншим — коли тип новий
    handShown = ctx.band <= 6 || !p.seen[type];
    if (handShown && P.handTarget) later(() => showHand(P.handTarget()), 350);
    if (!p.seen[type]) { p.seen[type] = 1; ctx.save(); }
  }

  /* ===================== відгук ===================== */
  function showHand(target) {
    if (!target || !root) return;
    const fx = root.querySelector('.lgFx'), rb = root.getBoundingClientRect(), tb = target.getBoundingClientRect();
    const h = el('div', 'lgHand', '👆');
    h.style.left = (tb.left - rb.left + tb.width / 2 - 18) + 'px';
    h.style.top = (tb.top - rb.top + tb.height * 0.55) + 'px';
    fx.appendChild(h);
    later(() => h.remove(), 2600);
  }
  function shake(e) { if (!e) return; e.classList.remove('lgShake'); void e.offsetWidth; e.classList.add('lgShake'); later(() => e.classList.remove('lgShake'), 500); }
  function bubble(text, cls) {
    const b = el('div', 'lgPop ' + (cls || ''), text);
    root.querySelector('.lgFx').appendChild(b);
    later(() => b.remove(), 1400);
  }
  function confetti(n) {
    const fx = root.querySelector('.lgFx'), cols = Object.values(COLORS);
    for (let i = 0; i < n; i++) {
      const c = el('i', 'lgConf');
      c.style.left = (5 + rnd() * 90) + '%';
      c.style.background = pick(cols);
      c.style.setProperty('--dx', (rnd() * 120 - 60) + 'px');
      c.style.setProperty('--rot', (rnd() * 900 - 450) + 'deg');
      c.style.animationDelay = (rnd() * 0.25) + 's';
      c.style.animationDuration = (1.1 + rnd() * 0.8) + 's';
      if (rnd() < 0.4) c.style.borderRadius = '50%';
      fx.appendChild(c);
      later(() => c.remove(), 2400);
    }
  }

  function miss(e) {
    if (busy) return;
    misses++; p.streak = 0;
    shake(e); sfx('nope');
    bubble(misses >= 2 ? '🤔' : '🙂 ' + T('try'), 'lgPopSoft');
    if (misses === 2 && P && P.hint) later(() => { if (!busy && P) { hintUsed = true; P.hint(true); } }, 450);
  }

  /* ===================== розв'язано: зірки, медалі, рівні ===================== */
  function solved() {
    if (busy || !P) return;
    busy = true;
    clearInterval(tickT);
    const secs = (Date.now() - startT) / 1000;
    const type = P.type, clean = misses === 0 && !hintUsed;
    // адаптивна складність
    const a = p.adapt[type] || 0;
    p.adapt[type] = clamp(clean ? a + 0.34 : (misses >= 2 || hintUsed) ? a - 0.5 : a, -1.5, 4);
    p.streak = clean ? (p.streak || 0) + 1 : 0;
    p.cnt[type] = (p.cnt[type] || 0) + 1;
    p.lastType = type;
    if (type === 'pattern') p.patStreak = clean ? p.patStreak + 1 : 0;
    // рекорд часу
    let record = false;
    if (P.timeKey) {
      const best = p.times[P.timeKey];
      if (!best || secs < best) { record = !!best && timed(); p.times[P.timeKey] = Math.round(secs * 10) / 10; }
    }
    // зірки 2–8
    let stars = 2 + Math.floor((DIFF[type][P.tier] || 0) + (ctx.band >= 14 && timed() ? 0.5 : 0));
    if (!clean && (misses >= 2 || hintUsed)) stars -= 1;
    if (record) stars += 1;
    stars = clamp(stars, 2, 8);
    // медалі
    const medals = [];
    const solvedNow = (p.solved || 0) + 1;
    const add = id => { const m = 'edu.logic.' + id; if (!p.medals.includes(m) && !medals.includes(m)) medals.push(m); };
    add('mFirst');
    if (solvedNow >= 10) add('m10');
    if (solvedNow >= 50) add('m50');
    if (solvedNow >= 200) add('m200');
    if (type === 'sudoku') { add('mSudoku'); if (P.N === 9) add('mSudoku9'); }
    if (type === 'hanoi') add('mHanoi');
    if (type === 'pattern' && p.patStreak >= 10) add('mPattern10');
    if (type === 'pairs' && ((P.cols * P.rows >= 12 && P.moves <= Math.ceil(P.cards.length / 2 * 1.5)))) add('mMemory'); // лише за пам'ять, не за кількість ігор
    // раунд
    p.roundPos++;
    const roundDone = p.roundPos >= p.roundTypes.length;
    const doneLevel = p.level;
    if (roundDone) {
      p.level++; p.best = Math.max(p.best || 0, p.level); p.roundTypes = null; p.roundPos = 0;
      [10, 25, 50, 100].forEach(L => { if (p.level >= L) add('mLevel' + L); });
    }
    // нарахування (перша медаль — через хаб, решта — тим самим способом, що й хаб)
    ctx.win({ stars, medal: medals[0] || null });
    medals.slice(1).forEach(m => {
      if (!p.medals.includes(m)) { p.medals.push(m); document.dispatchEvent(new CustomEvent('bo:eduMedal', { detail: { game: 'logic', medal: m } })); }
    });
    ctx.save();
    // ефекти
    updateHead();
    confetti(roundDone ? 46 : 22);
    bubble('+' + stars + ' ⭐', 'lgPopStar');
    if (record) later(() => { bubble('🏆 ' + T('record'), 'lgPopRec'); sfx('record'); }, 700);
    let delay = 1250;
    medals.forEach((m, i) => later(() => medalToast(m), 600 + i * 1700));
    if (medals.length) delay = Math.max(delay, 600 + medals.length * 1700);
    if (roundDone) later(() => roundOverlay(doneLevel), delay);
    else later(nextPuzzle, delay);
  }

  function medalToast(m) {
    const t = el('div', 'lgMedal', '<b>🏅</b><span class="lgMedalNew"></span><span class="lgMedalName"></span>');
    t.querySelector('.lgMedalNew').textContent = T('medalNew');
    t.querySelector('.lgMedalName').textContent = BO.t(m);
    root.querySelector('.lgFx').appendChild(t);
    sfx('fanfare');
    later(() => t.remove(), 1650);
  }

  function roundOverlay(lvl) {
    const o = el('div', 'lgRound', '<div class="lgTrophy">🏆</div><div class="lgRoundTxt"></div><div class="lgRoundStars"></div><button type="button" class="lgNext"></button>');
    o.querySelector('.lgRoundTxt').textContent = T('roundDone', { n: lvl });
    o.querySelector('.lgRoundStars').textContent = '⭐ ⭐ ⭐';
    const b = o.querySelector('.lgNext');
    b.textContent = T('next') + ' ▶';
    b.addEventListener('click', () => { o.remove(); nextPuzzle(); });
    root.querySelector('.lgFx').appendChild(o);
    sfx('fanfare');
    confetti(30);
  }

  /* ===================== відображення загадок ===================== */
  function bodySize(body) { const r = body.getBoundingClientRect(); return { W: Math.max(240, r.width), H: Math.max(300, r.height) }; }

  // спільне: варіанти відповіді (візерунок, зайве, тінь, матриця)
  function optionRow(P, body, size, cls) {
    const row = el('div', 'lgOpts ' + (cls || ''));
    P.options.forEach((it, i) => {
      const b = el('button', 'lgOpt', itemHTML(it));
      b.type = 'button'; b.dataset.i = i;
      b.style.width = b.style.height = size + 'px';
      b.style.fontSize = Math.round(size * 0.58) + 'px';
      b.addEventListener('click', () => {
        if (busy || b.classList.contains('lgNo')) return;
        if (i === P.ans) { b.classList.add('lgYes'); if (P.onRight) P.onRight(it); solved(); }
        else { b.classList.add('lgNo'); miss(b); }
      });
      row.appendChild(b);
    });
    body.appendChild(row);
    P.hint = () => {
      const right = row.querySelector(`.lgOpt[data-i="${P.ans}"]`);
      right.classList.add('lgGlow');
      const wrong = [...row.querySelectorAll('.lgOpt:not(.lgNo)')].filter(b => +b.dataset.i !== P.ans);
      if (wrong.length > 1) wrong[0].classList.add('lgNo');
    };
    P.handTarget = P.handTarget || (() => row.querySelector(`.lgOpt[data-i="${P.ans}"]`) && row);
    return row;
  }

  const RENDER = {};

  RENDER.pattern = (P, body) => {
    const { W } = bodySize(body);
    const total = P.seq.length, perRow = total > 6 ? Math.ceil(total / 2) : total;
    const s = clamp(Math.floor((W - 16 - (perRow - 1) * 6) / perRow), 40, P.num ? 72 : 66);
    const seq = el('div', 'lgSeq' + (P.num ? ' lgSeqNum' : ''));
    seq.style.maxWidth = (perRow * (s + 6)) + 'px';
    P.seq.forEach((it, i) => {
      const c = el('div', 'lgTile' + (i === P.blank ? ' lgBlank' : ''), i === P.blank ? '<b>?</b>' : itemHTML(it));
      c.style.width = c.style.height = s + 'px';
      c.style.fontSize = Math.round(s * 0.62) + 'px';
      seq.appendChild(c);
    });
    body.appendChild(seq);
    const nO = P.options.length;
    const os = clamp(Math.floor((W - 16 - (nO - 1) * 10) / nO), 48, P.num ? 84 : 88);
    optionRow(P, body, os);
    P.onRight = it => { const b = seq.children[P.blank]; b.classList.remove('lgBlank'); b.classList.add('lgFilled'); b.innerHTML = itemHTML(it); };
    P.handTarget = () => seq.children[P.blank];
  };

  RENDER.odd = (P, body) => {
    const { W } = bodySize(body);
    const n = P.options.length;
    const s = clamp(Math.floor((W - 16 - (n - 1) * 10) / n), 56, 104);
    optionRow(P, body, s, 'lgOddRow');
    P.handTarget = () => body.querySelector('.lgOpts');
  };

  RENDER.shadow = (P, body) => {
    const { W } = bodySize(body);
    const t = el('div', 'lgShadowTarget', `<span class="lgEmo">${P.target}</span>`);
    body.appendChild(t);
    const n = P.options.length;
    const s = clamp(Math.floor((W - 16 - (n - 1) * 10) / n), 56, 92);
    optionRow(P, body, s, 'lgShadowOpts');
    P.handTarget = () => body.querySelector('.lgOpts');
  };

  RENDER.matrix = (P, body) => {
    const { W, H } = bodySize(body);
    const g = el('div', 'lgMatrix');
    const cs = clamp(Math.floor(Math.min(W - 40, H * 0.52) / 3) - 6, 62, 104);
    P.cells.forEach((it, i) => {
      const c = el('div', 'lgTile' + (i === P.miss ? ' lgBlank' : ''), i === P.miss ? '<b>?</b>' : shapeSVG(it));
      c.style.width = c.style.height = cs + 'px';
      g.appendChild(c);
    });
    body.appendChild(g);
    const n = P.options.length, perRow = n > 4 ? 3 : 4;
    const os = clamp(Math.floor((W - 16 - (perRow - 1) * 10) / perRow), 56, n > 4 ? 76 : 80);
    const row = optionRow(P, body, os, n > 4 ? 'lgOpts3' : '');
    row.style.maxWidth = (perRow * (os + 10)) + 'px';
    P.onRight = it => { const b = g.children[P.miss]; b.classList.remove('lgBlank'); b.classList.add('lgFilled'); b.innerHTML = shapeSVG(it); };
    P.handTarget = () => g.children[P.miss];
  };

  RENDER.pairs = (P, body) => {
    const { W, H } = bodySize(body);
    const gap = P.cols >= 4 ? 7 : 10;
    const cs = clamp(Math.floor(Math.min((W - 8 - (P.cols - 1) * gap) / P.cols, (H - 40 - (P.rows - 1) * gap) / P.rows)), 48, 112);
    const grid = el('div', 'lgPairs');
    grid.style.gridTemplateColumns = `repeat(${P.cols}, ${cs}px)`; grid.style.gap = gap + 'px';
    const info = el('div', 'lgInfo');
    P.moves = 0; P.open = []; P.matched = new Array(P.cards.length).fill(false);
    let wrongs = 0, peeked = false;
    const bestKey = 'pairs' + P.cols + 'x' + P.rows;
    const showInfo = () => {
      const best = p.bestMoves[bestKey];
      info.textContent = T('moves', { n: P.moves }) + (best ? '  ·  ' + T('best', { v: best }) : '');
    };
    P.cards.forEach((e, i) => {
      const b = el('button', 'lgCard', `<span class="lgFace lgBack"></span><span class="lgFace lgFront"><span class="lgEmo">${e}</span></span>`);
      b.type = 'button'; b.dataset.i = i;
      b.style.width = b.style.height = cs + 'px';
      b.style.fontSize = Math.round(cs * 0.56) + 'px';
      b.addEventListener('click', () => flip(i, b));
      grid.appendChild(b);
    });
    body.appendChild(grid); body.appendChild(info); showInfo();
    const cardEl = i => grid.children[i];
    function flip(i, b) {
      if (busy || P.lock || P.matched[i] || P.open.includes(i)) return;
      b.classList.add('up'); P.open.push(i);
      if (P.open.length < 2) return;
      P.moves++; showInfo();
      const [x, y] = P.open;
      if (P.cards[x] === P.cards[y]) {
        P.matched[x] = P.matched[y] = true; P.open = [];
        later(() => { cardEl(x).classList.add('done'); cardEl(y).classList.add('done'); }, 250);
        if (P.matched.every(Boolean)) {
          const best = p.bestMoves[bestKey];
          if (!best || P.moves < best) p.bestMoves[bestKey] = P.moves;
          later(solved, 450);
        }
      } else {
        P.lock = true; wrongs++;
        later(() => { cardEl(x).classList.remove('up'); cardEl(y).classList.remove('up'); P.open = []; P.lock = false;
          if (!peeked && wrongs >= P.cards.length / 2 + 2) { peeked = true; peek(true); } }, 850);
      }
    }
    function peek(auto) {
      if (P.lock) return;
      if (!auto) hintUsed = true;
      P.lock = true;
      const hidden = [...grid.children].filter((c, i) => !P.matched[i] && !P.open.includes(i));
      hidden.forEach(c => c.classList.add('up', 'peek'));
      later(() => { hidden.forEach(c => c.classList.remove('up', 'peek')); P.lock = false; }, 1100);
    }
    P.hint = () => peek(false);
    P.handTarget = () => grid.children[0];
  };

  RENDER.sudoku = (P, body) => {
    const { W, H } = bodySize(body);
    const N = P.N, [br, bc] = BOXES[N];
    const palRows = N === 9 ? 2 : 1, palPer = Math.ceil(N / palRows);
    const palS = clamp(Math.floor((W - 8 - (palPer - 1) * 8) / palPer), 44, 64);
    const cs = Math.floor(clamp(Math.min((W - 6) / N, (H - palRows * (palS + 8) - 20) / N), 30, 76));
    P.grid = P.puzzle.slice(); P.sel = -1;
    const grid = el('div', 'lgSdk lgSdk' + N + (P.pics ? ' lgSdkPics' : ''));
    grid.style.gridTemplateColumns = `repeat(${N}, ${cs}px)`;
    grid.style.fontSize = Math.round(cs * (P.pics ? 0.62 : 0.56)) + 'px';
    const sym = v => v ? (P.pics ? P.pics[v - 1] : String(v)) : '';
    for (let i = 0; i < N * N; i++) {
      const r = (i / N) | 0, c = i % N;
      const b = el('button', 'lgCell' + (P.puzzle[i] ? ' given' : ''), sym(P.puzzle[i]));
      b.type = 'button'; b.dataset.i = i;
      b.style.width = b.style.height = cs + 'px';
      if (c % bc === bc - 1 && c < N - 1) b.classList.add('bR');
      if (r % br === br - 1 && r < N - 1) b.classList.add('bB');
      b.addEventListener('click', () => select(i));
      grid.appendChild(b);
    }
    body.appendChild(grid);
    const pal = el('div', 'lgPalette');
    pal.style.maxWidth = (palPer * (palS + 8)) + 'px';
    for (let v = 1; v <= N; v++) {
      const b = el('button', 'lgPal', sym(v));
      b.type = 'button'; b.dataset.v = v;
      b.style.width = b.style.height = palS + 'px';
      b.style.fontSize = Math.round(palS * (P.pics ? 0.56 : 0.5)) + 'px';
      b.addEventListener('click', () => place(v, b));
      pal.appendChild(b);
    }
    body.appendChild(pal);
    const cellEl = i => grid.children[i];
    function select(i) {
      if (busy || P.grid[i] && P.puzzle[i]) return;
      if (P.grid[i]) return;
      P.sel = i;
      const r = (i / N) | 0, c = i % N, r0 = r - r % br, c0 = c - c % bc;
      [...grid.children].forEach((e, k) => {
        const rr = (k / N) | 0, cc = k % N;
        e.classList.toggle('sel', k === i);
        e.classList.toggle('peer', k !== i && (rr === r || cc === c || (rr >= r0 && rr < r0 + br && cc >= c0 && cc < c0 + bc)));
      });
    }
    function firstEmpty() {
      // клітинка з найменшою кількістю варіантів — найлегша для дитини
      let best = -1, bc2 = 99;
      for (let i = 0; i < N * N; i++) {
        if (P.grid[i]) continue;
        let k = 0; const r = (i / N) | 0, c = i % N;
        for (let v = 1; v <= N; v++) if (sdkOk(P.grid, N, br, bc, r, c, v)) k++;
        if (k < bc2) { bc2 = k; best = i; }
      }
      return best;
    }
    function place(v, btn) {
      if (busy) return;
      if (P.sel < 0 || P.grid[P.sel]) { const f = firstEmpty(); if (f < 0) return; select(f); }
      const i = P.sel, e = cellEl(i);
      if (P.sol[i] === v) {
        P.grid[i] = v; e.textContent = sym(v); e.classList.add('ok'); e.classList.remove('sel', 'lgGlow');
        if (P.grid.every((x, k) => x === P.sol[k])) { [...grid.children].forEach(x => x.classList.remove('peer')); return solved(); }
        const f = firstEmpty(); if (f >= 0) select(f);
      } else {
        e.textContent = sym(v); e.classList.add('bad');
        later(() => { e.classList.remove('bad'); if (!P.grid[i]) e.textContent = ''; }, 600);
        miss(e); shake(btn);
      }
    }
    P.hint = () => {
      const i = P.sel >= 0 && !P.grid[P.sel] ? P.sel : firstEmpty(); if (i < 0) return;
      select(i);
      const e = cellEl(i); P.grid[i] = P.sol[i]; e.textContent = sym(P.sol[i]); e.classList.add('ok', 'lgGlow'); e.classList.remove('sel');
      if (P.grid.every((x, k) => x === P.sol[k])) return solved();
      const f = firstEmpty(); if (f >= 0) select(f);
    };
    P.onKey = ev => { const v = parseInt(ev.key, 10); if (v >= 1 && v <= N) { const b = pal.children[v - 1]; place(v, b); } };
    select(firstEmpty());
    P.handTarget = () => cellEl(P.sel);
    P.timeKey = P.timeKey;
  };

  RENDER.maze = (P, body) => {
    const { W, H } = bodySize(body);
    const padS = clamp(Math.floor(Math.min(W / 4.2, 64)), 48, 64);
    const cs = Math.floor(clamp(Math.min((W - 8) / P.C, (H - padS * 2 - 26) / P.R), 30, 72));
    const grid = el('div', 'lgMaze');
    grid.style.gridTemplateColumns = `repeat(${P.C}, ${cs}px)`;
    grid.style.fontSize = Math.round(cs * 0.66) + 'px';
    P.pos = P.start; P.trail = new Set([P.start]);
    for (let i = 0; i < P.R * P.C; i++) {
      const w = P.walls[i], c = el('div', 'lgMz');
      c.style.width = c.style.height = cs + 'px';
      if (!(w & 1)) c.classList.add('wU'); if (!(w & 2)) c.classList.add('wR');
      if (!(w & 4)) c.classList.add('wD'); if (!(w & 8)) c.classList.add('wL');
      if (i === P.goal) c.innerHTML = '<span class="lgGoal">⭐</span>';
      c.addEventListener('click', () => tapCell(i));
      grid.appendChild(c);
    }
    const hero = el('div', 'lgHero', '🦎');
    hero.style.width = hero.style.height = cs + 'px';
    grid.appendChild(hero);
    body.appendChild(grid);
    const pad = el('div', 'lgPad');
    pad.style.gridTemplateColumns = `repeat(3, ${padS}px)`;
    [['', ''], ['u', '⬆️'], ['', ''], ['l', '⬅️'], ['', ''], ['r', '➡️'], ['', ''], ['d', '⬇️'], ['', '']].forEach(([d, t]) => {
      if (!d) { pad.appendChild(el('span')); return; }
      const b = el('button', 'lgArrow', t); b.type = 'button'; b.dataset.d = d;
      b.style.width = b.style.height = padS + 'px';
      b.addEventListener('click', () => go(d));
      pad.appendChild(b);
    });
    body.appendChild(pad);
    const C = P.C;
    const place = () => {
      hero.style.transform = `translate(${(P.pos % C) * cs}px, ${((P.pos / C) | 0) * cs}px)`;
      [...grid.children].forEach((c, i) => { if (c.classList.contains('lgMz')) c.classList.toggle('trail', P.trail.has(i)); });
    };
    place();
    const canGo = (i, d) => !!(P.walls[i] & DIRS[d][2]);
    const stepTo = (i, d) => ((i / C | 0) + DIRS[d][0]) * C + (i % C) + DIRS[d][1];
    function go(d) {
      if (busy) return;
      if (!canGo(P.pos, d)) { miss(hero); return; }
      // їде прямим коридором до розвилки / повороту
      let cur = stepTo(P.pos, d), guard = 0;
      P.trail.add(cur);
      const opp = { u: 'd', d: 'u', l: 'r', r: 'l' }[d];
      while (cur !== P.goal && guard++ < 40) {
        const exits = Object.keys(DIRS).filter(k => canGo(cur, k));
        if (exits.length === 2 && exits.includes(opp) && exits.includes(d)) { cur = stepTo(cur, d); P.trail.add(cur); } else break;
      }
      P.pos = cur; place();
      if (cur === P.goal) later(solved, 250);
    }
    function tapCell(i) {
      const py = (P.pos / C) | 0, px = P.pos % C, y = (i / C) | 0, x = i % C;
      if (y === py && x === px) return;
      if (Math.abs(y - py) >= Math.abs(x - px)) go(y < py ? 'u' : 'd'); else go(x < px ? 'l' : 'r');
    }
    // свайпи
    let sx = 0, sy = 0, st = false;
    grid.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = true; }, { passive: true });
    grid.addEventListener('touchend', e => {
      if (!st) return; st = false;
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      e.preventDefault();
      go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u'));
    });
    P.onKey = ev => { const m = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r' }[ev.key]; if (m) { ev.preventDefault(); go(m); } };
    P.hint = () => {
      let cur = P.pos;
      mazePath(P, P.pos).slice(0, 5).forEach((d, k) => {
        cur = stepTo(cur, d);
        const c = grid.children[cur]; later(() => { c.classList.add('hintPath'); later(() => c.classList.remove('hintPath'), 1800); }, k * 120);
      });
    };
    P.handTarget = () => pad.querySelector('.lgArrow[data-d="' + (mazePath(P, P.pos)[0] || 'r') + '"]');
  };

  RENDER.hanoi = (P, body) => {
    const { W, H } = bodySize(body);
    const box = el('div', 'lgHanoi');
    const pw = Math.floor((W - 24) / 3), ph = clamp(Math.floor(H - 90), 170, 300);
    const dh = clamp(Math.floor((ph - 40) / (P.n + 1)), 20, 34);
    P.sel = -1; P.moves = 0;
    const info = el('div', 'lgInfo');
    const pegs = [0, 1, 2].map(k => {
      const b = el('button', 'lgPeg' + (k === 2 ? ' target' : ''), '<span class="lgRod"></span><span class="lgFlag">' + (k === 2 ? '🎯' : '') + '</span>');
      b.type = 'button'; b.dataset.p = k;
      b.style.width = pw + 'px'; b.style.height = ph + 'px';
      b.addEventListener('click', () => tapPeg(k));
      box.appendChild(b); return b;
    });
    body.appendChild(box); body.appendChild(info);
    const hues = ['#ff5560', '#ff9a2e', '#ffd23f', '#34c96a', '#3d8bff', '#a46bff'];
    function draw() {
      pegs.forEach((b, k) => {
        b.querySelectorAll('.lgDisc').forEach(d => d.remove());
        P.pegs[k].forEach((d, j) => {
          const e = el('span', 'lgDisc');
          const wv = 30 + (d / P.n) * 62;
          e.style.width = wv + '%'; e.style.height = dh + 'px'; e.style.bottom = (10 + j * (dh + 2)) + 'px';
          e.style.background = hues[(d - 1) % hues.length];
          if (k === P.sel && j === P.pegs[k].length - 1) e.classList.add('up');
          b.appendChild(e);
        });
        b.classList.toggle('sel', k === P.sel);
      });
      info.textContent = T('moves', { n: P.moves }) + '  ·  🎯 ' + P.optimal;
    }
    function tapPeg(k) {
      if (busy) return;
      pegs.forEach(b => b.classList.remove('lgGlow'));
      if (P.sel < 0) { if (P.pegs[k].length) { P.sel = k; draw(); } else shake(pegs[k]); return; }
      if (P.sel === k) { P.sel = -1; draw(); return; }
      const from = P.pegs[P.sel], to = P.pegs[k], d = from[from.length - 1];
      if (to.length && to[to.length - 1] < d) { P.sel = -1; draw(); miss(pegs[k]); return; }
      to.push(from.pop()); P.sel = -1; P.moves++; draw();
      if (P.pegs[2].length === P.n) later(solved, 300);
    }
    draw();
    P.hint = () => {
      const m = hanoiNext(P.pegs, P.n); if (!m) return;
      P.sel = -1; draw();
      pegs[m[0]].classList.add('lgGlow');
      later(() => { pegs[m[0]].classList.remove('lgGlow'); pegs[m[1]].classList.add('lgGlow'); }, 700);
      later(() => pegs[m[1]].classList.remove('lgGlow'), 1900);
    };
    P.handTarget = () => pegs[0];
  };

  /* ===================== запуск ===================== */
  function start(h, c) {
    host = h; ctx = c;
    initProgress();
    buildShell();
    nextPuzzle();
  }
  function stop() {
    timers.forEach(clearTimeout); timers = [];
    clearInterval(tickT); tickT = null;
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    keyHandler = null; host = null; root = null; P = null;
    if (ctx) ctx.save();
    ctx = null; p = null;
  }

  BO.edu.register({ id: 'logic', slot: 3, icon: '🧩', start, stop });

  /* ===================== для автотестів ===================== */
  function debugCurrent() {
    if (!P) return null;
    const d = { id: P.id, type: P.type, tier: P.tier, soft: P.soft, level: p && p.level, roundPos: p && p.roundPos, misses, hintUsed, busy };
    if ('ans' in P) { d.ans = P.ans; d.nOptions = P.options.length; }
    if (P.type === 'odd') { d.items = P.items; d.kind = P.kind; d.oddSet = [...oddSet(P.items, oddKeys(P))]; }
    if (P.type === 'pairs') { d.cards = P.cards; d.cols = P.cols; d.rows = P.rows; d.moves = P.moves; }
    if (P.type === 'sudoku') { d.N = P.N; d.sol = P.sol; d.puzzle = P.puzzle; d.grid = P.grid; d.givens = P.givens; d.pics = !!P.pics; }
    if (P.type === 'maze') { d.pos = P.pos; d.goal = P.goal; d.size = P.R; d.path = mazePath(P, P.pos); }
    if (P.type === 'hanoi') { d.n = P.n; d.pegs = P.pegs; d.next = hanoiNext(P.pegs, P.n); d.moves = P.moves; }
    return d;
  }
  window.__eduLogicDebug = {
    current: debugCurrent,
    plan: PLAN,
    gen: (type, tier, soft, band) => GEN[type](tier, !!soft, band || 9),
    sudokuCount: (g, N) => sdkCount(g, N, 2),
    sudokuValid(sol, N) {
      const [br, bc] = BOXES[N];
      for (let i = 0; i < N * N; i++) { const v = sol[i]; sol[i] = 0; const ok = v >= 1 && v <= N && sdkOk(sol, N, br, bc, (i / N) | 0, i % N, v); sol[i] = v; if (!ok) return false; }
      return true;
    },
    oddCheck(P) { return [...oddSet(P.items, oddKeys(P))]; },
    hanoiNext,
    seed(s) { seed = s >>> 0 || 1; },
  };
})();
