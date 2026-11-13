/* OTOTO — навчальна гра «Малювалка» (слот 2): обведи фігуру пальчиком. CoLaba Production.

   Як грати: на полотні — контур із крапочок і м'якого сяйва. Дитина веде по
   ньому пальцем (або мишкою). Крапочки, яких торкнулась лінія, зеленіють.
   Коли обведено достатньо — гра сама перевіряє (або кнопка «Готово»).

   Зміст за віком (ctx.band), від простого до складного (графомоторика):
     3–4   прямі лінії, хрестик, гірки, зигзаг, хвилька, коло, сходинки, спіраль
     5–6   квадрат, прямокутник, трикутник, ромб, овал, сердечко, зірка, місяць,
           цифри 0–9; далі — двоцифрові числа
     7–8   літери абетки дитини (укр./каз. кирилиця, латиниця з діакритикою для
           pl/de/ro/es), прості предмети (рибка, будиночок, сонце, хмара, яблуко…),
           далі — склади з двох літер
     9–14  складні контури (кіт, машина, дерево, ракета, метелик, замок…),
           «домалюй половинку» (симетрія), «з пам'яті» (контур 3 с, потім зникає),
           фігури з кількох ліній
     15+   як 14, плюс режим «🎯 Точність»: суворий допуск і рекорд у відсотках.
   Нескінченно: поворот, масштаб, дзеркало, комбінації; рівень росте → допуск
   потроху вужчає (до 82% від початкового).

   Оцінка (не залежить від напрямку і кількості ліній):
     покриття = частка точок контуру, біля яких пройшла лінія дитини (≤ допуск);
     влучність = частка точок лінії дитини, що лежать біля контуру (≤ допуск×1.2);
                 якщо намальовано більш ніж у 2.5 раза довше за контур — влучність зменшується.
     Допуск = частка розміру фігури на екрані (3 роки 9% … 14 років 3.4%), не менше
     ніж «товщина пальця» для віку і не більше стелі (30 px у 3–4 … 17 px у 9+). Пройдено, коли обидва показники ≥ порогу віку;
     1–3 зірочки — за порогами 2★/3★. Точність % = 60% покриття + 40% влучності.

   Нагорода: 1★ → 2 ⭐, 2★ → 4 ⭐, 3★ → 6 ⭐ (через ctx.win) і рівень +1.
   Медалі: 'edu.draw.<id>' (див. MEDALS) — текст у ключі з тим самим ім'ям.
   Шрифт літер і цифр та всі малюнки — лінії в коді (без файлів картинок). */
