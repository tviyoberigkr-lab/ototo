/* OTOTO — навчальна гра «Математика» (слот 1 модуля «Навчання»). CoLaba Production.

   Підключається ПІСЛЯ edu.js і реєструється через BO.edu.register (контракт — у шапці edu.js).
   Тексти: ключі 'edu.math.*' у lang/*.js (джерело — i18n_edu_math.json).

   ЯК ГРАЄТЬСЯ
   • Раунд = 5–8 коротких завдань (3–6 років: 5, 7–10: 6, 11+: 8). Після раунду: зірки ⭐, рівень +1.
   • Завдання генеруються кодом (нескінченно, без повторів поспіль) за віком ctx.band (3…14)
     і внутрішньою складністю d = 0…4 (адаптивно: 3 правильні з першої спроби поспіль → d +0.5,
     помилка → d −0.3). Дорослі (вік > 14) — band 14, стартова d = 2 + режим «На швидкість».
   • Помилка: «Спробуй ще раз!»; після 2-ї помилки гра показує правильну відповідь і йде далі.
   • 3–6 років: усе картинками (емодзі), великі цифри й кнопки, мінімум тексту.

   ЗІРКИ ЗА РАУНД: 3 + ⌊правильних з 1-ї спроби / 2⌋ + 1 за раунд без помилок + 1 за серію ≥ 10; максимум 8.
   ШВИДКІСТЬ (вік ≥ 14): 60 с, бал = правильні відповіді; зірки = ⌊бал / 3⌋ (1…8); рекорд — progress.best.

   МЕДАЛІ (id → ключ назви 'edu.math.medal.<x>'): див. MEDALS нижче; видаються через ctx.win({medal}).
   Прогрес (ctx.progress): level, best, streak (поточна серія з 1-ї спроби), solved (рахує хаб),
   medals (хаб) + свої: tasks, rounds, perfects, bestStreak, diff, diffBand.

   Для тестів: BO.eduMath = { MEDALS, gen(band, d, type), types(band), setSpeedMs(ms), force(type), redraw() }.
   Кожне завдання пише в .mWrap[data-task] JSON з даними для незалежної перевірки відповіді. */