(function () {
  'use strict';
  const BO = window.BO;
  if (!BO || !BO.edu) return;

  /* =================================================================
     ГЕОМЕТРІЯ: розбір SVG-шляхів у ламані
     ================================================================= */
  function parsePath(d) {
    const toks = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) || [];
    const strokes = [];
    let cur = null, x = 0, y = 0, sx = 0, sy = 0, i = 0, cmd = '';
    const num = () => parseFloat(toks[i++]);
    const isNum = () => i < toks.length && !/^[a-zA-Z]$/.test(toks[i]);
    const begin = (nx, ny) => { cur = [[nx, ny]]; strokes.push(cur); };
    const lineTo = (nx, ny) => { if (!cur) begin(x, y); cur.push([nx, ny]); };
    while (i < toks.length) {
      if (/^[a-zA-Z]$/.test(toks[i])) cmd = toks[i++];
      const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
      const ax = v => rel ? x + v : v, ay = v => rel ? y + v : v;
      if (C === 'Z') { if (cur) { cur.push([sx, sy]); cur.closed = true; } x = sx; y = sy; cur = null; continue; }
      if (!isNum()) { i++; continue; }
      if (C === 'M') { x = ax(num()); y = ay(num()); sx = x; sy = y; begin(x, y); cmd = rel ? 'l' : 'L'; }
      else if (C === 'L') { x = ax(num()); y = ay(num()); lineTo(x, y); }
      else if (C === 'H') { x = ax(num()); lineTo(x, y); }
      else if (C === 'V') { y = ay(num()); lineTo(x, y); }
      else if (C === 'Q') {
        const x1 = ax(num()), y1 = ay(num()), x2 = ax(num()), y2 = ay(num());
        for (let k = 1; k <= 14; k++) { const t = k / 14, u = 1 - t;
          lineTo(u * u * x + 2 * u * t * x1 + t * t * x2, u * u * y + 2 * u * t * y1 + t * t * y2); }
        x = x2; y = y2;
      } else if (C === 'C') {
        const x1 = ax(num()), y1 = ay(num()), x2 = ax(num()), y2 = ay(num()), x3 = ax(num()), y3 = ay(num());
        for (let k = 1; k <= 18; k++) { const t = k / 18, u = 1 - t;
          lineTo(u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
                 u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3); }
        x = x3; y = y3;
      } else if (C === 'A') {
        const rx = num(), ry = num(), rot = num(), large = num(), sweep = num(), x2 = ax(num()), y2 = ay(num());
        arcTo(x, y, rx, ry, rot, large, sweep, x2, y2).forEach(p => lineTo(p[0], p[1]));
        x = x2; y = y2;
      } else { i++; }
    }
    return strokes.filter(s => s.length > 1);
  }
  // SVG-дуга (кінцеві точки → центр), повертає точки без першої
  function arcTo(x1, y1, rx, ry, phiDeg, fa, fs, x2, y2) {
    if (!rx || !ry) return [[x2, y2]];
    const phi = phiDeg * Math.PI / 180, cp = Math.cos(phi), sp = Math.sin(phi);
    const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
    const x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
    rx = Math.abs(rx); ry = Math.abs(ry);
    const lam = x1p * x1p / (rx * rx) + y1p * y1p / (ry * ry);
    if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
    const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    let co = Math.sqrt(Math.max(0, num / den)); if (fa === fs) co = -co;
    const cxp = co * rx * y1p / ry, cyp = -co * ry * x1p / rx;
    const cx = cp * cxp - sp * cyp + (x1 + x2) / 2, cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
    const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
    const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
    const n = Math.max(8, Math.ceil(Math.abs(dt) / (Math.PI / 18))), out = [];
    for (let k = 1; k <= n; k++) {
      const t = t1 + dt * k / n, ex = rx * Math.cos(t), ey = ry * Math.sin(t);
      out.push([cp * ex - sp * ey + cx, sp * ex + cp * ey + cy]);
    }
    return out;
  }
  function ell(cx, cy, rx, ry, a0, a1) {
    a0 = a0 == null ? -90 : a0; a1 = a1 == null ? a0 + 360 : a1;
    const n = Math.max(12, Math.ceil(Math.abs(a1 - a0) / 6)), s = [];
    for (let k = 0; k <= n; k++) { const t = (a0 + (a1 - a0) * k / n) * Math.PI / 180; s.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]); }
    if (Math.abs(a1 - a0) >= 360) s.closed = true;
    return s;
  }
  const circ = (cx, cy, r, a0, a1) => ell(cx, cy, r, r, a0, a1);
  function starPts(cx, cy, R, r, n) {
    const s = [];
    for (let k = 0; k <= n * 2; k++) { const rr = k % 2 ? r : R, t = (-90 + k * 180 / n) * Math.PI / 180; s.push([cx + rr * Math.cos(t), cy + rr * Math.sin(t)]); }
    s.closed = true; return s;
  }
  function spiral(cx, cy, r0, r1, turns) {
    const n = Math.ceil(turns * 48), s = [];
    for (let k = 0; k <= n; k++) { const f = k / n, t = f * turns * 2 * Math.PI, r = r0 + (r1 - r0) * f; s.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); }
    return s;
  }
  // зібрати фігуру з частин: рядок SVG-шляху, одна ламана або масив ламаних
  function G(...parts) {
    const out = [];
    parts.forEach(p => {
      if (typeof p === 'string') out.push(...parsePath(p));
      else if (p.length && typeof p[0][0] === 'number') out.push(p);
      else out.push(...p);
    });
    return out;
  }
  function bbox(strokes) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    strokes.forEach(s => s.forEach(([x, y]) => { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }));
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
  }
  function copyStrokes(strokes, fn) {
    return strokes.map(s => { const n = s.map(p => fn(p[0], p[1])); if (s.closed) n.closed = true; return n; });
  }
  function resample(pts, step) {
    const out = [];
    if (!pts.length) return out;
    out.push(pts[0].slice());
    let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const L = Math.hypot(bx - ax, by - ay); if (!L) continue;
      let d = step - carry;
      while (d <= L) { const t = d / L; out.push([ax + (bx - ax) * t, ay + (by - ay) * t]); d += step; }
      carry = L - (d - step);
    }
    const last = pts[pts.length - 1], pl = out[out.length - 1];
    if (Math.hypot(last[0] - pl[0], last[1] - pl[1]) > step * 0.35) out.push(last.slice());
    return out;
  }
  function polyLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }

  /* =================================================================
     БІБЛІОТЕКА ФІГУР (координати ~0…100, вісь Y донизу)
     mir:false — не можна віддзеркалювати; rot:false — не можна повертати;
     sym:true — симетрична відносно вертикальної осі (для «домалюй половинку»)
     ================================================================= */
  const SH = {
    line:     { g: () => G('M50 8 V92'), sym: true },
    lineH:    { g: () => G('M8 50 H92'), name: 'line' },
    lineD:    { g: () => G('M15 85 L85 15'), name: 'line' },
    cross:    { g: () => G('M50 8 V92 M8 50 H92'), sym: true },
    arches:   { g: () => G('M4 75 Q19 15 34 75 Q49 15 64 75 Q79 15 94 75') },
    zigzag:   { g: () => G('M4 72 L20 28 L36 72 L52 28 L68 72 L84 28 L96 60') },
    wave:     { g: () => G('M4 50 Q16 18 28 50 Q40 82 52 50 Q64 18 76 50 Q88 82 100 50') },
    circle:   { g: () => G(circ(50, 50, 42)), sym: true },
    steps:    { g: () => G('M8 92 H28 V72 H48 V52 H68 V32 H88 V12') },
    spiral:   { g: () => G(spiral(50, 50, 3, 44, 2.25)) },
    oval:     { g: () => G(ell(50, 50, 44, 28)), sym: true },
    square:   { g: () => G('M14 14 H86 V86 H14 Z'), sym: true },
    rect:     { g: () => G('M4 26 H96 V74 H4 Z'), sym: true },
    triangle: { g: () => G('M50 8 L92 86 H8 Z'), sym: true },
    diamond:  { g: () => G('M50 4 L84 50 L50 96 L16 50 Z'), sym: true },
    heart:    { g: () => G('M50 90 C20 68 4 50 7 30 C10 10 38 6 50 28 C62 6 90 10 93 30 C96 50 80 68 50 90 Z'), sym: true },
    star:     { g: () => G(starPts(50, 54, 46, 19, 5)), sym: true },
    moon:     { g: () => G('M62 8 A42 42 0 1 0 62 92 A50 50 0 0 1 62 8 Z') },
    fish:     { g: () => G('M14 50 C30 24 58 22 76 50 C58 78 30 76 14 50 Z', 'M76 50 L94 34 V66 Z', circ(31, 45, 3.5)) },
    house:    { g: () => G('M18 92 V48 H82 V92 Z', 'M10 50 L50 12 L90 50', 'M42 92 V68 H58 V92'), sym: true },
    sun:      { g: () => { const r = [circ(50, 50, 20)];
                  for (let k = 0; k < 8; k++) { const t = k * Math.PI / 4; r.push([[50 + 29 * Math.cos(t), 50 + 29 * Math.sin(t)], [50 + 44 * Math.cos(t), 50 + 44 * Math.sin(t)]]); }
                  return r; }, sym: true },
    cloud:    { g: () => G('M24 72 C8 72 6 50 21 46 C18 28 40 22 48 35 C55 20 78 24 77 42 C92 42 95 66 80 72 Z') },
    apple:    { g: () => G('M50 30 C38 20 14 22 14 52 C14 78 34 94 50 85 C66 94 86 78 86 52 C86 22 62 20 50 30 Z', 'M50 30 Q51 18 58 9', 'M55 21 Q66 8 77 14 Q67 27 55 21 Z') },
    boat:     { g: () => G('M8 66 H92 L76 88 H24 Z', 'M50 66 V8 L82 56 H50') },
    mushroom: { g: () => G('M8 52 C8 12 92 12 92 52 Z', 'M36 52 V86 C36 94 64 94 64 86 V52'), sym: true },
    icecream: { g: () => G('M28 46 L50 94 L72 46', 'M26 46 C16 40 18 24 32 22 C36 8 64 8 68 22 C82 24 84 40 74 46 Z'), sym: true },
    cat:      { g: () => G('M30 40 L27 12 L42 26 Q50 24 58 26 L73 12 L70 40 C72 56 62 64 50 64 C38 64 28 56 30 40 Z',
                  'M38 62 C26 72 26 96 36 96 H64 C74 96 74 72 62 62', 'M68 90 C90 90 94 70 82 62',
                  'M44 46 L30 43 M44 50 L30 53 M56 46 L70 43 M56 50 L70 53') },
    car:      { g: () => G('M18 70 H6 V56 L22 52 L34 34 H66 L80 52 L94 56 V70 H82', 'M62 70 H38',
                  circ(28, 70, 10), circ(72, 70, 10), 'M38 40 H62 L70 50 H31 Z') },
    tree:     { g: () => G('M50 6 C70 6 80 20 76 33 C91 37 93 58 78 64 C74 76 26 76 22 64 C7 58 9 37 24 33 C20 20 30 6 50 6 Z', 'M43 73 V96 H57 V73'), sym: true },
    rocket:   { g: () => G('M50 4 C66 18 68 42 66 72 H34 C32 42 34 18 50 4 Z', 'M34 54 L18 80 L34 74', 'M66 54 L82 80 L66 74', circ(50, 36, 8), 'M42 76 L50 95 L58 76'), sym: true },
    butterfly:{ g: () => G('M50 34 C38 6 4 8 8 34 C11 50 34 50 48 52 C32 56 14 62 19 82 C24 97 44 88 50 68 C56 88 76 97 81 82 C86 62 68 56 52 52 C66 50 89 50 92 34 C96 8 62 6 50 34 Z',
                  'M50 30 V78', 'M50 30 Q44 16 37 10', 'M50 30 Q56 16 63 10'), sym: true },
    castle:   { g: () => G('M10 94 V36 H22 V46 H32 V36 H44 V46 H56 V36 H68 V46 H78 V36 H90 V94 Z', 'M40 94 V74 Q50 62 60 74 V94'), sym: true },
    crown:    { g: () => G('M14 80 L8 24 L32 50 L50 14 L68 50 L92 24 L86 80 Z', 'M14 92 H86'), sym: true },
    vase:     { g: () => G('M38 8 H62 V20 C62 28 84 38 82 62 C80 84 66 94 50 94 C34 94 20 84 18 62 C16 38 38 28 38 20 Z', 'M33 8 H67'), sym: true },
    flower:   { g: () => { const r = [circ(50, 40, 9)];
                  for (let k = 0; k < 6; k++) { const a = k * 60 - 90, t = a * Math.PI / 180; r.push(ell(50 + 19 * Math.cos(t), 40 + 19 * Math.sin(t), 10, 10, a + 140, a + 400)); }
                  r.push(...G('M50 49 V96', 'M50 80 Q66 64 78 70 Q66 84 50 80 Z'));
                  return r; } },
    snail:    { g: () => G(spiral(48, 52, 4, 26, 2.3), 'M8 86 H82 C94 86 94 70 86 62 M22 86 C14 80 18 66 26 70', 'M84 62 L90 42 M80 64 L80 44') },
  };
  const BANK = {
    young1: ['line', 'lineH', 'lineD', 'cross'],
    young2: ['arches', 'zigzag', 'wave', 'circle'],
    young3: ['steps', 'oval', 'spiral'],
    forms:  ['square', 'rect', 'triangle', 'circle', 'oval', 'heart', 'star', 'diamond', 'moon'],
    things: ['fish', 'house', 'sun', 'cloud', 'apple', 'boat', 'mushroom', 'icecream', 'heart', 'star', 'moon'],
    complex:['cat', 'car', 'tree', 'rocket', 'butterfly', 'castle', 'crown', 'vase', 'flower', 'snail'],
  };
  const SYM = Object.keys(SH).filter(k => SH[k].sym && !/^(line|cross|circle|oval|square|rect)$/.test(k));

  /* ---------- шрифт ліній: літери (висота 0…100, ширина ~0…64) ---------- */
  const LAT = {
    A: 'M5 100 L32 0 L59 100 M15 64 H49', B: 'M8 0 V100 M8 0 H32 C50 0 50 48 32 48 H8 M32 48 C56 48 56 100 32 100 H8',
    C: 'M56 18 C46 -4 6 -4 6 50 C6 104 46 104 56 82', D: 'M8 0 V100 M8 0 H24 C62 0 62 100 24 100 H8',
    E: 'M52 0 H8 V100 H52 M8 50 H44', F: 'M52 0 H8 V100 M8 50 H44', G: 'M56 18 C46 -4 6 -4 6 50 C6 104 50 104 56 78 V56 H34',
    H: 'M8 0 V100 M56 0 V100 M8 50 H56', I: 'M32 0 V100 M18 0 H46 M18 100 H46', J: 'M48 0 V70 C48 104 8 104 6 76',
    K: 'M8 0 V100 M54 0 L8 60 M24 44 L56 100', L: 'M8 0 V100 H52', M: 'M6 100 V0 L32 64 L58 0 V100', N: 'M8 100 V0 L56 100 V0',
    O: ell(32, 50, 27, 50), P: 'M8 100 V0 H32 C54 0 54 52 32 52 H8', Q: [ell(32, 50, 27, 50), 'M38 72 L60 102'],
    R: 'M8 100 V0 H32 C54 0 54 52 32 52 H8 M30 52 L56 100', S: 'M54 16 C46 -4 8 -4 8 24 C8 50 56 46 56 74 C56 104 12 104 6 82',
    T: 'M4 0 H60 M32 0 V100', U: 'M8 0 V66 C8 106 56 106 56 66 V0', V: 'M4 0 L32 100 L60 0',
    W: 'M2 0 L16 100 L32 30 L48 100 L62 0', X: 'M6 0 L58 100 M58 0 L6 100', Y: 'M4 0 L32 48 L60 0 M32 48 V100', Z: 'M6 0 H58 L6 100 H58',
  };
  const DOTS2 = 'M20 -18 V-12 M44 -18 V-12', ACUTE = 'M28 -8 L42 -22', BREVE = 'M20 -20 Q32 -4 44 -20',
        CIRC = 'M20 -8 L32 -20 L44 -8', OGONEK = 'M52 100 Q42 112 56 118', COMMA = 'M32 110 L27 122';
  const CYR = {
    'Б': 'M52 0 H8 V100 H32 C56 100 56 50 32 50 H8', 'Г': 'M52 0 H8 V100', 'Ґ': 'M8 100 V0 H48 V-16',
    'Д': 'M20 0 H50 V100 M20 0 Q18 70 6 100 M0 118 V100 H58 V118', 'Є': 'M54 18 C46 -4 6 -4 6 50 C6 104 46 104 54 82 M6 50 H40',
    'Ж': 'M32 0 V100 M4 0 L32 50 L4 100 M60 0 L32 50 L60 100',
    'З': 'M8 14 C16 -4 54 -4 52 24 C50 46 30 48 24 48 C60 48 58 100 30 100 C16 100 8 94 6 86',
    'И': 'M8 0 V100 L56 0 V100', 'І': 'M32 0 V100', 'Ї': 'M32 0 V100 ' + DOTS2, 'Й': 'M8 0 V100 L56 0 V100 ' + BREVE,
    'К': 'M8 0 V100 M52 0 L8 52 L56 100', 'Л': 'M4 100 Q20 60 22 0 H56 V100', 'П': 'M8 100 V0 H56 V100',
    'У': 'M4 0 L32 60 M60 0 L26 84 Q20 100 6 100', 'Ф': [ell(32, 46, 28, 26), 'M32 0 V100'],
    'Ц': 'M8 0 V100 H52 V0 M52 100 H60 V118', 'Ч': 'M8 0 V30 C8 56 50 56 54 46 M54 0 V100',
    'Ш': 'M4 0 V100 H60 V0 M32 0 V100', 'Щ': 'M4 0 V100 H60 V0 M32 0 V100 M60 100 H66 V118',
    'Ь': 'M10 0 V100 H32 C56 100 56 50 32 50 H10', 'Ю': ['M6 0 V100 M6 50 H22', ell(42, 50, 20, 50)],
    'Я': 'M54 100 V0 H30 C8 0 8 54 30 54 H54 M32 54 L8 100',
    'Ә': 'M8 20 C14 -4 56 -4 56 50 C56 104 6 104 6 54 H56', 'Ғ': 'M52 0 H14 V100 M2 50 H30',
    'Ё': 'M52 0 H8 V100 H52 M8 50 H44 ' + DOTS2, 'Қ': 'M8 0 V100 M52 0 L8 52 L52 100 H60 V118',
    'Ң': 'M8 0 V100 M52 0 V100 M8 50 H52 M52 100 H60 V118', 'Ө': [ell(32, 50, 27, 50), 'M5 50 H59'],
    'Ұ': 'M4 0 L32 48 L60 0 M32 48 V100 M16 66 H48', 'Һ': 'M8 0 V100 M8 46 C20 36 54 34 54 60 V100',
    'Ъ': 'M0 0 H16 V100 H36 C60 100 60 50 36 50 H16', 'Ы': 'M6 0 V100 H22 C42 100 42 50 22 50 H6 M56 0 V100',
    'Э': 'M8 18 C16 -4 56 -4 56 50 C56 104 16 104 8 82 M24 50 H56',
  };
  // однакові з латиницею
  [['А', 'A'], ['В', 'B'], ['Е', 'E'], ['М', 'M'], ['Н', 'H'], ['О', 'O'], ['Р', 'P'], ['С', 'C'], ['Т', 'T'], ['Х', 'X'], ['Ү', 'Y']]
    .forEach(([c, l]) => { CYR[c] = LAT[l]; });
  // частини гліфа: рядок шляху, одна ламана або масив частин → завжди масив частин
  const isStroke = d => Array.isArray(d) && d.length && Array.isArray(d[0]) && typeof d[0][0] === 'number';
  const parts = d => (typeof d === 'string' || isStroke(d)) ? [d] : d;
  const withMark = (base, mark) => parts(base).concat(parts(mark));
  const EXTRA = {
    'Ą': withMark(LAT.A, OGONEK), 'Ć': withMark(LAT.C, ACUTE), 'Ę': withMark(LAT.E, OGONEK), 'Ł': withMark(LAT.L, 'M0 64 L24 40'),
    'Ń': withMark(LAT.N, ACUTE), 'Ó': withMark(LAT.O, ACUTE), 'Ś': withMark(LAT.S, ACUTE), 'Ź': withMark(LAT.Z, ACUTE),
    'Ż': withMark(LAT.Z, 'M32 -18 V-12'), 'Ä': withMark(LAT.A, DOTS2), 'Ö': withMark(LAT.O, DOTS2), 'Ü': withMark(LAT.U, DOTS2),
    'Ă': withMark(LAT.A, BREVE), 'Â': withMark(LAT.A, CIRC), 'Î': withMark(LAT.I, CIRC), 'Ș': withMark(LAT.S, COMMA),
    'Ț': withMark(LAT.T, COMMA), 'Ñ': withMark(LAT.N, 'M14 -10 Q22 -22 32 -12 Q42 -2 50 -14'),
  };
  const DIG = {
    0: ell(30, 50, 26, 50), 1: 'M12 24 L36 0 V100', 2: 'M8 22 C12 -4 52 -6 52 26 C52 50 20 70 6 100 H56',
    3: 'M8 12 C20 -6 54 -2 52 24 C50 44 34 48 24 48 C58 48 58 100 28 100 C16 100 8 94 6 86',
    4: 'M42 100 V0 L4 68 H58', 5: 'M52 0 H14 L10 44 C30 32 56 40 56 68 C56 102 14 106 6 86',
    6: 'M50 8 C40 -4 6 -4 6 56 C6 106 56 106 56 68 C56 34 10 34 6 62', 7: 'M6 0 H56 L22 100',
    8: 'M30 48 C6 48 8 0 30 0 C52 0 54 48 30 48 C2 48 4 100 30 100 C56 100 58 48 30 48 Z',
    9: 'M54 38 C50 66 6 66 6 34 C6 -4 54 -6 54 34 V60 C54 100 18 106 8 90',
  };
  const ABC = {
    uk: 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ',
    kk: 'АӘБВГҒДЕЁЖЗИЙКҚЛМНҢОӨПРСТУҰҮФХҺЦЧШЩЪЫІЬЭЮЯ',
    en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', fr: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    es: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ', de: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ',
    pl: 'AĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ', ro: 'AĂÂBCDEFGHIÎJKLMNOPQRSȘTȚUVWXYZ',
  };
  const VOWELS = { uk: 'АЕИІОУЯЮЄ', kk: 'АӘЕИОӨҰҮЫІЭ', lat: 'AEIOU' };
  function abc(lang) { return [...(ABC[lang] || ABC.en)]; }
  function glyph(ch) {
    const def = (/\d/.test(ch) ? DIG[ch] : (CYR[ch] || EXTRA[ch] || LAT[ch]));
    if (!def) return null;
    return G(...parts(def));
  }

  /* =================================================================
     ВИБІР ЗАВДАННЯ
     ================================================================= */
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pickOf = arr => arr[Math.floor(Math.random() * arr.length)];
  function weighted(list) {     // [[weight, value], …]
    const tot = list.reduce((s, x) => s + x[0], 0); let r = Math.random() * tot;
    for (const x of list) { if ((r -= x[0]) < 0) return x[1]; }
    return list[list.length - 1][1];
  }
  function avoidRecent(arr, recent) { const f = arr.filter(x => !recent.includes(x)); return pickOf(f.length ? f : arr); }

  // повертає { key, kind, label:{k,v}, strokes, mode, glyph }
  function pickTask(band, level, prog, lang, precise) {
    const recent = prog.recent || [];
    let cat;
    if (band <= 3) cat = weighted([[level < 4 ? 10 : 4, 'young1'], [level >= 4 ? 6 : 0, 'young2'], [level >= 12 ? 3 : 0, 'young3']]);
    else if (band === 4) cat = weighted([[3, 'young1'], [6, 'young2'], [level >= 6 ? 4 : 0, 'young3'], [level >= 15 ? 3 : 0, 'forms']]);
    else if (band <= 6) cat = weighted([[level < 5 ? 2 : 1, 'young'], [5, 'forms'], [band === 6 ? 6 : 4, 'digit'], [level >= (band === 6 ? 10 : 20) ? 2 : 0, 'number']]);
    else if (band <= 8) cat = weighted([[9, 'letter'], [7, 'things'], [2, 'digit'], [level >= 20 ? 2 : 0, 'syll'], [band === 8 && level >= 10 ? 1 : 0, 'complex']]);
    else cat = weighted([[8, 'complex'], [3, 'things'], [2, 'letter'], ['0123456789'.split('').every(d => prog.digits && prog.digits[d]) ? 0 : 1, 'digit'], // старшим іноді цифри, щоб медаль «Усі цифри» була досяжна
       [precise ? 0 : (level >= 2 ? 4 : 0), 'mirror'], [precise ? 0 : (level >= 3 ? 3 : 0), 'memory']]);

    let key, kind = 'shape', strokes, label, mode = 'trace', isGlyph = false;
    if (cat === 'young') cat = pickOf(['young1', 'young2', 'young3']);
    if (cat === 'digit' || cat === 'number') {
      kind = 'digit'; isGlyph = true;
      if (cat === 'digit') {
        const seen = prog.digits || {}, notYet = '0123456789'.split('').filter(d => !seen[d]);
        const d = notYet.length && Math.random() < 0.6 ? pickOf(notYet) : avoidRecent('0123456789'.split(''), recent.map(r => r.slice(2)));
        key = 'd:' + d; strokes = glyph(d); label = { k: 'digit', v: d };
      } else {
        const n = String(10 + Math.floor(Math.random() * 90)); key = 'n:' + n; kind = 'number';
        strokes = combo(n.split('').map(glyph)); label = { k: 'number', v: n };
      }
    } else if (cat === 'letter' || cat === 'syll') {
      const set = abc(lang); isGlyph = true;
      if (cat === 'letter') {
        const seen = prog.letters || {}, notYet = set.filter(c => !seen[c]);
        const c = notYet.length && Math.random() < 0.6 ? pickOf(notYet) : avoidRecent(set, recent.map(r => r.slice(2)));
        kind = 'letter'; key = 'l:' + c; strokes = glyph(c); label = { k: 'letter', v: c };
      } else {
        const vw = [...(lang === 'uk' ? VOWELS.uk : lang === 'kk' ? VOWELS.kk : VOWELS.lat)].filter(v => set.includes(v));
        const cons = set.filter(c => !vw.includes(c) && !/[ЬЪЫЙ]/.test(c) && glyph(c));
        const s = pickOf(cons) + pickOf(vw);
        kind = 'syll'; key = 's:' + s; strokes = combo([...s].map(glyph)); label = { k: 'syllable', v: s };
      }
    } else {
      let ids = cat === 'mirror' || cat === 'memory' ? (band >= 11 ? SYM : SYM.filter(k => !/castle|crown/.test(k))) : BANK[cat];
      if (cat === 'memory') ids = BANK.complex.concat(BANK.things);
      const id = avoidRecent(ids, recent);
      key = id; strokes = SH[id].g(); label = { k: 's.' + (SH[id].name || id) };
      if (cat === 'mirror') mode = 'mirror';
      if (cat === 'memory') mode = 'memory';
    }
    if (!strokes || !strokes.length) { key = 'circle'; strokes = SH.circle.g(); label = { k: 's.circle' }; isGlyph = false; }

    // варіанти: дзеркало / поворот / масштаб (літери й цифри не дзеркалимо і майже не крутимо)
    const shapeDef = SH[key] || {};
    let flip = false, rot = 0, scale = 1;
    if (!isGlyph && mode !== 'mirror' && shapeDef.mir !== false && Math.random() < 0.5) flip = true;
    if (!isGlyph && mode !== 'mirror') {
      if (key === 'line' || key === 'lineH') rot = pickOf([0, 0, 90, band >= 4 ? 45 : 0, band >= 4 ? -45 : 0]);
      else if (band >= 9) rot = rnd(-20, 20);
      else if (band >= 7) rot = rnd(-12, 12);
      else if (band >= 5) rot = rnd(-6, 6);
    } else if (isGlyph && band >= 9) rot = rnd(-6, 6);
    if (band >= 7 && mode === 'trace') scale = rnd(0.82, 1);
    if (precise) scale = rnd(0.86, 1);
    strokes = transform(strokes, flip, rot);
    return { key, kind, label, strokes, mode, glyph: isGlyph, scale, closed: strokes.map(s => !!s.closed) };
  }
  function combo(glyphs) {
    const out = []; let x = 0;
    glyphs.forEach(g => { if (!g) return; const b = bbox(g); copyStrokes(g, (px, py) => [px - b.x0 + x, py]).forEach(s => out.push(s)); x += b.w + 22; });
    return out;
  }
  function transform(strokes, flip, rotDeg) {
    const b = bbox(strokes), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    const t = rotDeg * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
    return copyStrokes(strokes, (x, y) => { let dx = x - cx; const dy = y - cy; if (flip) dx = -dx; return [cx + dx * c - dy * s, cy + dx * s + dy * c]; });
  }
  // «домалюй половинку»: поділ по вертикальній осі симетрії
  function splitHalves(strokes, giveLeft) {
    const b = bbox(strokes), ax = (b.x0 + b.x1) / 2, eps = Math.max(b.w, b.h) * 0.006;
    const given = [], target = [];
    strokes.forEach(s => {
      const pts = resample(s, Math.max(b.w, b.h) / 300);
      let side = null, cur = null, prev = null;
      pts.forEach(p => {
        const d = p[0] - ax, sd = (Math.abs(d) <= eps || (d < 0) === giveLeft) ? 'given' : 'target';
        if (sd !== side) { cur = prev ? [prev, p] : [p]; side = sd; (sd === 'given' ? given : target).push(cur); }
        else cur.push(p);
        prev = p;
      });
    });
    return { given: given.filter(s => s.length > 1 && polyLen(s) > eps * 3), target: target.filter(s => s.length > 1 && polyLen(s) > eps * 3), axis: ax };
  }

  /* =================================================================
     ПАРАМЕТРИ СКЛАДНОСТІ
     ================================================================= */
  const TOL_FRAC = { 3: .09, 4: .08, 5: .07, 6: .062, 7: .055, 8: .05, 9: .046, 10: .043, 11: .04, 12: .038, 13: .036, 14: .034 };
  function thresholds(band, mode, precise) {
    if (precise) return { pass: [.88, .75], two: [.94, .85], three: [.97, .92] };
    let t = band <= 4 ? { pass: [.70, .55], two: [.82, .70], three: [.92, .82] }
          : band <= 6 ? { pass: [.75, .60], two: [.86, .74], three: [.94, .85] }
          : band <= 8 ? { pass: [.78, .62], two: [.88, .76], three: [.95, .87] }
          :             { pass: [.80, .65], two: [.90, .78], three: [.96, .88] };
    if (mode === 'memory' || mode === 'mirror') {
      const d = mode === 'memory' ? .12 : .06;
      t = { pass: [t.pass[0] - d, t.pass[1] - d], two: [t.two[0] - d, t.two[1] - d], three: [t.three[0] - d, t.three[1] - d] };
    }
    return t;
  }
  const STARS_FOR = { 1: 2, 2: 4, 3: 6 };
  const MEDALS = ['mFirst', 'm10', 'm50', 'm200', 'mPerfect', 'mDigits', 'mLetters', 'mMirror', 'mMemory',
                  'mLvl10', 'mLvl25', 'mLvl50', 'mLvl100', 'mSniper'];

  /* =================================================================
     ГРА
     ================================================================= */
  let G0 = null;   // поточна гра (null — не запущена)

  function start(host, ctx) {
    stop();
    const p = ctx.progress;
    p.level = p.level || 1; p.recent = p.recent || []; p.digits = p.digits || {}; p.letters = p.letters || {};
    p.done = p.done || 0; p.perfect = p.perfect || 0; p.mirror = p.mirror || 0; p.memory = p.memory || 0;
    p.medals = p.medals || [];
    const adult = ctx.age >= 15;
    if (!adult) p.precise = false;

    host.innerHTML =
      '<div class="drWrap">' +
        '<div class="drTop">' +
          '<div class="drTexts"><b class="drLabel fit" data-fit-lines="1"></b><span class="drDo fit"></span></div>' +
          '<button type="button" class="drPrecise hidden" aria-pressed="false"></button>' +
          '<span class="drLevel"></span>' +
        '</div>' +
        '<div class="drStage"><canvas class="drCanvas"></canvas>' +
          '<div class="drCount hidden"></div>' +
          '<div class="drCard hidden" role="status" aria-live="polite"></div>' +
        '</div>' +
        '<div class="drBar">' +
          '<button type="button" class="drBtn drClear"><i>↺</i><span class="fit"></span></button>' +
          '<button type="button" class="drBtn drDone"><i>✓</i><span class="fit"></span></button>' +
          '<button type="button" class="drBtn drSkip"><i>⏭</i><span class="fit"></span></button>' +
        '</div>' +
      '</div>';
    const $ = s => host.querySelector(s);
    const g = G0 = {
      ctx, host, p, adult,
      canvas: $('.drCanvas'), stage: $('.drStage'), card: $('.drCard'), count: $('.drCount'),
      task: null, phase: 'draw',            // draw | show (запам'ятовування) | result | fail
      strokes: [], drawing: null, pointerId: null,
      tgt: [], view: null, tol: 20, raf: 0, timers: [], t0: performance.now(), animStart: 0, result: null,
      ro: null, dpr: 1, cssW: 0, cssH: 0, given: null, axis: null,
    };
    g.cx = g.canvas.getContext('2d');
    $('.drClear span').textContent = ctx.t('clear');
    $('.drDone span').textContent = ctx.t('done');
    $('.drSkip span').textContent = ctx.t('skip');
    $('.drClear').setAttribute('aria-label', ctx.t('clear'));
    $('.drDone').setAttribute('aria-label', ctx.t('done'));
    $('.drSkip').setAttribute('aria-label', ctx.t('skip'));
    $('.drClear').addEventListener('click', () => { if (g.phase === 'draw') { clearStrokes(); sfx('back'); } });
    $('.drDone').addEventListener('click', () => { if (g.phase === 'draw') evaluate(true); });
    $('.drSkip').addEventListener('click', () => { if (g.phase === 'draw' || g.phase === 'fail' || g.phase === 'show') { sfx('tap'); nextTask(); } });
    const pb = $('.drPrecise');
    if (adult) {
      pb.classList.remove('hidden');
      pb.addEventListener('click', () => { p.precise = !p.precise; ctx.save(); sfx('tap'); nextTask(); });
    }

    const cv = g.canvas;
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    cv.addEventListener('lostpointercapture', onUp);
    cv.addEventListener('contextmenu', e => e.preventDefault());
    g.ro = new ResizeObserver(() => resize());
    g.ro.observe(g.stage);
    // прокрутити екран угору: полотно має бути повністю видно
    const view = document.getElementById('view-edu'); if (view) { view.scrollTop = 0; view.classList.add('drOn'); }
    resize();
    nextTask(true);
  }

  function stop() {
    const g = G0; if (!g) return;
    cancelAnimationFrame(g.raf); g.timers.forEach(clearTimeout);
    if (g.ro) g.ro.disconnect();
    const view = document.getElementById('view-edu'); if (view) view.classList.remove('drOn');
    G0 = null;
  }

  function sfx(name) { try { if (window.BO_SOUND) window.BO_SOUND.play(name); } catch (e) {} }
  function later(fn, ms) { const g = G0; if (!g) return; const id = setTimeout(() => { if (G0 === g) fn(); }, ms); g.timers.push(id); }

  /* ---------- завдання ---------- */
  function nextTask(first) {
    const g = G0; if (!g) return;
    const { ctx, p } = g;
    g.timers.forEach(clearTimeout); g.timers = [];
    const precise = g.adult && !!p.precise;
    g.task = pickTask(ctx.band, p.level, p, ctx.lang, precise);
    g.task.precise = precise;
    p.recent = [g.task.key].concat(p.recent.filter(k => k !== g.task.key)).slice(0, 6);
    if (g.task.mode === 'mirror') {
      const h = splitHalves(g.task.strokes, Math.random() < 0.5);
      if (!h.target.length || !h.given.length) g.task.mode = 'trace';
      else { g.given = h.given; g.task.target = h.target; g.axis = h.axis; }
    }
    if (g.task.mode !== 'mirror') { g.given = null; g.task.target = g.task.strokes; g.axis = null; }
    clearStrokes(true);
    g.result = null;
    g.card.classList.add('hidden'); g.card.innerHTML = '';
    g.count.classList.add('hidden'); g.reserve = 0;
    layout();
    renderTexts();
    if (g.task.mode === 'memory') {
      g.phase = 'show'; let n = 3;
      const tickDown = () => {
        if (n <= 0) { g.phase = 'draw'; g.count.classList.add('hidden'); renderTexts(); kick(); return; }
        g.count.textContent = String(n); g.count.classList.remove('hidden'); n--; later(tickDown, 1000);
      };
      tickDown();
    } else g.phase = 'draw';
    if (!first) sfx('open');
    kick();
  }

  function renderTexts() {
    const g = G0; if (!g) return;
    const { ctx, task, p } = g, host = g.host;
    const lab = task.label;
    host.querySelector('.drLabel').textContent = lab.v != null ? ctx.t(lab.k, { x: lab.v }) : ctx.t(lab.k);
    let doKey = 'do.trace';
    if (task.mode === 'mirror') doKey = 'do.mirror';
    else if (task.mode === 'memory') doKey = g.phase === 'show' ? 'do.memory' : 'do.memoryGo';
    else if (task.precise) doKey = 'do.precise';
    let line = ctx.t(doKey);
    if (task.precise && p.bestP) line += ' · ' + ctx.t('best', { n: p.bestP });
    host.querySelector('.drDo').textContent = line;
    host.querySelector('.drLevel').textContent = BO.t('edu.level', { n: p.level });
    const pb = host.querySelector('.drPrecise');
    pb.textContent = '🎯 ' + ctx.t('preciseBtn');
    pb.classList.toggle('on', !!p.precise); pb.setAttribute('aria-pressed', p.precise ? 'true' : 'false');
  }

  /* ---------- розмір полотна і розміщення фігури ---------- */
  function resize() {
    const g = G0; if (!g) return;
    const r = g.stage.getBoundingClientRect();
    const w = Math.max(50, Math.round(r.width)), h = Math.max(50, Math.round(r.height));
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    if (w === g.cssW && h === g.cssH && dpr === g.dpr) return;
    g.cssW = w; g.cssH = h; g.dpr = dpr;
    g.canvas.width = Math.round(w * dpr); g.canvas.height = Math.round(h * dpr);
    g.canvas.style.width = w + 'px'; g.canvas.style.height = h + 'px';
    if (g.task) { layout(); recomputeCoverage(); }
    draw();
  }

  function layout() {
    const g = G0; if (!g || !g.task || !g.cssW) return;
    const { task, ctx } = g;
    const all = task.strokes, b = bbox(all);
    const span = Math.max(b.w, b.h, 1);
    // допуск: частка розміру фігури; спершу приблизний розмір, щоб знати поле
    const band = ctx.band;
    const lvlScale = Math.max(0.82, 1 - (g.p.level - 1) * 0.006);
    let frac = (TOL_FRAC[band] || .034) * lvlScale;
    if (task.mode === 'memory') frac *= 1.5; else if (task.mode === 'mirror') frac *= 1.25;
    if (task.precise) frac = 0.022;
    const floorPx = task.precise ? 6 : band <= 4 ? 20 : band <= 6 ? 16 : band <= 8 ? 13 : 10;
    const pad0 = 18;
    const H = Math.max(120, g.cssH - (g.reserve || 0));   // місце над карткою результату
    const availW = g.cssW - pad0 * 2, availH = H - pad0 * 2;
    let s = Math.min(b.w > 1 ? availW / b.w : Infinity, b.h > 1 ? availH / b.h : Infinity);
    if (!isFinite(s)) s = Math.min(availW, availH) / span;
    let tol = Math.max(floorPx, frac * span * s);
    // відступ від краю — щоб крапочки й сяйво не різались і палець мав місце
    const pad = Math.max(pad0, tol * 0.9 + 10);
    s = Math.min(b.w > 1 ? (g.cssW - pad * 2) / b.w : Infinity, b.h > 1 ? (H - pad * 2) / b.h : Infinity);
    if (!isFinite(s)) s = Math.min(g.cssW, H) * 0.8 / span;
    s *= task.scale || 1;
    // стеля допуску: на великому полотні коридор не має «з'їдати» деталі фігури
    const capPx = task.precise ? 9 : (band <= 4 ? 30 : band <= 6 ? 25 : band <= 8 ? 21 : 17) * (task.mode === 'memory' ? 1.4 : task.mode === 'mirror' ? 1.2 : 1);
    tol = Math.min(capPx, Math.max(floorPx, frac * span * s));
    const ox = g.cssW / 2 - (b.x0 + b.w / 2) * s, oy = H / 2 - (b.y0 + b.h / 2) * s;
    g.view = { s, ox, oy };
    g.tol = tol;
    g.ptol = tol * 1.2;
    // точки контуру на екрані (кожні ~4 px)
    const toScreen = st => st.map(([x, y]) => [x * s + ox, y * s + oy]);
    g.tgt = []; g.tgtStrokes = [];
    task.target.forEach((st, si) => {
      const scr = toScreen(st); g.tgtStrokes.push(scr);
      resample(scr, 4).forEach(pt => g.tgt.push({ x: pt[0], y: pt[1], si, hit: false }));
    });
    g.allScreen = all.map(toScreen);
    g.givenScreen = g.given ? g.given.map(toScreen) : null;
  }

  const toScr = (g, p) => [p[0] * g.view.s + g.view.ox, p[1] * g.view.s + g.view.oy];
  const toDef = (g, x, y) => [(x - g.view.ox) / g.view.s, (y - g.view.oy) / g.view.s];

  /* ---------- малювання пальцем ---------- */
  function evPos(e) { const g = G0, r = g.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function onDown(e) {
    const g = G0; if (!g || g.phase !== 'draw' || g.pointerId !== null) return;
    e.preventDefault();
    g.pointerId = e.pointerId;
    try { g.canvas.setPointerCapture(e.pointerId); } catch (err) {}
    const [x, y] = evPos(e);
    g.drawing = [toDef(g, x, y)]; g.strokes.push(g.drawing);
    markHits(x, y); g.lastScr = [x, y];
    kick();
  }
  function onMove(e) {
    const g = G0; if (!g || g.pointerId !== e.pointerId || !g.drawing) return;
    e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
    (evs && evs.length ? evs : [e]).forEach(ev => addPoint(evPos(ev)));
    kick();
  }
  function addPoint([x, y]) {
    const g = G0, [lx, ly] = g.lastScr, d = Math.hypot(x - lx, y - ly);
    if (d < 1.5) return;
    const n = Math.ceil(d / 4);
    for (let k = 1; k <= n; k++) markHits(lx + (x - lx) * k / n, ly + (y - ly) * k / n);
    g.drawing.push(toDef(g, x, y)); g.lastScr = [x, y];
  }
  function onUp(e) {
    const g = G0; if (!g || g.pointerId !== e.pointerId) return;
    g.pointerId = null;
    const st = g.drawing; g.drawing = null;
    if (st && st.length === 1) st.push([st[0][0] + 0.01, st[0][1]]);   // крапка-дотик
    if (g.phase !== 'draw') return;
    // автоперевірка: обведено достатньо і акуратно → не треба тиснути «Готово»
    const sc = score();
    const th = thresholds(g.ctx.band, g.task.mode, g.task.precise);
    if (sc.cov >= th.pass[0] && sc.prec >= th.pass[1] && (sc.cov >= th.three[0] || g.task.mode !== 'trace' || coverageOfEachStroke() >= 0.6)) {
      const n = g.strokes.length;
      later(() => { if (g.phase === 'draw' && g.strokes.length === n && g.pointerId === null) evaluate(false); }, 650);
    }
    kick();
  }
  function markHits(x, y) {
    const g = G0, t2 = g.tol * g.tol;
    for (const t of g.tgt) if (!t.hit) { const dx = t.x - x, dy = t.y - y; if (dx * dx + dy * dy <= t2) t.hit = true; }
  }
  function clearStrokes(silent) {
    const g = G0; g.strokes = []; g.drawing = null; g.pointerId = null;
    g.tgt.forEach(t => { t.hit = false; });
    if (!silent) draw();
  }
  function userScreenPts() {
    const g = G0, out = [];
    g.strokes.forEach(st => { const scr = st.map(p => toScr(g, p)); const rs = resample(scr, 4); rs.forEach(q => out.push(q)); });
    return out;
  }
  function recomputeCoverage() {
    const g = G0; if (!g) return;
    g.tgt.forEach(t => { t.hit = false; });
    userScreenPts().forEach(([x, y]) => markHits(x, y));
  }
  function coverageOfEachStroke() {     // найгірше покриття серед окремих ліній контуру
    const g = G0, per = {};
    g.tgt.forEach(t => { const o = per[t.si] = per[t.si] || [0, 0]; o[1]++; if (t.hit) o[0]++; });
    return Math.min(...Object.values(per).map(o => o[0] / o[1]));
  }
  function score() {
    const g = G0;
    const tot = g.tgt.length || 1, cov = g.tgt.filter(t => t.hit).length / tot;
    const pts = userScreenPts(); let near = 0;
    const p2 = g.ptol * g.ptol;
    for (const [x, y] of pts) {
      for (const t of g.tgt) { const dx = t.x - x, dy = t.y - y; if (dx * dx + dy * dy <= p2) { near++; break; } }
    }
    // «зайве чорнило»: каракулі довші за контур більш ніж у 2.5 раза — влучність падає
    // довжину лінії дитини міряємо кроком «допуск» — дрібне тремтіння руки не рахується
    const tLen = g.tgtStrokes.reduce((a, st) => a + polyLen(st), 0) || 1;
    const uLen = g.strokes.reduce((a, st) => a + polyLen(resample(st.map(q => toScr(g, q)), g.tol * 1.5)), 0);
    const ratio = uLen / tLen;
    const prec = pts.length ? (near / pts.length) * Math.min(1, 2.5 / ratio) : 0;
    return { cov, prec, acc: Math.round(100 * (0.6 * cov + 0.4 * prec)), n: pts.length };
  }

  /* ---------- перевірка і нагорода ---------- */
  function evaluate(byButton) {
    const g = G0; if (!g || g.phase !== 'draw') return;
    if (!g.strokes.length) { if (byButton) { sfx('nope'); pulseHint(); } return; }
    const { ctx, p, task } = g;
    const sc = score(), th = thresholds(ctx.band, task.mode, task.precise);
    const pass = sc.cov >= th.pass[0] && sc.prec >= th.pass[1];
    if (!pass) {
      g.phase = 'fail'; g.result = { pass: false, sc };
      sfx('nope');
      const why = sc.cov < th.pass[0] && (sc.prec >= th.pass[1] || sc.cov < 0.5) ? 'failShort' : 'failMessy';
      showCard(false, sc, 0, [], why);
      draw();
      return;
    }
    const stars = sc.cov >= th.three[0] && sc.prec >= th.three[1] ? 3 : sc.cov >= th.two[0] && sc.prec >= th.two[1] ? 2 : 1;
    g.phase = 'result'; g.result = { pass: true, sc, stars }; g.animStart = performance.now();
    // прогрес
    p.done = (p.done || 0) + 1;
    p.level = (p.level || 1) + 1;
    if (stars === 3) p.perfect = (p.perfect || 0) + 1;
    if (task.kind === 'digit') p.digits[task.label.v] = 1;
    if (task.kind === 'letter') p.letters[task.label.v] = 1;
    if (task.mode === 'mirror') p.mirror++;
    if (task.mode === 'memory') p.memory++;
    let newBest = false;
    if (sc.acc > (p.best || 0)) p.best = sc.acc;
    if (task.precise && sc.acc > (p.bestP || 0)) { p.bestP = sc.acc; newBest = true; }
    p.streak = (p.streak || 0) + 1;
    // медалі
    const set = abc(ctx.lang);
    const want = {
      mFirst: p.done >= 1, m10: p.done >= 10, m50: p.done >= 50, m200: p.done >= 200, mPerfect: p.perfect >= 10,
      mDigits: '0123456789'.split('').every(d => p.digits[d]), mLetters: set.every(c => p.letters[c]),
      mMirror: p.mirror >= 10, mMemory: p.memory >= 10,
      mLvl10: p.level >= 10, mLvl25: p.level >= 25, mLvl50: p.level >= 50, mLvl100: p.level >= 100,
      mSniper: task.precise && sc.acc >= 95,
    };
    const got = MEDALS.filter(m => want[m] && !p.medals.includes('edu.draw.' + m)).map(m => 'edu.draw.' + m);
    const reward = STARS_FOR[stars];
    ctx.win({ stars: reward, medal: got[0] || null });
    for (let i = 1; i < got.length; i++) ctx.win({ stars: 0, medal: got[i] }); // хаб сам не рахує такі виклики як розв'язані
    ctx.save();
    sfx(stars === 3 ? 'fanfare' : newBest ? 'record' : 'gameEnd');
    showCard(true, sc, stars, got, null, reward, newBest);
    renderTexts();
    kick();
  }

  function showCard(pass, sc, stars, medals, why, reward, newBest) {
    const g = G0, { ctx } = g, c = g.card;
    c.className = 'drCard ' + (pass ? 'ok' : 'bad');
    let html;
    if (pass) {
      html = '<div class="drStars">' + [1, 2, 3].map(i => '<span class="' + (i <= stars ? 'on' : '') + '">★</span>').join('') + '</div>' +
        '<div class="drTitle"></div><div class="drMeta"><span class="drAcc"></span><b class="drGain"></b></div>' +
        (newBest ? '<div class="drBest"></div>' : '') +
        medals.map(() => '<div class="drMedal"></div>').join('') +
        '<button type="button" class="drNext"></button>';
    } else {
      html = '<div class="drTitle"></div><div class="drWhy"></div><div class="drRow"><button type="button" class="drAgain"></button><button type="button" class="drSkip2"></button></div>';
    }
    c.innerHTML = html;
    const q = s => c.querySelector(s);
    if (pass) {
      q('.drTitle').textContent = ctx.t('r' + stars);
      q('.drAcc').textContent = ctx.t('acc', { n: sc.acc });
      q('.drGain').textContent = '+' + reward + ' ⭐';
      if (newBest) q('.drBest').textContent = '🏆 ' + ctx.t('newBest');
      c.querySelectorAll('.drMedal').forEach((el, i) => { el.textContent = '🏅 ' + ctx.t('medal') + ': ' + ctx.t(medals[i].replace('edu.draw.', '')); });
      q('.drNext').textContent = ctx.t('next') + ' →';
      q('.drNext').addEventListener('click', () => nextTask());
    } else {
      q('.drTitle').textContent = ctx.t('fail');
      q('.drWhy').textContent = ctx.t(why) + ' · ' + ctx.t('acc', { n: sc.acc });
      q('.drAgain').textContent = '↺ ' + ctx.t('again');
      q('.drSkip2').textContent = '⏭ ' + ctx.t('skip');
      q('.drAgain').addEventListener('click', () => { const gg = G0; if (!gg) return; gg.phase = 'draw'; gg.card.classList.add('hidden'); gg.reserve = 0; layout(); clearStrokes(); sfx('tap'); kick(); });
      q('.drSkip2').addEventListener('click', () => { sfx('tap'); nextTask(); });
    }
    c.classList.remove('hidden');
    // фігура піднімається над карткою, щоб її було видно повністю (з заливкою)
    g.reserve = c.offsetHeight + 14;
    layout(); recomputeCoverage(); draw();
  }
  function pulseHint() { const g = G0; if (g) { g.hintBoost = performance.now(); kick(); } }

  /* =================================================================
     ПРОМАЛЬОВКА
     ================================================================= */
  const INK = ['#6bffd1', '#4fc3ff', '#ffcf5a', '#ff7ac6', '#b28dff', '#8dff6b'];
  const FILL = ['#ffcf5a', '#ff8fb8', '#7ef0c8', '#8fc7ff', '#c7a6ff', '#ffb36b'];
  function needsAnim(g) {
    if (!g || !g.task) return false;
    if (g.phase === 'result') return performance.now() - g.animStart < 1600;
    return g.phase === 'show' || (g.phase === 'draw' && hintTarget(g) !== null);
  }
  function kick() {
    const g = G0; if (!g) return;
    if (g.raf) return;
    const loop = () => { g.raf = 0; if (G0 !== g) return; draw(); if (needsAnim(g)) g.raf = requestAnimationFrame(loop); };
    g.raf = requestAnimationFrame(loop);
  }
  // з якої лінії почати: перша ще не обведена (для малих — завжди; 7–8 — поки нічого не намальовано)
  function hintTarget(g) {
    if (g.task.mode !== 'trace' || g.task.precise) return null;
    const band = g.ctx.band;
    if (band >= 9) return null;
    if (band >= 7 && g.strokes.length && !(g.hintBoost && performance.now() - g.hintBoost < 2500)) return null;
    if (g.pointerId !== null) return null;
    const per = {};
    g.tgt.forEach(t => { const o = per[t.si] = per[t.si] || [0, 0]; o[1]++; if (t.hit) o[0]++; });
    for (let si = 0; si < g.tgtStrokes.length; si++) { const o = per[si]; if (o && o[0] / o[1] < 0.6) return si; }
    return null;
  }

  function strokePath(cx, pts, close) {
    cx.beginPath(); cx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) cx.lineTo(pts[i][0], pts[i][1]);
    if (close) cx.closePath();
  }

  function draw() {
    const g = G0; if (!g || !g.cssW) return;
    const cx = g.cx, now = performance.now();
    cx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
    cx.clearRect(0, 0, g.cssW, g.cssH);
    if (!g.task || !g.view) return;
    const { task, ctx } = g, band = ctx.band;
    cx.lineCap = 'round'; cx.lineJoin = 'round';
    const showTarget = task.mode === 'trace' || g.phase === 'show' || g.phase === 'result' || g.phase === 'fail';

    // вісь симетрії і дана половинка
    if (task.mode === 'mirror') {
      cx.save(); cx.setLineDash([6, 8]); cx.strokeStyle = 'rgba(255,255,255,.28)'; cx.lineWidth = 2;
      const ax = g.axis * g.view.s + g.view.ox; cx.beginPath(); cx.moveTo(ax, 8); cx.lineTo(ax, g.cssH - 8); cx.stroke(); cx.restore();
      cx.strokeStyle = 'rgba(244,241,255,.92)'; cx.lineWidth = 5;
      g.givenScreen.forEach(st => { strokePath(cx, st); cx.stroke(); });
    }
    // кутики-підказки місця для «з пам'яті»
    if (task.mode === 'memory' && g.phase === 'draw') {
      const b = bbox(g.allScreen), m = 14;
      cx.strokeStyle = 'rgba(255,255,255,.35)'; cx.lineWidth = 3;
      [[b.x0, b.y0, 1, 1], [b.x1, b.y0, -1, 1], [b.x0, b.y1, 1, -1], [b.x1, b.y1, -1, -1]].forEach(([x, y, sx, sy]) => {
        cx.beginPath(); cx.moveTo(x - sx * 6, y - sy * 6 + sy * m); cx.lineTo(x - sx * 6, y - sy * 6); cx.lineTo(x - sx * 6 + sx * m, y - sy * 6); cx.stroke();
      });
    }
    // заливка кольором після успіху
    if (g.phase === 'result') {
      const k = Math.min(1, (now - g.animStart) / 700);
      task.strokes.forEach((st, i) => {
        if (!task.closed[i] || g.task.glyph) return;
        cx.globalAlpha = 0.55 * k; cx.fillStyle = FILL[i % FILL.length];
        strokePath(cx, g.allScreen[i], true); cx.fill('evenodd');
      });
      cx.globalAlpha = 1;
    }
    if (showTarget) {
      const list = task.mode === 'mirror' ? g.tgtStrokes : g.allScreen;
      // сяйво-коридор (наскільки можна відхилитись)
      const glowA = g.phase === 'show' ? .18 : band <= 6 ? .13 : .08;
      cx.strokeStyle = 'rgba(126,240,200,' + glowA + ')';
      cx.lineWidth = task.precise ? g.tol * 2 : Math.min(g.tol * 2, band <= 6 ? g.tol * 2 : g.tol * 1.4);
      list.forEach(st => { strokePath(cx, st); cx.stroke(); });
      if (g.phase === 'show') {
        cx.strokeStyle = 'rgba(244,241,255,.95)'; cx.lineWidth = 5;
        list.forEach(st => { strokePath(cx, st); cx.stroke(); });
      } else {
        // крапочки: зелені — уже обведено, помаранчеві — пропущено (після «Майже»)
        const r = band <= 4 ? 4.2 : band <= 8 ? 3.6 : 3, every = band <= 4 ? 3 : 3;
        g.tgt.forEach((t, i) => {
          if (i % every) return;
          cx.fillStyle = t.hit ? '#6bffd1' : g.phase === 'fail' ? '#ff9f43' : 'rgba(244,241,255,.82)';
          cx.beginPath(); cx.arc(t.x, t.y, t.hit ? r + 0.6 : r, 0, Math.PI * 2); cx.fill();
        });
      }
    }
    // лінії дитини
    const w = band <= 4 ? 11 : band <= 8 ? 9 : 7;
    g.strokes.forEach((st, i) => {
      if (st.length < 2) return;
      const scr = st.map(p => toScr(g, p));
      cx.strokeStyle = 'rgba(0,0,0,.25)'; cx.lineWidth = w + 3; strokePath(cx, scr); cx.stroke();
      cx.strokeStyle = g.phase === 'result' ? INK[(i + Math.floor((now - g.animStart) / 120)) % INK.length] : INK[i % INK.length];
      cx.lineWidth = w; strokePath(cx, scr); cx.stroke();
    });
    // підказка старту: пульсуюча точка + стрілка напрямку
    const hs = g.phase === 'draw' ? hintTarget(g) : null;
    if (hs !== null && g.tgtStrokes[hs]) {
      const st = g.tgtStrokes[hs], p0 = st[0];
      const k = (Math.sin((now - g.t0) / 260) + 1) / 2;
      cx.fillStyle = 'rgba(255,207,90,' + (0.25 + 0.25 * k) + ')';
      cx.beginPath(); cx.arc(p0[0], p0[1], 14 + 8 * k, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = '#ffcf5a'; cx.beginPath(); cx.arc(p0[0], p0[1], 8, 0, Math.PI * 2); cx.fill();
      // точка на ~34 px уздовж лінії
      let acc = 0, a = p0, b = st[st.length - 1];
      for (let i = 1; i < st.length; i++) { const d = Math.hypot(st[i][0] - st[i - 1][0], st[i][1] - st[i - 1][1]); acc += d; if (acc >= 34) { b = st[i]; break; } }
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), dist = 30 + 6 * k;
      const hx = p0[0] + Math.cos(ang) * dist, hy = p0[1] + Math.sin(ang) * dist;
      cx.save(); cx.translate(hx, hy); cx.rotate(ang);
      cx.fillStyle = '#ffcf5a'; cx.strokeStyle = 'rgba(0,0,0,.35)'; cx.lineWidth = 2;
      cx.beginPath(); cx.moveTo(10, 0); cx.lineTo(-6, -9); cx.lineTo(-2, 0); cx.lineTo(-6, 9); cx.closePath(); cx.stroke(); cx.fill();
      cx.restore();
    }
    // іскорки при успіху
    if (g.phase === 'result') {
      const t = (now - g.animStart) / 1600;
      if (t < 1) {
        const b = bbox(g.allScreen), cxm = (b.x0 + b.x1) / 2, cym = (b.y0 + b.y1) / 2, R = Math.max(b.w, b.h) / 2 + 10;
        for (let i = 0; i < 14; i++) {
          const a = i / 14 * Math.PI * 2 + i, rr = R * (0.4 + t * 0.8);
          cx.globalAlpha = 1 - t; cx.fillStyle = INK[i % INK.length];
          const x = cxm + Math.cos(a) * rr, y = cym + Math.sin(a) * rr;
          cx.beginPath(); cx.arc(x, y, 3 + 3 * (1 - t), 0, Math.PI * 2); cx.fill();
        }
        cx.globalAlpha = 1;
      }
    }
  }

  // для автотестів: точки контуру на екрані (відносно сторінки) і поточний стан
  window.BO_EDU_DRAW = {
    get running() { return !!G0; },
    get phase() { return G0 && G0.phase; },
    get task() { const g = G0; return g && g.task ? { key: g.task.key, kind: g.task.kind, mode: g.task.mode, label: g.task.label, precise: !!g.task.precise } : null; },
    get tol() { return G0 && G0.tol; },
    targetPage() {
      const g = G0; if (!g) return null;
      const r = g.canvas.getBoundingClientRect();
      return g.tgtStrokes.map(st => st.map(([x, y]) => [x + r.left, y + r.top]));
    },
    canvasRect() { const g = G0; if (!g) return null; const r = g.canvas.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, bw: g.canvas.width, bh: g.canvas.height }; },
    score() { return G0 ? score() : null; },
    result() { return G0 && G0.result; },
    next() { if (G0) nextTask(); },
    _pick: pickTask, _glyph: glyph, _shapes: Object.keys(SH), _abc: ABC,
  };

  BO.edu.register({ id: 'draw', slot: 2, icon: '✏️', start, stop });
})();