(function () {
  'use strict';
  const BO = window.BO;
  if (!BO || !BO.edu) return;

  /* ---------- медалі ---------- */
  const MEDALS = [
    { id: 'edu.math.first',      icon: '🎒' },
    { id: 'edu.math.tasks10',    icon: '✏️' },
    { id: 'edu.math.tasks50',    icon: '📘' },
    { id: 'edu.math.tasks100',   icon: '💯' },
    { id: 'edu.math.tasks250',   icon: '🧮' },
    { id: 'edu.math.tasks500',   icon: '🎓' },
    { id: 'edu.math.tasks1000',  icon: '🏛️' },
    { id: 'edu.math.streak10',   icon: '🔥' },
    { id: 'edu.math.streak25',   icon: '☄️' },
    { id: 'edu.math.perfect',    icon: '✨' },
    { id: 'edu.math.perfect10',  icon: '🌟' },
    { id: 'edu.math.level5',     icon: '🥉' },
    { id: 'edu.math.level10',    icon: '🥈' },
    { id: 'edu.math.level25',    icon: '🥇' },
    { id: 'edu.math.level50',    icon: '🏆' },
    { id: 'edu.math.level100',   icon: '👑' },
    { id: 'edu.math.speed20',    icon: '⚡' },
  ];
  MEDALS.forEach(m => { m.key = 'edu.math.medal.' + m.id.slice(9); });
  const medalById = id => MEDALS.find(m => m.id === id);

  /* ---------- утиліти ---------- */
  const R = (a, b) => { a = Math.ceil(a); b = Math.floor(b); return b <= a ? a : a + Math.floor(Math.random() * (b - a + 1)); };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const L = (lo, hi, d) => Math.round(lo + (hi - lo) * clamp(d, 0, 4) / 4);   // діапазон за складністю d 0…4
  const M = '−';                                                                // типографський мінус
  const fmt = n => (n < 0 ? M + Math.abs(n) : String(n));
  const par = n => (n < 0 ? '(' + fmt(n) + ')' : fmt(n));                       // від'ємне в дужках
  const apar = n => (n < 0 ? '(' + n + ')' : String(n));                        // те саме для ASCII-виразу тесту
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const OBJ = ['🍎', '🐟', '⭐', '🎈', '🐞', '🍓', '🐥', '🌸', '🍪', '🚗', '🦋', '🧸', '🍊', '🐸', '⚽', '🌼'];
  const ITEMS = ['🍦', '🍎', '🧃', '🍪', '🎈', '🧸', '✏️', '🍌', '🍩', '🪁'];
  function snd(name) { try { if (window.BO_SOUND) window.BO_SOUND.play(name); } catch (e) {} }

  /* ---------- варіанти відповіді ---------- */
  function choices(ans, n, min) {
    min = min === undefined ? 0 : min;
    const set = new Set([ans]);
    const deltas = shuffle([1, -1, 2, -2, 3, -3]);
    if (Math.abs(ans) >= 10) deltas.unshift(pick([10, -10]));
    for (const dl of deltas) { if (set.size >= n) break; if (ans + dl >= min) set.add(ans + dl); }
    let k = 4; while (set.size < n) set.add(ans + k++);
    return [...set].sort((a, b) => a - b).map(v => ({ v: String(v), html: fmt(v) }));
  }
  const numTask = (o) => Object.assign({ input: 'choice' }, o);

  /* ---------- візуали ---------- */
  function objsHtml(n, e, cls) {
    const size = n <= 5 ? 'mS1' : n <= 10 ? 'mS2' : 'mS3';
    let h = '<div class="mObjs ' + size + (cls ? ' ' + cls : '') + '">';
    for (let i = 0; i < n; i++) h += '<span class="mObj">' + e + '</span>';
    return h + '</div>';
  }
  const exprHtml = s => {
    const len = s.replace(/<[^>]+>/g, '').length;
    return '<div class="mExpr ' + (len <= 10 ? 'mE1' : len <= 15 ? 'mE2' : 'mE3') + '">' + s + '</div>';
  };
  const Q = '<b class="mQm">?</b>';
  function pizzaSvg(n, k) {
    const r = 70, c = 76, start = R(0, n - 1);
    let h = '<svg class="mPizza" viewBox="0 0 152 152" aria-hidden="true"><circle cx="76" cy="76" r="74" class="mCrust"/>';
    for (let i = 0; i < n; i++) {
      const a0 = (-90 + i * 360 / n) * Math.PI / 180, a1 = (-90 + (i + 1) * 360 / n) * Math.PI / 180;
      const x0 = c + r * Math.cos(a0), y0 = c + r * Math.sin(a0), x1 = c + r * Math.cos(a1), y1 = c + r * Math.sin(a1);
      const on = ((i - start + n) % n) < k;
      h += '<path class="mSl' + (on ? ' on' : '') + '" d="M76 76 L' + x0.toFixed(2) + ' ' + y0.toFixed(2) +
        ' A' + r + ' ' + r + ' 0 0 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' Z"/>';
    }
    return h + '</svg>';
  }
  const fracHtml = (a, b) => '<span class="mFr"><b>' + a + '</b><i>' + b + '</i></span>';

  /* ---------- генератори завдань: (band b, складність d) → task ---------- */
  const G = {};

  // 3–6: порахуй предмети
  G.count = (b, d) => {
    const max = b <= 3 ? L(4, 6, d) : b === 4 ? L(6, 10, d) : b === 5 ? L(8, 15, d) : L(10, 20, d);
    const n = R(Math.max(1, Math.ceil(max / 3)), max), e = pick(OBJ);
    return numTask({ type: 'count', sig: 'c' + n, q: 'q.count', vis: objsHtml(n, e), answer: String(n),
      options: choices(n, b <= 4 ? 3 : 4, 1), data: { t: 'count' } });
  };
  // 3–6: торкнись стількох
  G.tap = (b, d) => {
    const max = b <= 3 ? L(3, 5, d) : b === 4 ? L(4, 8, d) : L(6, 10, d);
    const n = R(1, max), total = Math.min(12, n + R(1, 4)), e = pick(OBJ);
    return { type: 'tap', input: 'tap', sig: 't' + n + total, q: 'q.tap', n, total, e, answer: String(n),
      vis: '<div class="mTapHead"><b class="mTapN">' + n + '</b><span class="mTapE">' + e + '</span></div>', data: { t: 'tap', n } };
  };
  // 3–6: де більше / менше
  G.groups = (b, d) => {
    const max = b <= 3 ? 5 : b === 4 ? 8 : 10, diff = Math.max(1, L(3, 1, d));
    let x = R(1, max - diff), y = x + R(diff, Math.min(max - x, diff + 2));
    if (Math.random() < 0.5) [x, y] = [y, x];
    const which = (b <= 3 && d < 2) ? 'more' : pick(['more', 'less']);
    const ans = which === 'more' ? (x > y ? 0 : 1) : (x < y ? 0 : 1);
    return { type: 'groups', input: 'groups', vis: '', sig: 'g' + x + y + which, q: 'q.' + which, counts: [x, y], e: pick(OBJ),
      answer: String(ans), data: { t: 'groups', which } };
  };
  // 4–6: додавання з картинками / числами
  G.addPic = (b, d) => {
    const lim = b <= 4 ? 5 : b === 5 ? L(5, 10, d) : L(10, 20, d);
    const s = R(2, lim), a = R(1, s - 1), c = s - a, e = pick(OBJ);
    const vis = s <= 10
      ? '<div class="mSum">' + objsHtml(a, e, 'mSm') + '<b class="mOp">+</b>' + objsHtml(c, e, 'mSm') + '</div>' + exprHtml(a + ' + ' + c + ' = ' + Q)
      : exprHtml(a + ' + ' + c + ' = ' + Q);
    return numTask({ type: 'addPic', sig: 'a' + a + '+' + c, q: 'q.total', vis, answer: String(s), options: choices(s, b <= 4 ? 3 : 4),
      data: { t: 'expr', expr: a + '+' + c + '=?' } });
  };
  // 5–6: віднімання — частину предметів закреслено
  G.subPic = (b, d) => {
    const lim = b === 5 ? L(5, 10, d) : L(10, 20, d);
    const a = R(2, lim), c = R(1, a - 1), e = pick(OBJ);
    let vis;
    if (a <= 10) {
      let h = '<div class="mObjs ' + (a <= 5 ? 'mS1' : 'mS2') + '">';
      for (let i = 0; i < a; i++) h += '<span class="mObj' + (i >= a - c ? ' mGone' : '') + '">' + e + '</span>';
      vis = h + '</div>' + exprHtml(a + ' ' + M + ' ' + c + ' = ' + Q);
    } else vis = exprHtml(a + ' ' + M + ' ' + c + ' = ' + Q);
    return numTask({ type: 'subPic', sig: 's' + a + '-' + c, q: 'q.left', vis, answer: String(a - c), options: choices(a - c, 4),
      data: { t: 'expr', expr: a + '-' + c + '=?' } });
  };
  // 5–6: сусіди числа
  G.neigh = (b, d) => {
    const lim = b === 5 ? L(10, 20, d) : L(20, 50, d);
    const s = R(0, lim - 2), miss = R(0, 2), items = [s, s + 1, s + 2];
    return seqTask('neigh', items, miss, b, 'q.missing');
  };
  // 7+: числові ряди з кроком
  G.seq = (b, d) => {
    const steps = b <= 7 ? [2, 5, 10] : b === 8 ? [2, 3, 4, 5, 10] : [3, 4, 6, 7, 8, 9, 11, 25, 50];
    let st = pick(steps); if (b >= 9 && Math.random() < 0.4) st = -st;
    const s0 = st > 0 ? R(0, L(20, b >= 9 ? 200 : 60, d)) : R(Math.abs(st) * 4, Math.abs(st) * 4 + L(20, 200, d));
    const items = [0, 1, 2, 3].map(i => s0 + i * st);
    const miss = Math.random() < 0.5 ? 3 : R(0, 3);
    return seqTask('seq', items, miss, b, miss === 3 ? 'q.seq' : 'q.missing');
  };
  function seqTask(type, items, miss, b, q) {
    const ans = items[miss];
    const vis = '<div class="mSeq">' + items.map((v, i) => '<span class="mCell' + (i === miss ? ' mMiss' : '') + '">' + (i === miss ? '?' : fmt(v)) + '</span>').join('') + '</div>';
    const pad = b >= 8;
    return { type, input: pad ? 'pad' : 'choice', sig: type + items.join(',') + miss, q, vis, answer: String(ans),
      options: pad ? null : choices(ans, 4), data: { t: 'seq', items: items.map((v, i) => (i === miss ? null : v)) } };
  }
  // 5–8: порівняй (<, =, >)
  G.cmp = (b, d) => {
    const lim = b <= 6 ? L(10, 20, d) : L(30, 100, d);
    let l, r, lh, rh, la, ra;
    if (b >= 7 && Math.random() < 0.5) {               // вираз проти числа
      const x = R(1, lim - 1), y = R(1, Math.max(1, lim - x));
      l = x + y; lh = x + ' + ' + y; la = x + '+' + y;
      r = Math.random() < 0.25 ? l : l + pick([1, -1, 2, -2, 10, -10]); if (r < 0) r = l + 1;
      rh = String(r); ra = rh;
    } else {
      l = R(0, lim); r = Math.random() < 0.2 ? l : R(0, lim); if (r === l && Math.random() < 0.5) r = l + 1;
      lh = String(l); rh = String(r); la = lh; ra = rh;
    }
    const sign = l < r ? '<' : l > r ? '>' : '=';
    return { type: 'cmp', input: 'choice', sig: 'cmp' + lh + rh, q: 'q.sign',
      vis: exprHtml(esc(lh) + ' <b class="mQm mBox">?</b> ' + esc(rh)), answer: sign,
      options: ['<', '=', '>'].map(s => ({ v: s, html: esc(s) })), data: { t: 'cmp', l: la, r: ra } };
  };
  // 6–10: додавання / віднімання
  G.add = (b, d) => {
    let a, c;
    if (b <= 6) { const s = R(Math.min(11, L(6, 20, d)), L(10, 20, d)); a = R(1, s - 1); c = s - a; }
    else if (b === 7) {
      if (d < 2) { a = R(1, 8) * 10; c = Math.random() < 0.5 ? R(1, 9) : R(1, 9 - a / 10) * 10; }
      else { a = R(11, 79); c = R(2, 99 - a); }
    } else if (b === 8) { a = R(15, 79); c = R(6, 99 - a); }
    else { const hi = b === 9 ? L(300, 1000, d) : L(1000, 10000, d); a = R(hi / 10, hi / 2 | 0); c = R(hi / 10, hi - a); }
    return arith(a, '+', c, a + c, b, 'q.calc');
  };
  G.sub = (b, d) => {
    let a, c;
    if (b <= 6) { a = R(L(6, 11, d), L(10, 20, d)); c = R(1, a - 1); }
    else if (b === 7) { a = d < 2 ? R(2, 9) * 10 + R(0, 9) : R(30, 99); c = d < 2 ? R(1, a % 10 || 1) : R(5, a - 5); }
    else if (b === 8) { a = R(30, 99); c = R(6, a - 4); }
    else { const hi = b === 9 ? L(300, 1000, d) : L(1000, 10000, d); a = R(hi / 3 | 0, hi); c = R(hi / 20 | 0, a - 1); }
    return arith(a, M, c, a - c, b, 'q.calc', a + '-' + c);
  };
  // 8–11: множення / ділення (таблиця, далі двоцифрові)
  function tableRange(b, d) { return b <= 8 ? [2, 3, 4, 5, 10].slice(0, L(3, 5, d)) : b === 9 ? (d < 2 ? [2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 7, 8, 9]) : [3, 4, 6, 7, 8, 9]; }
  G.mul = (b, d) => {
    let a, c;
    if (b >= 10 && d >= 2 && Math.random() < 0.5) { a = R(11, L(25, 99, d)); c = R(2, 9); }
    else { a = pick(tableRange(b, d)); c = R(2, b <= 8 ? 10 : 10); if (Math.random() < 0.5) [a, c] = [c, a]; }
    return arith(a, '×', c, a * c, b, 'q.calc', a + '*' + c);
  };
  G.div = (b, d) => {
    let c, q;
    if (b >= 10 && d >= 2 && Math.random() < 0.5) { c = R(2, 9); q = R(11, L(25, 60, d)); }
    else { c = pick(tableRange(b, d)); q = R(2, 10); }
    return arith(c * q, '÷', c, q, b, 'q.calc', (c * q) + '/' + c);
  };
  function arith(a, op, c, ans, b, q, ascii) {
    const pad = b >= 9 || (b >= 7 && Math.random() < 0.5);
    return { type: 'arith', input: pad ? 'pad' : 'choice', sig: a + op + c, q, vis: exprHtml(fmt(a) + ' ' + op + ' ' + fmt(c) + ' = ' + Q),
      answer: String(ans), options: pad ? null : choices(ans, 4), data: { t: 'expr', expr: (ascii || a + '+' + c) + '=?' } };
  }
  // 7–10: пропущене число
  G.missing = (b, d) => {
    let a, c, r, op, opA;                                   // a op c = r, одне з a / c сховане
    if (b <= 8 || Math.random() < 0.5) {
      const lim = b <= 7 ? L(20, 100, d) : 100;
      const big = R(Math.min(10, lim - 2), lim), small = R(1, big - 1);
      if (Math.random() < 0.5) { a = small; c = big - small; r = big; op = '+'; opA = '+'; }
      else { a = big; c = small; r = big - small; op = M; opA = '-'; }
    } else { a = pick(tableRange(b, d)); c = R(2, 10); r = a * c; op = '×'; opA = '*'; }
    const pos = R(0, 1);  // 0: a op ? = r ; 1: ? op c = r
    const left = pos === 0 ? fmt(a) + ' ' + op + ' ' + Q : Q + ' ' + op + ' ' + fmt(c);
    const asc = pos === 0 ? a + opA + '?' : '?' + opA + c;
    const ans = pos === 0 ? c : a;
    const pad = b >= 8 || Math.random() < 0.5;
    return { type: 'missing', input: pad ? 'pad' : 'choice', sig: 'm' + asc + r, q: 'q.missing', vis: exprHtml(left + ' = ' + r),
      answer: String(ans), options: pad ? null : choices(ans, 4), data: { t: 'expr', expr: asc + '=' + r } };
  };
  // 7–8: групи предметів = вступ до множення
  G.groupsMul = (b, d) => {
    const k = R(2, L(3, 5, d)), m = R(2, L(3, 5, d)), e = pick(OBJ);
    let h = '<div class="mGroupsRow">';
    for (let i = 0; i < k; i++) h += '<div class="mBag">' + objsHtml(m, e, 'mSm') + '</div>';
    h += '</div>' + exprHtml(k + ' × ' + m + ' = ' + Q);
    return numTask({ type: 'groupsMul', sig: 'gm' + k + 'x' + m, q: 'q.groups', vis: h, answer: String(k * m), options: choices(k * m, 4),
      data: { t: 'expr', expr: k + '*' + m + '=?' } });
  };
  // 8: поділи порівну
  G.shareDiv = (b, d) => {
    const k = R(2, L(3, 4, d)), q = R(2, L(3, 5, d)), e = pick(['🍬', '🍪', '🍓', '🍎']);
    const vis = objsHtml(k * q, e, 'mSm') + '<div class="mKids">' + '🧒'.repeat(k) + '</div>' + exprHtml((k * q) + ' ÷ ' + k + ' = ' + Q);
    return numTask({ type: 'shareDiv', sig: 'sd' + k + 'x' + q, q: 'q.share', vis, answer: String(q), options: choices(q, 4, 1),
      data: { t: 'expr', expr: (k * q) + '/' + k + '=?' } });
  };
  // 9–10: дроби — піца
  G.frac = (b, d) => {
    const n = pick(d < 2 ? [2, 3, 4] : [3, 4, 5, 6, 8]), k = R(1, n - 1);
    const cand = [[k + 1, n], [k - 1, n], [n - k, n], [k, n + 1], [k, n + 2], [k + 1, n + 1], [1, n - 1]]
      .filter(([x, y]) => x > 0 && y > x && Math.abs(x / y - k / n) > 1e-9);
    const seen = new Set([k + '/' + n]), opts = [{ v: k + '/' + n, html: fracHtml(k, n) }];
    for (const [x, y] of shuffle(cand)) { const s = x + '/' + y; if (opts.length >= 4) break; if (!seen.has(s)) { seen.add(s); opts.push({ v: s, html: fracHtml(x, y) }); } }
    return { type: 'frac', input: 'choice', sig: 'f' + k + '/' + n, q: 'q.frac', vis: pizzaSvg(n, k), answer: k + '/' + n,
      options: shuffle(opts), data: { t: 'frac' } };
  };
  // 10–11: дріб від числа
  G.fracOf = (b, d) => {
    const n = pick(b <= 10 ? [2, 3, 4, 5, 10] : [3, 4, 5, 6, 8, 10]), k = b <= 10 && d < 2 ? 1 : R(1, n - 1);
    const base = n * R(2, L(6, 15, d));
    return padTask('fracOf', 'q.calc', exprHtml(tt('of', { a: fracHtml(k, n), b: base }) + ' = ' + Q), base / n * k, k + '/' + n + '*' + base + '=?');
  };
  // 9–10: гроші (текстові задачі з емодзі)
  G.money = (b, d) => {
    const kind = pick(['left', 'total', 'share', 'two']), it = pick(ITEMS);
    let vars, ans, data;
    if (kind === 'left') { const a = R(2, L(5, 20, d)) * 5, p = R(1, a - 1); vars = { a, p, item: it }; ans = a - p; data = { a, p }; }
    else if (kind === 'total') { const p = R(2, L(9, 25, d)), n = R(2, L(5, 9, d)); vars = { p, n, item: it }; ans = p * n; data = { p, n }; }
    else if (kind === 'share') { const n = R(2, L(4, 9, d)), q = R(2, L(5, 10, d)); vars = { a: n * q, n }; ans = q; data = { a: n * q, n }; }
    else { const i2 = pick(ITEMS.filter(x => x !== it)), p1 = R(3, L(20, 99, d)), p2 = R(3, L(20, 99, d)); vars = { i1: it, i2, p1, p2 }; ans = p1 + p2; data = { p1, p2 }; }
    data.t = 'money'; data.kind = kind;
    return { type: 'money', input: 'pad', sig: 'mo' + kind + JSON.stringify(data), q: '', text: tt('m.' + kind, vars),
      vis: '<p class="mStory">' + esc(tt('m.' + kind, vars)) + '</p>', answer: String(ans), data };
  };
  function padTask(type, q, vis, ans, ascii, extra) {
    return Object.assign({ type, input: 'pad', sig: type + ascii, q, vis, answer: String(ans), data: { t: 'expr', expr: ascii } }, extra || {});
  }
  // 11+: від'ємні числа
  G.neg = (b, d) => {
    const hi = b <= 11 ? L(10, 20, d) : b <= 13 ? L(20, 50, d) : L(30, 100, d);
    const kind = b <= 11 ? pick(['+', '-']) : pick(['+', '-', '*', '/']);
    let a = R(-hi, hi), c = R(1, hi), ans, html, asc;
    if (kind === '+') { if (a >= 0) a = -R(1, hi); c = R(-hi, hi) || 1; ans = a + c; html = fmt(a) + ' + ' + par(c); asc = a + '+' + apar(c); }
    else if (kind === '-') { a = R(-hi, hi); c = R(-hi, hi) || 2; if (a - c >= 0 && a >= 0 && c >= 0) a = c - R(1, hi); ans = a - c; html = fmt(a) + ' ' + M + ' ' + par(c); asc = a + '-' + apar(c); }
    else if (kind === '*') { a = R(2, 12) * pick([-1, 1]); c = R(2, 12) * (a > 0 ? -1 : pick([-1, 1])); ans = a * c; html = par(a) + ' × ' + par(c); asc = apar(a) + '*' + apar(c); }
    else { c = R(2, 12) * pick([-1, 1]); const q = R(2, 12) * (c > 0 ? -1 : pick([-1, 1])); a = c * q; ans = q; html = par(a) + ' ÷ ' + par(c); asc = apar(a) + '/' + apar(c); }
    return padTask('neg', 'q.calc', exprHtml(html + ' = ' + Q), ans, asc + '=?', { neg: true });
  };
  // 11+: відсотки
  G.pct = (b, d) => {
    const ps = b <= 11 ? [10, 50, 25, 20] : b <= 12 ? [10, 20, 25, 50, 75, 5] : [5, 15, 30, 40, 60, 75, 12, 35];
    const p = pick(ps), g = 100 / gcd(p, 100);   // база кратна g → ціла відповідь
    const base = g * R(1, Math.max(2, Math.floor(L(300, b >= 13 ? 2000 : 800, d) / g)));
    return padTask('pct', 'q.calc', exprHtml(tt('pct', { a: p, b: base }) + ' = ' + Q), base * p / 100, p + '/100*' + base + '=?');
  };
  function gcd(a, b) { while (b) [a, b] = [b, a % b]; return a; }
  // 10+: порядок дій
  G.order = (b, d) => {
    const x = R(2, 9), y = R(2, 9), z = R(2, 9);
    const forms = b <= 10
      ? [[x + ' + ' + y + ' × ' + z, x + '+' + y + '*' + z], [x + ' × ' + y + ' ' + M + ' ' + Math.min(z, x * y - 1), x + '*' + y + '-' + Math.min(z, x * y - 1)],
         ['(' + x + ' + ' + y + ') × ' + z, '(' + x + '+' + y + ')*' + z]]
      : [[x + ' + ' + y + ' × ' + z, x + '+' + y + '*' + z],
         ['(' + x + ' + ' + y + ') × ' + z, '(' + x + '+' + y + ')*' + z],
         [(y * z + x) + ' ' + M + ' ' + (y * z) + ' ÷ ' + z, (y * z + x) + '-' + (y * z) + '/' + z],
         [x + ' × ' + y + ' ' + M + ' ' + z + ' × ' + 2, x + '*' + y + '-' + z + '*2']];
    if (b >= 12) {
      forms.push([x + ' + ' + y + '<sup>2</sup>', x + '+' + y + '**2'], ['(' + x + ' ' + M + ' ' + (x + y) + ') × ' + z, '(' + x + '-' + (x + y) + ')*' + z]);
      if (b >= 13) forms.push([z + ' × (' + x + '<sup>2</sup> ' + M + ' ' + y + ')', z + '*(' + x + '**2-' + y + ')'], ['(' + (x * y) + ' ÷ ' + x + ' + ' + z + ')<sup>2</sup>', '(' + (x * y) + '/' + x + '+' + z + ')**2']);
    }
    const [html, asc] = pick(forms);
    const ans = evalAscii(asc);
    return padTask('order', 'q.calc', exprHtml(html + ' = ' + Q), ans, asc + '=?', { neg: true });
  };
  // 11+: рівняння
  G.eq = (b, d) => {
    const X = '<i class="mX">x</i>';
    let x, html, asc;
    const kinds = b <= 11 ? ['add', 'sub'] : b === 12 ? ['add', 'sub', 'mul', 'divx'] : b === 13 ? ['mul', 'lin', 'lin', 'sub'] : ['lin', 'linneg', 'par', 'mul'];
    const k = pick(kinds), hi = b <= 11 ? L(20, 60, d) : L(30, 120, d);
    if (k === 'add') { x = R(1, hi); const a = R(1, hi); html = X + ' + ' + a + ' = ' + (x + a); asc = 'x+' + a + '=' + (x + a); }
    else if (k === 'sub') { x = R(2, hi); const a = R(1, x); html = X + ' ' + M + ' ' + a + ' = ' + (x - a); asc = 'x-' + a + '=' + (x - a); }
    else if (k === 'mul') { const a = R(2, 12); x = R(2, 12) * (b >= 14 ? pick([1, -1]) : 1); html = a + X + ' = ' + fmt(a * x); asc = a + '*x=' + (a * x); }
    else if (k === 'divx') { const a = R(2, 9); x = a * R(2, 12); html = X + ' ÷ ' + a + ' = ' + (x / a); asc = 'x/' + a + '=' + (x / a); }
    else if (k === 'lin') { const a = R(2, 9), c = R(1, 30); x = R(1, 12); html = a + X + ' + ' + c + ' = ' + (a * x + c); asc = a + '*x+' + c + '=' + (a * x + c); }
    else if (k === 'linneg') { const a = R(2, 9), c = R(1, 30); x = R(-12, 12) || 3; html = a + X + ' ' + M + ' ' + c + ' = ' + fmt(a * x - c); asc = a + '*x-' + c + '=' + (a * x - c); }
    else { const a = R(2, 6), c = R(1, 9); x = R(-6, 12) || 2; html = a + '(' + X + ' + ' + c + ') = ' + fmt(a * (x + c)); asc = a + '*(x+' + c + ')=' + (a * (x + c)); }
    return padTask('eq', 'q.x', exprHtml(html), x, asc, { neg: true });
  };
  // 12+: степені й корені
  G.pow = (b, d) => {
    const forms = [];
    const sq = R(2, b <= 12 ? 12 : 15); forms.push([sq + '<sup>2</sup>', sq + '**2', sq * sq]);
    const cb = R(2, b <= 12 ? 4 : 6); forms.push([cb + '<sup>3</sup>', cb + '**3', cb ** 3]);
    const e2 = R(3, b <= 12 ? 7 : 10); forms.push(['2<sup>' + e2 + '</sup>', '2**' + e2, 2 ** e2]);
    const e10 = R(2, b <= 12 ? 4 : 6); forms.push(['10<sup>' + e10 + '</sup>', '10**' + e10, 10 ** e10]);
    if (b >= 13) { const r = R(4, 20); forms.push(['√' + (r * r), 'sqrt(' + (r * r) + ')', r]); }
    if (b >= 14) { const n = R(2, 9); forms.push(['(' + M + n + ')<sup>3</sup>', '(-' + n + ')**3', -(n ** 3)]); const z = R(2, 9); forms.push([z + '<sup>0</sup>', z + '**0', 1]); }
    const f = pick(forms);
    return padTask('pow', 'q.calc', exprHtml(f[0] + ' = ' + Q), f[2], f[1] + '=?', { neg: b >= 14 });
  };
  // режим «На швидкість» — швидкі обчислення в голові
  G.speed = (b, d) => {
    const k = pick(['+', '-', '*', '*', '/', 'pct', 'sq']);
    if (k === '+') { const a = R(12, 99), c = R(12, 99); return arith(a, '+', c, a + c, 14, 'q.calc', a + '+' + c); }
    if (k === '-') { const a = R(30, 150), c = R(11, a); return arith(a, M, c, a - c, 14, 'q.calc', a + '-' + c); }
    if (k === '*') { const a = R(3, 12), c = R(3, 12); return arith(a, '×', c, a * c, 14, 'q.calc', a + '*' + c); }
    if (k === '/') { const c = R(3, 12), q = R(3, 12); return arith(c * q, '÷', c, q, 14, 'q.calc', (c * q) + '/' + c); }
    if (k === 'pct') { const p = pick([10, 20, 25, 50]), base = (100 / gcd(p, 100)) * R(1, 20); return padTask('pct', '', exprHtml(tt('pct', { a: p, b: base }) + ' = ' + Q), base * p / 100, p + '/100*' + base + '=?'); }
    const s = R(4, 15); return padTask('pow', 'q.calc', exprHtml(s + '<sup>2</sup> = ' + Q), s * s, s + '**2=?');
  };

  // безпечне обчислення ASCII-виразу генератора (лише цифри, + - * / ( ) і **)
  function evalAscii(s) {
    if (!/^[\d+\-*/() ]+$/.test(s)) return NaN;
    let i = 0;
    const peek = () => s[i], num = () => { let j = i; while (/\d/.test(s[i])) i++; return +s.slice(j, i); };
    function atom() { if (peek() === '(') { i++; const v = expr(); i++; return v; } if (peek() === '-') { i++; return -atom(); } return num(); }
    function power() { const v = atom(); if (s[i] === '*' && s[i + 1] === '*') { i += 2; return v ** power(); } return v; }
    function term() { let v = power(); while (peek() === '*' || peek() === '/') { const o = s[i++]; const w = power(); v = o === '*' ? v * w : v / w; } return v; }
    function expr() { let v = term(); while (peek() === '+' || peek() === '-') { const o = s[i++]; const w = term(); v = o === '+' ? v + w : v - w; } return v; }
    return expr();
  }

  /* ---------- які завдання на який вік (вага = як часто) ---------- */
  const TYPES = {
    3:  { count: 4, tap: 3, groups: 3 },
    4:  { count: 3, tap: 3, groups: 3, addPic: 1 },
    5:  { count: 2, tap: 2, groups: 1, addPic: 3, subPic: 2, neigh: 2 },
    6:  { addPic: 3, subPic: 3, neigh: 2, cmp: 2, count: 1, tap: 1 },
    7:  { add: 3, sub: 3, missing: 2, cmp: 1, groupsMul: 2, seq: 1 },
    8:  { add: 2, sub: 2, missing: 2, mul: 3, groupsMul: 1, shareDiv: 1, seq: 1 },
    9:  { mul: 3, div: 3, missing: 2, frac: 2, money: 2, add: 1, sub: 1, seq: 1 },
    10: { mul: 2, div: 2, missing: 1, frac: 2, fracOf: 1, money: 3, add: 1, sub: 1, order: 1 },
    11: { neg: 3, pct: 2, order: 2, eq: 3, fracOf: 1, mul: 1 },
    12: { neg: 2, pct: 2, order: 2, eq: 3, pow: 2 },
    13: { neg: 2, pct: 2, order: 2, eq: 3, pow: 3 },
    14: { neg: 2, pct: 2, order: 3, eq: 3, pow: 3 },
  };
  function weighted(w) {
    let sum = 0; for (const k in w) sum += w[k];
    let r = Math.random() * sum; for (const k in w) { r -= w[k]; if (r < 0) return k; }
    return Object.keys(w)[0];
  }

  /* ---------- стан гри ---------- */
  let host = null, ctx = null, P = null, wrap = null;
  let timers = [], onKey = null, run = null, speedMs = 60000, busy = false, forced = null;
  const tt = (k, v) => (ctx ? ctx.t(k, v) : BO.t('edu.math.' + k, v));
  const later = (fn, ms) => { const id = setTimeout(() => { timers = timers.filter(x => x !== id); fn(); }, ms); timers.push(id); return id; };
  function clearTimers() { timers.forEach(clearTimeout); timers = []; if (run && run.tick) { clearInterval(run.tick); run.tick = null; } }

  function initProgress() {
    const d0 = ctx.age > 14 ? 2 : 0;
    P.level = P.level || 1; P.best = P.best || 0; P.streak = P.streak || 0;
    P.tasks = P.tasks || 0; P.rounds = P.rounds || 0; P.perfects = P.perfects || 0; P.bestStreak = P.bestStreak || 0;
    if (!Array.isArray(P.medals)) P.medals = [];
    if (P.diffBand !== ctx.band || typeof P.diff !== 'number') { P.diff = d0; P.diffBand = ctx.band; }
  }
  const perRound = () => (ctx.band <= 6 ? 5 : ctx.band <= 10 ? 6 : 8);

  function nextTask(mode) {
    const recent = run.recent;
    let t = null;
    for (let tries = 0; tries < 25; tries++) {
      let type = mode === 'speed' ? 'speed' : (forced && G[forced] ? forced : weighted(TYPES[ctx.band]));
      if (mode !== 'speed' && run.lastTypes.length >= 2 && run.lastTypes.slice(-2).every(x => x === type) && tries < 10) continue;
      t = G[type](ctx.band, P.diff);
      t.gen = type;
      if (!recent.includes(t.sig) && !(t.answer === 'NaN')) break;
    }
    recent.push(t.sig); if (recent.length > 15) recent.shift();
    run.lastTypes.push(t.gen); if (run.lastTypes.length > 4) run.lastTypes.shift();
    return t;
  }

  /* ---------- екрани ---------- */
  function setScreen(html, cls) {
    clearTimers();
    host.innerHTML = '<div class="mWrap ' + (cls || '') + '">' + html + '</div>';
    wrap = host.firstChild;
    return wrap;
  }

  function intro() {
    run = null; busy = false;
    const got = MEDALS.filter(m => P.medals.includes(m.id)).length;
    const speed = ctx.age >= 14;
    const w = setScreen(
      '<div class="mIntro">' +
        '<div class="mBig">🔢</div>' +
        '<div class="mLvl">' + esc(BO.t('edu.level', { n: P.level })) + '</div>' +
        '<div class="mStats"><span>✅ ' + esc(tt('solvedTotal', { n: P.tasks })) + '</span><span>🏅 ' + esc(tt('medals', { n: got + '/' + MEDALS.length })) + '</span>' +
          (P.bestStreak ? '<span>🔥 ' + esc(tt('streakLine', { n: P.bestStreak })) + '</span>' : '') + '</div>' +
        '<button type="button" class="mBtn mPlay"><span class="mPlayIco">▶</span><span class="fit"></span></button>' +
        (speed ? '<button type="button" class="mBtn mSpeed"><span class="fit"></span><small></small></button>' : '') +
        '<div class="mMedalRow">' + MEDALS.map(m => '<span class="mMd' + (P.medals.includes(m.id) ? ' on' : '') + '" title="' + esc(BO.t(m.key)) + '">' + m.icon + '</span>').join('') + '</div>' +
      '</div>', 'mScrIntro');
    w.querySelector('.mPlay .fit').textContent = tt('play');
    w.querySelector('.mPlay').addEventListener('click', () => { snd('tap'); startRound(); });
    if (speed) {
      w.querySelector('.mSpeed .fit').textContent = '⏱ ' + tt('speed');
      w.querySelector('.mSpeed small').textContent = tt('speedHint') + (P.best ? ' · ' + tt('best', { n: P.best }) : '');
      w.querySelector('.mSpeed').addEventListener('click', () => { snd('tap'); startSpeed(); });
    }
  }

  /* ---------- звичайний раунд ---------- */
  function startRound() {
    run = { mode: 'round', i: 0, n: perRound(), first: 0, missed: 0, recent: run && run.recent || [], lastTypes: [], runStreak: 0, earned: [] };
    showTask();
  }

  function showTask() {
    busy = false;
    const t = run.task = nextTask(run.mode);
    run.misses = 0; run.input = '';
    const speed = run.mode === 'speed';
    let top = '';
    if (speed) top = '<div class="mTop mTopSpeed"><div class="mTimer"><i></i></div><b class="mScore">0</b></div>';
    else {
      top = '<div class="mTop"><div class="mDots">';
      for (let i = 0; i < run.n; i++) top += '<i class="' + (i < run.i ? 'done' : i === run.i ? 'cur' : '') + '"></i>';
      top += '</div><span class="mLvlSm">' + esc(BO.t('edu.level', { n: P.level })) + '</span></div>';
    }
    const w = setScreen(top +
      (t.q ? '<div class="mQ fit" data-fit-lines="2"></div>' : '') +
      '<div class="mVis">' + t.vis + '</div>' +
      '<div class="mFb" aria-live="polite"></div>' +
      '<div class="mAns"></div>', 'mScrTask mIn-' + t.input + ' mBand' + ctx.band);
    w.dataset.task = JSON.stringify(Object.assign({ type: t.gen, input: t.input }, t.data));
    if (t.q) w.querySelector('.mQ').textContent = tt(t.q);
    const ans = w.querySelector('.mAns');
    if (t.input === 'choice') renderChoice(t, ans);
    else if (t.input === 'pad') renderPad(t, ans);
    else if (t.input === 'tap') renderTap(t, w);
    else if (t.input === 'groups') renderGroups(t, w);
    if (speed) updateSpeedTop();
  }

  function renderChoice(t, ans) {
    ans.className = 'mAns mChoices mC' + t.options.length;
    t.options.forEach(o => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'mOpt'; b.dataset.v = o.v; b.innerHTML = o.html;
      b.addEventListener('click', () => { if (!busy && !b.disabled) submit(o.v, b); });
      ans.appendChild(b);
    });
  }

  function renderPad(t, ans) {
    ans.className = 'mAns mPadBox';
    const neg = ctx.band >= 11;
    ans.innerHTML = '<div class="mDisp"><span class="mDispV"></span></div><div class="mPad">' +
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', neg ? '±' : '', '0', '⌫'].map(k =>
        k ? '<button type="button" class="mKey" data-k="' + k + '">' + (k === '±' ? '±' : k) + '</button>' : '<span></span>').join('') +
      '<button type="button" class="mKey mOk" data-k="ok">✓</button></div>';
    ans.querySelector('[data-k="⌫"]').setAttribute('aria-label', tt('erase'));
    ans.querySelector('[data-k="ok"]').setAttribute('aria-label', tt('check'));
    ans.querySelectorAll('.mKey').forEach(b => b.addEventListener('click', () => padKey(b.dataset.k)));
    showInput();
  }
  function padKey(k) {
    if (busy || !run || !run.task || run.task.input !== 'pad') return;
    let v = run.input;
    if (k === 'ok') { if (v && v !== '-') submit(v); return; }
    if (k === '⌫') v = v.slice(0, -1);
    else if (k === '±') v = v.startsWith('-') ? v.slice(1) : '-' + v;
    else if (v.replace('-', '').length < 7) v = (v === '0' ? '' : v === '-0' ? '-' : v) + k;
    run.input = v; snd('tap'); showInput();
  }
  function showInput() {
    const el = wrap && wrap.querySelector('.mDispV'); if (!el) return;
    el.textContent = run.input ? run.input.replace('-', M) : '';
    el.parentNode.classList.toggle('empty', !run.input);
  }

  function renderTap(t, w) {
    const ans = w.querySelector('.mAns');
    ans.className = 'mAns mTapBox';
    const grid = document.createElement('div'); grid.className = 'mTapGrid';
    for (let i = 0; i < t.total; i++) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'mTapObj'; b.textContent = t.e;
      b.addEventListener('click', () => { if (busy) return; b.classList.toggle('sel'); snd('tap'); updTap(); });
      grid.appendChild(b);
    }
    const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'mBtn mOkBig'; ok.textContent = '✓';
    ok.setAttribute('aria-label', tt('check'));
    ok.addEventListener('click', () => { if (!busy) submit(String(grid.querySelectorAll('.sel').length)); });
    const cnt = document.createElement('div'); cnt.className = 'mTapCnt';
    ans.append(grid, cnt, ok);
    updTap();
    function updTap() { cnt.textContent = grid.querySelectorAll('.sel').length || ''; }
  }

  function renderGroups(t, w) {
    const ans = w.querySelector('.mAns');
    ans.className = 'mAns mGrpBox';
    w.querySelector('.mVis').classList.add('mVisEmpty');
    t.counts.forEach((n, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'mGrp'; b.dataset.v = String(i);
      b.innerHTML = objsHtml(n, t.e, 'mSm');
      b.addEventListener('click', () => { if (!busy && !b.disabled) submit(String(i), b); });
      ans.appendChild(b);
    });
  }

  /* ---------- перевірка відповіді ---------- */
  function submit(v, btn) {
    const t = run.task, ok = String(v) === t.answer, w = wrap, fb = w.querySelector('.mFb');
    if (ok) {
      busy = true;
      if (btn) btn.classList.add('right');
      w.classList.add('mOkAnim');
      const firstTry = run.misses === 0;
      fb.className = 'mFb good'; fb.textContent = tt('praise' + R(1, 6));
      snd('point');
      P.tasks++;
      if (run.mode === 'speed') { run.score++; ctx.save(); later(showTask, 260); return; }
      if (firstTry) {
        run.first++; P.streak++; P.bestStreak = Math.max(P.bestStreak, P.streak);
        run.runStreak++; if (run.runStreak % 3 === 0) P.diff = clamp(P.diff + 0.5, 0, 4);
        if (P.streak === 10) run.earned.push('edu.math.streak10');
        if (P.streak === 25) run.earned.push('edu.math.streak25');
      }
      ctx.save();
      later(advance, 900);
      return;
    }
    // помилка
    run.misses++;
    snd('nope');
    if (run.misses === 1 && run.mode !== 'speed') { run.missed++; P.streak = 0; run.runStreak = 0; P.diff = clamp(P.diff - 0.3, 0, 4); ctx.save(); }
    if (btn) { btn.classList.add('wrong'); btn.disabled = true; }
    w.classList.remove('mShake'); void w.offsetWidth; w.classList.add('mShake');
    if (t.input === 'pad') { run.input = ''; showInput(); }
    if (t.input === 'tap') w.querySelectorAll('.mTapObj.sel').forEach(b => b.classList.remove('sel'));
    if (run.misses < 2) { fb.className = 'mFb try'; fb.textContent = tt('try'); return; }
    // друга помилка — показати правильну відповідь і йти далі
    busy = true;
    fb.className = 'mFb show'; fb.innerHTML = esc(tt('answer', { n: '' })).trim() + ' <b class="mShowAns"></b>';
    const showEl = fb.querySelector('.mShowAns');
    if (t.input === 'choice' || t.input === 'groups') {
      const rb = w.querySelector('[data-v="' + CSS.escape(t.answer) + '"]'); if (rb) rb.classList.add('right', 'reveal');
      const o = t.options && t.options.find(x => x.v === t.answer);
      if (o) showEl.innerHTML = o.html; else showEl.textContent = '';
      if (t.input === 'groups') fb.textContent = '👇';
    } else if (t.input === 'tap') {
      w.querySelectorAll('.mTapObj').forEach((b, i) => b.classList.toggle('sel', i < t.n));
      showEl.textContent = t.answer;
    } else { run.input = t.answer; showInput(); w.querySelector('.mDisp').classList.add('reveal'); showEl.textContent = fmt(+t.answer); }
    if (run.mode === 'speed') { later(showTask, 1100); return; }
    later(advance, 2300);
  }

  function advance() {
    run.i++;
    if (run.i >= run.n) return endRound();
    showTask();
  }

  function medalChecks(list) {
    const has = id => P.medals.includes(id) || list.includes(id);
    const add = id => { if (!has(id)) list.push(id); };
    if (P.rounds >= 1) add('edu.math.first');
    [10, 50, 100, 250, 500, 1000].forEach(n => { if (P.tasks >= n) add('edu.math.tasks' + n); });
    if (P.bestStreak >= 10) add('edu.math.streak10');
    if (P.bestStreak >= 25) add('edu.math.streak25');
    if (P.perfects >= 1) add('edu.math.perfect');
    if (P.perfects >= 10) add('edu.math.perfect10');
    [5, 10, 25, 50, 100].forEach(n => { if (P.level >= n) add('edu.math.level' + n); });
    if (P.best >= 20) add('edu.math.speed20');
    return list.filter(id => !P.medals.includes(id)).filter((id, i, a) => a.indexOf(id) === i);
  }

  function giveRewards(stars, medals) {
    ctx.win({ stars, medal: medals[0] || null });
    for (let i = 1; i < medals.length; i++) ctx.win({ stars: 0, medal: medals[i] });
  }

  function endRound() {
    const perfect = run.missed === 0;
    P.rounds++; if (perfect) P.perfects++;
    P.level++;
    let stars = 3 + Math.floor(run.first / 2) + (perfect ? 1 : 0) + (P.streak >= 10 ? 1 : 0);
    stars = clamp(stars, 3, 8);
    const medals = medalChecks(run.earned.slice());
    ctx.save();
    giveRewards(stars, medals);
    snd('fanfare');
    const w = setScreen(
      '<div class="mEnd">' +
        '<div class="mEndIco">' + (perfect ? '🏆' : '🎉') + '</div>' +
        '<div class="mEndT fit"></div>' +
        (perfect ? '<div class="mEndP"></div>' : '') +
        '<div class="mEndStars">+' + stars + ' ⭐</div>' +
        '<div class="mEndLvl"></div>' +
        medalBox(medals) +
        '<button type="button" class="mBtn mPlay mNext"><span class="fit"></span><span class="mPlayIco">▶</span></button>' +
        '<button type="button" class="secondaryBtn mExit"></button>' +
      '</div>', 'mScrEnd');
    w.querySelector('.mEndT').textContent = tt('roundDone');
    if (perfect) w.querySelector('.mEndP').textContent = tt('perfect');
    w.querySelector('.mEndLvl').textContent = tt('newLevel', { n: P.level });
    fillMedals(w, medals);
    w.querySelector('.mNext .fit').textContent = tt('next');
    w.querySelector('.mNext').addEventListener('click', () => { snd('tap'); startRound(); });
    w.querySelector('.mExit').textContent = tt('exit');
    w.querySelector('.mExit').addEventListener('click', () => { snd('back'); intro(); });
    confetti(w, perfect ? 60 : 36);
  }

  // нові медалі на екрані підсумку: до 3 з назвами, решта — значками
  function medalBox(medals) {
    if (!medals.length) return '';
    const named = medals.slice(0, 3), rest = medals.slice(3);
    return '<div class="mEndMd"><div class="mEndMdT"></div>' +
      named.map(id => '<div class="mEndMdI"><span>' + medalById(id).icon + '</span><b></b></div>').join('') +
      (rest.length ? '<div class="mEndMdMore">' + rest.map(id => '<span title="">' + medalById(id).icon + '</span>').join('') + '</div>' : '') + '</div>';
  }
  function fillMedals(w, medals) {
    if (!medals.length) return;
    w.querySelector('.mEndMdT').textContent = tt('newMedal');
    w.querySelectorAll('.mEndMdI b').forEach((b, i) => { b.textContent = BO.t(medalById(medals[i]).key); });
    w.querySelectorAll('.mEndMdMore span').forEach((sp, i) => { sp.title = BO.t(medalById(medals[i + 3]).key); });
  }

  /* ---------- режим «На швидкість» ---------- */
  function startSpeed() {
    run = { mode: 'speed', score: 0, recent: [], lastTypes: [], t0: Date.now(), ms: speedMs };
    showTask();
    run.tick = setInterval(updateSpeedTop, 200);
  }
  function updateSpeedTop() {
    if (!run || run.mode !== 'speed' || !wrap) return;
    const left = Math.max(0, run.ms - (Date.now() - run.t0));
    const bar = wrap.querySelector('.mTimer i'); if (bar) bar.style.width = (left / run.ms * 100) + '%';
    const sc = wrap.querySelector('.mScore'); if (sc) sc.textContent = run.score + ' · ' + Math.ceil(left / 1000) + 's';
    if (left <= 0) endSpeed();
  }
  function endSpeed() {
    clearTimers();
    const score = run.score, rec = score > P.best;
    if (rec) P.best = score;
    const stars = score > 0 ? clamp(Math.floor(score / 3), 1, 8) : 0;
    const medals = medalChecks([]);
    ctx.save();
    if (stars > 0 || medals.length) giveRewards(stars, medals);
    snd(rec ? 'record' : 'gameEnd');
    const w = setScreen(
      '<div class="mEnd">' +
        '<div class="mEndIco">⏱</div>' +
        '<div class="mEndT fit"></div>' +
        '<div class="mEndP mBigScore"></div>' +
        (rec ? '<div class="mEndRec"></div>' : '<div class="mEndLvl"></div>') +
        (stars ? '<div class="mEndStars">+' + stars + ' ⭐</div>' : '') +
        medalBox(medals) +
        '<button type="button" class="mBtn mPlay mAgain"><span class="fit"></span><span class="mPlayIco">↻</span></button>' +
        '<button type="button" class="secondaryBtn mExit"></button>' +
      '</div>', 'mScrEnd');
    w.querySelector('.mEndT').textContent = tt('timeUp');
    w.querySelector('.mBigScore').textContent = tt('score', { n: score });
    if (rec) w.querySelector('.mEndRec').textContent = '🏆 ' + tt('newBest');
    else w.querySelector('.mEndLvl').textContent = tt('best', { n: P.best });
    fillMedals(w, medals);
    w.querySelector('.mAgain .fit').textContent = tt('again');
    w.querySelector('.mAgain').addEventListener('click', () => { snd('tap'); startSpeed(); });
    w.querySelector('.mExit').textContent = tt('exit');
    w.querySelector('.mExit').addEventListener('click', () => { snd('back'); intro(); });
    if (rec || stars) confetti(w, rec ? 60 : 30);
  }

  /* ---------- конфеті (лише CSS) ---------- */
  function confetti(w, n) {
    const box = document.createElement('div'); box.className = 'mConf'; box.setAttribute('aria-hidden', 'true');
    const cols = ['#ffcf5a', '#6bffd1', '#4fc3ff', '#ff7ac6', '#b28dff', '#ff8a5c'];
    let h = '';
    for (let i = 0; i < n; i++) {
      h += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;background:' + pick(cols) +
        ';animation-delay:' + (Math.random() * 0.6).toFixed(2) + 's;animation-duration:' + (1.6 + Math.random() * 1.2).toFixed(2) +
        's;--dx:' + R(-60, 60) + 'px;--rot:' + R(180, 720) + 'deg"></i>';
    }
    box.innerHTML = h; w.appendChild(box);
    later(() => box.remove(), 3200);
  }

  /* ---------- клавіатура (дорослим на комп'ютері) ---------- */
  function keyHandler(e) {
    if (!run || !run.task || busy || !wrap || !wrap.isConnected) return;
    const t = run.task;
    if (t.input === 'pad') {
      if (/^[0-9]$/.test(e.key)) padKey(e.key);
      else if (e.key === 'Backspace') padKey('⌫');
      else if (e.key === '-' && ctx.band >= 11) padKey('±');
      else if (e.key === 'Enter') padKey('ok');
      else return;
      e.preventDefault();
    } else if (t.input === 'choice' && /^[1-9]$/.test(e.key)) {
      const b = wrap.querySelectorAll('.mOpt')[+e.key - 1]; if (b) { b.click(); e.preventDefault(); }
    }
  }

  BO.edu.register({
    id: 'math', slot: 1, icon: '🔢', pilot: false,
    start(h, c) {
      host = h; ctx = c; P = c.progress;
      initProgress();
      onKey = keyHandler; document.addEventListener('keydown', onKey);
      intro();
    },
    stop() {
      clearTimers();
      if (onKey) document.removeEventListener('keydown', onKey);
      onKey = null; run = null; busy = false;
      if (host) host.innerHTML = '';
      host = null; wrap = null;
    },
  });

  BO.eduMath = {
    MEDALS, TYPES,
    types: band => Object.keys(TYPES[clamp(band, 3, 14)]),
    gen(band, d, type) { const b = clamp(band, 3, 14); const ty = type || weighted(TYPES[b]); const t = G[ty](b, d || 0); t.gen = ty; return t; },
    evalAscii,
    setSpeedMs(ms) { speedMs = ms; },
    force(type) { forced = type || null; },                       // тести/верстка: завжди цей тип
    redraw() { if (run && host) showTask(); },
  };
})();
