/* OTOTO — МОДУЛЬ "МАПА ПРИГОД" (економіка "купи рівень"). CoLaba Production.
   Усі зірки йдуть лише в гаманець (state.points). Мапа сама НЕ рухається:
   дитина сама вирішує, на що витратити зірки — одяг/друзі/кімната або наступний
   рівень мапи. Кнопка "Відкрити рівень N — X ⭐" знімає X зірок, персонаж іде
   доріжкою до нового вузла, потім видається нагорода рівня (завжди менша за ціну).
   Мапа нескінченна: після останньої зони землі повторюються колами (коло 2, 3 …),
   номери рівнів ідуть далі. Кожен 5-й рівень — скриня 🎁, кожен 10-й — замок 🏰.
   Ядро (app.js) не правиться: усе через BO.on(...). Тексти — ключі 'map.*'. */
(function () {
  'use strict';
  if (!window.BO) return;
  const BO = window.BO;

  /* ---------- Налаштування (ЄДИНЕ місце для балансу) ---------- */
  const MAP = {
    // Ціна відкриття рівня n: min(base + step*(n-1), cap). Рівень 1 — подарунок (0 ⭐).
    price: { base: 20, step: 2, cap: 100, freeUpTo: 1 },
    // Нагорода за рівень — частка його ціни (завжди менше ціни, щоб цикл не був "вічним двигуном").
    reward: { normal: 0.20, chest: 0.35, castle: 0.60, free: 5 },
    levelsPerZone: 10,
    chestEvery: 5,
    behind: 6, ahead: 10,       // скільки вузлів малювати до/після поточного
    rowH: 96,                   // висота одного "кроку" шляху, px
    zones: [
      // Зона з намальованими малюнками: bgImg — безшовний фон, sceneryImg — декор (img/map/<зона>/).
      // Зони без цих полів поки малюються емодзі; щойно малюнки готові — додати ці 2 поля, більше нічого.
      // Одне коло = zones.length * levelsPerZone рівнів (зараз 6 × 10 = 60), далі — коло 2, 3 …
      { id: 'meadow',    emoji: '🌼', bg: '#1d3b2a', path: '#ffd86b', scenery: ['🌼', '🌷', '🌻', '🦋', '🍄', '🌿'],
        bgImg: 'img/map/meadow/bg.jpg', bgH: 886,
        sceneryImg: ['daisy', 'tulip', 'sunflower', 'butterfly', 'mushroom', 'clover'].map(f => 'img/map/meadow/' + f + '.png') },
      { id: 'forest',    emoji: '🌲', bg: '#15302a', path: '#ffc66b', scenery: ['🌲', '🌳', '🦊', '🍄', '🦔', '🌰'],
        bgImg: 'img/map/forest/bg.jpg', bgH: 940,
        sceneryImg: ['fir', 'oak', 'fox', 'boletus', 'hedgehog', 'acorn'].map(f => 'img/map/forest/' + f + '.png') },
      { id: 'sea',       emoji: '🌊', bg: '#12304d', path: '#ffe08a', scenery: ['🌊', '🐚', '🐠', '🐬', '🏝️', '⛵'] },
      { id: 'mountains', emoji: '⛰️', bg: '#2b2b44', path: '#ffd86b', scenery: ['⛰️', '🏔️', '🐐', '❄️', '🌲', '🦅'] },
      { id: 'sky',       emoji: '☁️', bg: '#26406e', path: '#fff2a8', scenery: ['☁️', '🌈', '🎈', '🕊️', '⭐', '🪁'] },
      { id: 'space',     emoji: '🪐', bg: '#160f33', path: '#ffd86b', scenery: ['🪐', '🌙', '⭐', '☄️', '🚀', '🛸'] },
    ],
  };

  /* ---------- Ціна і нагорода ---------- */
  function price(n) {
    n = Math.floor(+n || 0);
    const p = MAP.price;
    if (n <= p.freeUpTo) return 0;
    return Math.min(p.base + p.step * (n - 1), p.cap);
  }
  const threshold = price;      // сумісність: раніше "поріг рівня", тепер — його ціна

  /* Старе правило (до 13.11.2026): рівень за "усього зароблено". Лишилось ТІЛЬКИ
     для міграції старих збережень і для сумісності BO.map.levelFor(total). */
  const LEGACY_STEP = { base: 30, lin: 12, quad: 0.15, roundTo: 5 };
  function legacyThreshold(n) {
    if (n <= 0) return 0;
    const s = LEGACY_STEP, m = n - 1;
    const sum = s.base * n + s.lin * (m * n) / 2 + s.quad * (m * n * (2 * m + 1)) / 6;
    return Math.round(sum / s.roundTo) * s.roundTo;
  }
  function levelFor(total) {
    total = total || 0;
    let n = 0;
    while (legacyThreshold(n + 1) <= total && n < 100000) n++;
    return n;
  }

  function zoneOf(n) {           // рівні 1-10 → зона 0, 11-20 → зона 1 … ; cycle — номер кола з 0
    n = Math.floor(+n || 0);
    const idx = Math.max(0, Math.floor((Math.max(n, 1) - 1) / MAP.levelsPerZone));
    return { idx, cycle: Math.floor(idx / MAP.zones.length), z: MAP.zones[idx % MAP.zones.length] };
  }
  function zoneName(n) {
    const zo = zoneOf(n);
    const name = BO.t('map.zone.' + zo.z.id);
    return zo.cycle ? name + ' · ' + BO.t('map.lap', { n: zo.cycle + 1 }) : name;
  }
  function kindOf(n) {
    if (n <= 0) return 'start';
    if (n % MAP.levelsPerZone === 0) return 'castle';
    if (n % MAP.chestEvery === 0) return 'chest';
    return 'normal';
  }
  function rewardFor(n) {
    const k = kindOf(n);
    if (k === 'start') return 0;
    const p = price(n);
    if (p <= 0) return MAP.reward.free;
    return Math.max(1, Math.min(p - 1, Math.round(p * MAP.reward[k])));
  }

  /* ---------- Стан ----------
     state.map = { opened, claimed, walkedTo, announced }
       opened    — до якого рівня мапу відкрито (куплено);
       claimed   — нагороди забрано до цього рівня включно;
       walkedTo  — до якого вузла персонаж уже дійшов (анімація ходьби);
       announced — для якого рівня вже сказали "зірок вистачає" на головному екрані.
     state.totalEarned ядро далі рахує, мапа його лише читає при міграції. */
  function S() { return BO.state; }
  function ensureState() {
    const st = S(); if (!st) return null;
    if (!st.map) {
      // дуже старе збереження без мапи — за старим правилом брали max(totalEarned, points)
      const tot = Math.max(st.totalEarned || 0, st.points || 0);
      const L = levelFor(tot);
      st.map = { opened: L, claimed: L, walkedTo: L, announced: L };
    }
    if (typeof st.map.opened !== 'number') {
      // МІГРАЦІЯ: рівень, якого дитина вже досягла за старим правилом, лишається відкритим.
      st.map.opened = levelFor(Math.max(st.totalEarned || 0, 0));
    }
    const m = st.map;
    m.opened = Math.max(0, Math.floor(m.opened));
    if (typeof m.claimed !== 'number') m.claimed = m.opened;
    m.claimed = Math.min(m.claimed, m.opened);
    if (typeof m.walkedTo !== 'number') m.walkedTo = m.opened;
    if (typeof m.announced !== 'number') m.announced = m.opened;
    return st;
  }
  function opened() { const st = S(); return (st && st.map && st.map.opened) || 0; }
  function curLevel() { return opened(); }
  function nextPrice() { return price(opened() + 1); }
  function waiting() { const st = S(); return st && st.map ? Math.max(0, st.map.opened - st.map.claimed) : 0; }
  function canAfford() { const st = S(); return !!(st && st.map) && (st.points || 0) >= nextPrice(); }

  /* ---------- DOM ---------- */
  let btn, view, scrollEl, pathEl, toastEl, lastSig = '';

  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function buildDom() {
    if (BO.$('view-map')) return;
    btn = document.createElement('button');
    btn.className = 'navBtn mapNavBtn';
    btn.id = 'btnMap';
    btn.innerHTML = '🗺️<span></span><b class="mapBadge hidden">!</b>';
    btn.addEventListener('click', openMap);
    BO.$('navRow').appendChild(btn);

    view = document.createElement('section');
    view.id = 'view-map';
    view.className = 'view hidden';
    view.innerHTML =
      '<div class="mapHead">' +
        '<div class="mapTitleRow">' +
          '<span class="mapZoneEmoji"></span>' +
          '<div class="mapTitles"><div class="mapTitle"></div><div class="mapZone"></div></div>' +
          '<div class="mapLevel"></div>' +
        '</div>' +
        '<div class="mapBar"><div class="mapBarFill"></div></div>' +
        '<div class="mapProgress"></div>' +
      '</div>' +
      '<div class="mapScroll"><div class="mapPath"></div></div>' +
      '<div class="mapFoot">' +
        '<button class="secondaryBtn mapBack"></button>' +
        '<button class="mapBuy"><span class="mapBuyMain fit"></span><span class="mapBuySub fit" data-fit-lines="1"></span></button>' +
      '</div>' +
      '<div class="mapToast hidden"></div>';
    BO.$('screen').appendChild(view);
    scrollEl = view.querySelector('.mapScroll');
    pathEl = view.querySelector('.mapPath');
    toastEl = view.querySelector('.mapToast');
    view.querySelector('.mapBack').addEventListener('click', () => { stopWalk(false); BO.backToMain(); });
    pathEl.addEventListener('click', onPathClick);
    view.querySelector('.mapBuy').addEventListener('click', onBuyClick);
  }

  function updateButton() {
    if (!btn) return;
    btn.querySelector('span').textContent = BO.t('map.nav');
    // світиться, коли зірок вистачає на наступний рівень (або нагорода ще не забрана)
    const on = canAfford() || waiting() > 0;
    btn.querySelector('.mapBadge').classList.toggle('hidden', !on);
    btn.classList.toggle('mapCanBuy', on);
  }

  function isOpen() { return view && !view.classList.contains('hidden'); }

  /* ---------- Малювання мапи ---------- */
  function xOf(n) { return 50 + 26 * Math.round(Math.sin(n * Math.PI / 2)); } // 50, 76, 50, 24 …
  function hash(n) { let h = Math.imul(n, 2654435761) >>> 0; h = (h ^ (h >>> 13)) >>> 0; return h; }

  function renderHeader() {
    const st = S(), lvl = curLevel(), next = lvl + 1;
    const zo = zoneOf(Math.max(lvl, 1));
    const p = price(next), have = st.points || 0;
    view.querySelector('.mapZoneEmoji').textContent = zo.z.emoji;
    view.querySelector('.mapTitle').textContent = BO.t('map.title');
    view.querySelector('.mapZone').textContent = zoneName(Math.max(lvl, 1));
    view.querySelector('.mapLevel').textContent = BO.t('map.level', { n: lvl });
    // смужка — скільки зірок у гаманці від ціни наступного рівня
    view.querySelector('.mapBarFill').style.width = (p <= 0 ? 100 : Math.max(3, Math.min(100, Math.round(100 * have / p)))) + '%';
    const w = waiting(), ok = have >= p;
    const prog = view.querySelector('.mapProgress');
    prog.textContent = w > 0 ? BO.t('map.ready')
      : p <= 0 ? BO.t('map.freeHint')
      : ok ? BO.t('map.canBuy', { n: next })
      : BO.t('map.progress', { x: have, y: p, n: next });
    prog.classList.toggle('ready', w > 0 || ok);
    view.querySelector('.mapBack').textContent = BO.t('map.back');

    // велика кнопка: забрати нагороду / відкрити рівень / ще треба зірок
    const b = view.querySelector('.mapBuy'), main = b.querySelector('.mapBuyMain'), sub = b.querySelector('.mapBuySub');
    b.classList.remove('claim', 'off');
    if (w > 0) {
      b.classList.add('claim');
      main.textContent = BO.t('map.claimBtn');
      sub.textContent = BO.t('map.level', { n: st.map.claimed + 1 });
    } else {
      main.textContent = BO.t('map.buy', { n: next });
      sub.textContent = p <= 0 ? BO.t('map.free') : ok ? p + ' ⭐' : BO.t('map.need', { n: p - have });
      if (!ok) b.classList.add('off');
    }
    b.setAttribute('aria-disabled', (w === 0 && !ok) ? 'true' : 'false');
  }

  function renderPath() {
    const st = S(), lvl = curLevel(), claimed = Math.min(st.map.claimed, lvl);
    const lo = Math.max(0, Math.min(lvl - MAP.behind, claimed + 1));
    const hi = lvl + MAP.ahead;
    const R = MAP.rowH, pad = R / 2 + 20;
    const H = (hi - lo) * R + pad * 2;
    const yOf = n => pad + (hi - n) * R; // вищі рівні — вгорі, шлях іде знизу вгору
    let html = '';

    // смуги-фони зон (по рядку на рівень); на воротах — перехід у наступну зону
    for (let n = hi; n >= lo; n--) {
      let top = yOf(n) - R / 2, bh = R;
      if (n === hi) { bh += top; top = 0; }          // верхня смуга — до самого верху
      if (n === lo) bh = H - top;                     // нижня — до самого низу
      const zc = zoneOf(Math.max(n, 1)), zn = zoneOf(n + 1);
      const c1 = zc.z.bg, c2 = zn.z.bg;
      let bg = (zc.idx !== zn.idx) ? 'linear-gradient(to top,' + c1 + ',' + c2 + ')' : c1;
      if (zc.z.bgImg && zc.idx === zn.idx) {
        // намальований фон: один безшовний малюнок на всю зону, без стиків між смугами
        bg = 'linear-gradient(rgba(10,20,15,.18),rgba(10,20,15,.18)),url(' + zc.z.bgImg + ') 0 ' + (-top) + 'px / 100% auto repeat-y,' + c1;
      }
      const tint = zc.cycle ? ';filter:hue-rotate(' + (zc.cycle * 35) + 'deg)' : '';
      html += '<div class="mapBand" style="top:' + top + 'px;height:' + bh + 'px;background:' + bg + tint + '"></div>';
    }

    // лінія шляху (SVG у відсотках по ширині)
    let segs = '';
    for (let n = lo; n < hi; n++) {
      const x0 = xOf(n), y0 = yOf(n), x1 = xOf(n + 1), y1 = yOf(n + 1), ym = (y0 + y1) / 2;
      const done = n + 1 <= lvl;
      segs += '<path class="' + (done ? 'seg done' : 'seg') + '" d="M' + x0 + ' ' + y0 + ' C' + x0 + ' ' + ym + ' ' + x1 + ' ' + ym + ' ' + x1 + ' ' + y1 + '"/>';
    }
    html += '<svg class="mapLine" viewBox="0 0 100 ' + H + '" preserveAspectRatio="none" style="height:' + H + 'px">' + segs + '</svg>';

    // декор навколо шляху
    for (let n = hi; n >= lo; n--) {
      const z = zoneOf(Math.max(n, 1)).z, h = hash(n + 7), x = xOf(n);
      const sides = x > 50 ? [10 + (h % 8)] : x < 50 ? [82 + (h % 8)] : [8 + (h % 6), 86 + ((h >> 3) % 6)];
      sides.forEach((sx, i) => {
        const dy = ((h >> 5) % 30) - 15;
        if (z.sceneryImg) {
          // великі намальовані малюнки різного розміру — глибина, а не дрібні емодзі
          const src = z.sceneryImg[(h >>> (i * 4)) % z.sceneryImg.length];
          const size = 62 + ((h >> 9) % 30);
          const fly = /butterfly/.test(src) ? ' flutter' : '';
          html += '<img class="mapDecoImg' + fly + '" src="' + src + '" alt="" style="left:' + sx + '%;top:' + (yOf(n) + dy) + 'px;width:' + size + 'px">';
          // другий, дрібніший малюнок трохи далі — щільніше заповнення
          if (h % 3 !== 0) {
            const src2 = z.sceneryImg[(h >>> 13) % z.sceneryImg.length];
            const sx2 = sx < 50 ? sx + 10 + (h % 6) : sx - 10 - (h % 6);
            html += '<img class="mapDecoImg small' + (/butterfly/.test(src2) ? ' flutter' : '') + '" src="' + src2 + '" alt="" style="left:' + sx2 + '%;top:' + (yOf(n) + dy + 34) + 'px;width:' + (38 + (h >> 17) % 14) + 'px">';
          }
          return;
        }
        const e = z.scenery[(h >>> (i * 4)) % z.scenery.length];
        const size = 22 + ((h >> 9) % 12);
        html += '<span class="mapDeco" style="left:' + sx + '%;top:' + (yOf(n) + dy) + 'px;font-size:' + size + 'px">' + e + '</span>';
      });
    }

    // табличка нової землі над воротами
    for (let n = hi; n >= lo; n--) {
      if (n > 0 && n % MAP.levelsPerZone === 0) {
        const nz = zoneOf(n + 1);
        html += '<div class="mapZoneSign" style="top:' + (yOf(n) - R / 2) + 'px">' + nz.z.emoji + ' ' + esc(zoneName(n + 1)) + '</div>';
      }
    }

    // вузли
    for (let n = lo; n <= hi; n++) {
      const kind = kindOf(n);
      let cls = 'mapNode ' + kind, icon, label = n > 0 ? String(n) : esc(BO.t('map.start'));
      if (n === 0) { cls += ' done'; icon = '🏁'; }
      else if (n <= claimed) { cls += ' done'; icon = kind === 'castle' ? '🏰' : '★'; }
      else if (n <= lvl) { cls += (n === claimed + 1) ? ' ready' : ' waiting'; icon = kind === 'castle' ? '🏰' : '🎁'; }
      else {
        cls += ' locked'; icon = kind === 'castle' ? '🏰' : kind === 'chest' ? '🎁' : String(n);
        if (n === lvl + 1 && claimed === lvl) cls += canAfford() ? ' next afford' : ' next';   // наступний — купити
      }
      if (n === lvl) cls += ' current';
      const showNum = n > 0 && icon !== String(n);
      html += '<button class="' + cls + '" data-n="' + n + '" style="left:' + xOf(n) + '%;top:' + yOf(n) + 'px">' +
        '<span class="mapIcon">' + icon + '</span>' +
        (showNum || n === 0 ? '<span class="mapNum">' + label + '</span>' : '') + '</button>';
    }

    // персонаж на поточному рівні
    const ch = BO.activeCharacter();
    html += '<img class="mapPet" src="' + esc(ch.img) + '" alt="" style="left:' + xOf(lvl) + '%;top:' + yOf(lvl) + 'px">';

    pathEl.style.height = H + 'px';
    pathEl.innerHTML = html;
    pathEl._yOf = yOf;
  }

  function renderMap() {
    if (!view || !ensureState()) return;
    stopWalk(false);
    renderHeader();
    renderPath();
    lastSig = sig();
    maybeWalk();
  }
  function sig() {
    const st = S();
    return [st.points, st.map.opened, st.map.claimed, st.activeChar, st.lang].join('|');
  }

  function scrollToLevel(n, smooth) {
    if (!pathEl._yOf) return;
    const top = pathEl._yOf(n) - scrollEl.clientHeight / 2;
    scrollEl.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
  }

  function openMap() {
    ensureState();
    BO.openView('view-map');
    renderMap();
    if (walk) return;            // мапа відкрилась з ходьбою — прокрутку веде анімація
    const w = waiting();
    scrollToLevel(w > 0 ? S().map.claimed + 1 : curLevel(), false);
  }

  /* ---------- Ходьба персонажа доріжкою ----------
     Коли рівень виріс (або мапу відкрили після того, як рівні набрались),
     персонаж іде від попереднього вузла до нового саме по намальованій кривій.
     Гекон — скелетною лялькою з біговим циклом (anim.js); гриб, робот, кит і
     кактус — своїми ляльками й ходою (BOAnim.walkPose). Якщо ляльки нема —
     запасний варіант: стрибки цілої картинки зі сплющенням/розтягуванням.
     Тап по мапі — пропустити. */
  const WALK = { segSec: .8, maxSegs: 4, hopsPerSeg: 2 };
  let walk = null, swallowClick = false;

  function segPoints(n) {        // кубічна крива між вузлами n → n+1, у px шляху
    const W = pathEl.clientWidth || 360, yOf = pathEl._yOf;
    const x0 = xOf(n) * W / 100, y0 = yOf(n), x1 = xOf(n + 1) * W / 100, y1 = yOf(n + 1), ym = (y0 + y1) / 2;
    return [[x0, y0], [x0, ym], [x1, ym], [x1, y1]];
  }
  function bez(P, u) {
    const v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
    return [a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0], a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1]];
  }
  // рівномірна за довжиною таблиця точок усього маршруту
  function buildRoute(from, to) {
    const pts = [];
    for (let n = from; n < to; n++) {
      const P = segPoints(n);
      for (let i = (n === from ? 0 : 1); i <= 40; i++) pts.push(bez(P, i / 40));
    }
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, len, total: len[len.length - 1] };
  }
  function routeAt(R, dist) {
    let lo = 0, hi = R.len.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (R.len[m] < dist) lo = m; else hi = m; }
    const span = R.len[hi] - R.len[lo] || 1, k = Math.max(0, Math.min(1, (dist - R.len[lo]) / span));
    const a = R.pts[lo], b = R.pts[hi];
    return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, dx: b[0] - a[0] };
  }

  function maybeWalk() {
    const st = S(), lvl = curLevel();
    if (!isOpen() || !pathEl._yOf) return;
    let from = st.map.walkedTo;
    if (from >= lvl) { if (from > lvl) { st.map.walkedTo = lvl; BO.saveState(); } return; }
    from = Math.max(from, lvl - WALK.maxSegs);          // багато рівнів одразу — ідемо останні кілька
    st.map.walkedTo = lvl;
    BO.saveState();
    startWalk(from, lvl);
  }

  function startWalk(from, to) {
    const pet = pathEl.querySelector('.mapPet');
    if (!pet) return;
    const R = buildRoute(from, to);
    const gecko = BO.state.activeChar === 'gecko' && window.BOAnim && window.BOAnim.RIG.baby;
    const rigName = !gecko && window.BOAnim && window.BOAnim.rigFor ? window.BOAnim.rigFor(BO.state.activeChar) : null;
    const w = { from, to, R, pet, t0: performance.now(), dur: (to - from) * WALK.segSec * 1000, face: 1, raf: 0 };
    pet.classList.add('mapPetWalking');
    pet.style.visibility = 'hidden';
    const pw = pet.offsetWidth || 58;
    w.pw0 = pw;
    if (gecko) {
      w.rig = window.BOAnim.createRig('baby', 'mapWalkRig');
      w.rig.sizeByHeight(pw * 255 / 320);       // як gecko.png у .mapPet
      w.lift = pw * 1.12 - pw * 293 / 320;      // лапи над центром вузла (translate -112%)
      pathEl.appendChild(w.rig.el);
    } else if (rigName) {
      // лялька в тій самій системі, що й картинка 320×320 у .mapPet (translate -50%,-112%)
      w.rig = window.BOAnim.createRig(rigName, 'mapWalkRig');
      w.rigName = rigName;
      w.rig.s = pw / w.rig.R.w;
      w.offX = (w.rig.ax - w.rig.R.w / 2) * w.rig.s;
      w.offY = -pw * 1.12 + w.rig.ay * w.rig.s;      // якір (низ фігури) відносно центру вузла
      // одразу обличчям у бік маршруту (без розвороту "ребром" на старті)
      for (let i = 1; i < R.pts.length; i++) {
        const dx = R.pts[i][0] - R.pts[0][0];
        if (Math.abs(dx) > 2) { w.face = w.faceS = dx > 0 ? -1 : 1; break; }
      }
      pathEl.appendChild(w.rig.el);
    } else {
      w.img = document.createElement('img');
      w.img.className = 'mapPetHop';
      w.img.src = pet.getAttribute('src');
      w.img.style.width = pw + 'px';
      w.pw = pw; w.ph = pet.offsetHeight || pw;
      w.lift = w.ph * .12;
      pathEl.appendChild(w.img);
    }
    walk = w;
    scrollEl.addEventListener('pointerdown', onWalkTap, true);
    w.raf = requestAnimationFrame(walkFrame);
  }

  function walkFrame(now) {
    const w = walk; if (!w) return;
    const el = now - w.t0, u = Math.min(1, el / w.dur);
    // плавний старт і зупинка всього маршруту, всередині — рівна швидкість
    const e = u < .12 ? (u * u) / (2 * .12 * .88) : u > .88 ? 1 - ((1 - u) * (1 - u)) / (2 * .12 * .88) : (u - .06) / .88;
    const dist = Math.max(0, Math.min(1, e)) * w.R.total;
    const p = routeAt(w.R, dist);
    if (Math.abs(p.dx) > .6) w.face = p.dx > 0 ? -1 : 1;           // обличчям туди, куди йде (картинка дивиться ліворуч)
    w.faceS = w.faceS === undefined ? w.face : w.faceS + (w.face - w.faceS) * .35;  // швидкий, але не миттєвий розворот
    const fs = Math.abs(w.faceS) < .08 ? (w.faceS < 0 ? -.08 : .08) : w.faceS;
    if (w.rigName) {
      const t = el / 1000, pose = window.BOAnim.walkPose(w.rigName, t, { face: fs, left: (w.dur - el) / 1000 });
      pose.x = p.x + w.offX; pose.y = p.y + w.offY + (pose.dy || 0) * w.pw0 / 58;   // підскок — у px мапи при ширині 58
      w.rig.apply(pose);
      if (u < .95) window.BOAnim.walkFx(w.rigName, w, w.rig, pathEl, t, p.x, p.y + w.offY, fs);
    } else if (w.rig) {
      const pose = window.BOAnim.runPose(el / 1000, { face: fs, amp: 26, period: .3, bob: 14, lean: 3 });
      pose.x = p.x; pose.y = p.y - w.lift + (pose.dy || 0);
      w.rig.apply(pose);
      if (now - (w.lastDust || 0) > 110 && u < .95) {
        w.lastDust = now;
        window.BOAnim.dust(pathEl, p.x + fs * w.rig.figW * w.rig.s * .3, p.y - w.lift, fs > 0 ? 1 : -1);
      }
    } else {
      const hops = w.R.total / ((w.to - w.from) * WALK.hopsPerSeg) || 1;
      const h = Math.abs(Math.sin(Math.PI * dist / hops));        // 0 — на землі, 1 — у польоті
      const sy = .84 + .26 * h, sx = (1 / Math.sqrt(sy)) * fs;
      const tilt = -fs * 6 * h;
      w.img.style.transform = 'translate(' + (p.x - w.pw / 2).toFixed(1) + 'px,' + (p.y - w.lift - w.ph - 18 * h).toFixed(1) +
        'px) rotate(' + tilt.toFixed(1) + 'deg) scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ')';
    }
    scrollEl.scrollTop = Math.max(0, p.y - scrollEl.clientHeight / 2);
    if (u >= 1) { stopWalk(true); return; }
    w.raf = requestAnimationFrame(walkFrame);
  }

  function onWalkTap(e) {        // тап під час ходьби — одразу на місце (і без "тапу" по вузлу)
    if (!walk) return;
    e.stopPropagation();
    swallowClick = true;
    setTimeout(() => { swallowClick = false; }, 400);
    stopWalk(true);
  }

  function stopWalk(scroll) {
    const w = walk; if (!w) return;
    walk = null;
    cancelAnimationFrame(w.raf);
    scrollEl.removeEventListener('pointerdown', onWalkTap, true);
    if (w.rig) w.rig.el.remove();
    if (w.img) w.img.remove();
    w.pet.classList.remove('mapPetWalking');
    w.pet.style.visibility = '';
    if (scroll) {
      scrollToLevel(w.to, true);
      claimIfFresh(w.to);          // дійшов (або тапнули "пропустити") — видаємо нагороду
    }
  }

  /* ---------- Тап по вузлу ---------- */
  let toastT = null;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.remove('hidden');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.add('hidden'), 2200);
  }

  function onPathClick(e) {
    if (swallowClick) { swallowClick = false; return; }
    const node = e.target.closest('.mapNode');
    if (!node) return;
    const n = +node.dataset.n, st = S(), lvl = curLevel();
    if (n === 0) return;
    if (n <= st.map.claimed) { toast(BO.t('map.doneHint')); return; }
    if (n <= lvl) {
      if (n !== st.map.claimed + 1) { toast(BO.t('map.waitHint')); scrollToLevel(st.map.claimed + 1, true); return; }
      claim(n); return;
    }
    if (waiting() > 0) { toast(BO.t('map.waitHint')); scrollToLevel(st.map.claimed + 1, true); return; }
    if (n === lvl + 1) { onBuyClick(); return; }               // наступний вузол = та сама кнопка
    toast(BO.t('map.lockedFar', { n: lvl + 1 }));
  }

  function onBuyClick() {
    if (walk) { stopWalk(true); return; }                       // тап під час ходьби — одразу на місце
    const st = S();
    if (waiting() > 0) { scrollToLevel(st.map.claimed + 1, true); claim(st.map.claimed + 1); return; }
    const n = curLevel() + 1, p = price(n), have = st.points || 0;
    if (have < p) { toast(BO.t('map.lockedHint', { n: p - have })); bump(); return; }
    buy(n);
  }
  function bump() {
    const b = view.querySelector('.mapBuy');
    b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
  }

  // Купівля рівня: зняти зірки → рівень відкрито → персонаж іде → нагорода.
  function buy(n) {
    const st = S(), p = price(n);
    if (n !== st.map.opened + 1 || (st.points || 0) < p) return false;
    st.points = (st.points || 0) - p;   // напряму: витрата не повинна чіпати totalEarned
    st.map.opened = n;
    st.map.announced = Math.max(st.map.announced, n);
    BO.saveState();
    toastEl.classList.add('hidden');
    renderMap();                         // стартує ходьбу walkedTo → n (див. maybeWalk)
    BO.render();                         // оновити зірки у верхній панелі
    updateButton();
    try { document.dispatchEvent(new CustomEvent('bo:mapLevel', { detail: { level: n, price: p } })); }
    catch (e) { console.error('[map] bo:mapLevel', e); }
    if (!walk) claimIfFresh(n);          // мапу не видно / ходьба не стартувала — нагорода одразу
    return true;
  }
  // після ходьби до щойно купленого рівня — нагорода автоматично
  function claimIfFresh(n) {
    const st = S();
    if (st.map.claimed === n - 1 && st.map.opened >= n) claim(n);
  }

  function claim(n) {
    const st = S(), kind = kindOf(n), p = rewardFor(n);
    if (n !== st.map.claimed + 1 || n > st.map.opened) return;
    st.points = (st.points || 0) + p;   // напряму: НЕ рахується в totalEarned
    st.map.claimed = n;
    BO.saveState();
    renderMap();
    BO.render();
    updateButton();
    let text;
    if (kind === 'castle') text = BO.t('map.claimCastle', { n, p, zone: zoneName(n + 1) });
    else if (kind === 'chest') text = BO.t('map.claimChest', { n, p });
    else text = BO.t('map.claim', { n, p });
    BO.showEventModal(kind === 'castle' ? '🏰' : kind === 'chest' ? '🎁' : '⭐', text);
    if (waiting() > 0) scrollToLevel(n + 1, true);
  }

  /* ---------- Повідомлення на головному екрані ---------- */
  let announceT = null;
  function shown(id) { const el = BO.$(id); return !!el && !el.classList.contains('hidden'); }
  // головний екран видно і його не закриває мама чи інше вікно
  function mainFree() { return shown('view-main') && !shown('mamaOverlay') && !shown('eventModal') && !shown('statModal') && !shown('langModal'); }
  // "Зірок вистачає на новий рівень!" — один раз на кожен наступний рівень
  function maybeAnnounce() {
    const st = S(); if (!st || !st.map) return;
    const next = st.map.opened + 1;
    if (st.map.announced >= next || !canAfford() || price(next) <= 0) return;
    if (!mainFree()) return; // покажемо, коли дитина повернеться на головний екран
    clearTimeout(announceT);
    // невелика пауза, щоб не перебити бульбашку від дії (погодував, помив …)
    announceT = setTimeout(() => {
      const s = S(), nx = s.map.opened + 1;
      if (mainFree() && canAfford() && s.map.announced < nx) {
        s.map.announced = nx;
        BO.saveState();
        BO.showBubble(BO.t('map.canBuyBubble'), 2600);
      }
    }, 1800);
  }

  /* ---------- Хуки ---------- */
  BO.on('init', () => {
    ensureState();
    buildDom();
    BO.saveState();
    updateButton();
  });
  BO.on('render', () => {
    if (!S() || !S().map) return;
    updateButton();
    if (isOpen() && sig() !== lastSig) renderMap();
    maybeAnnounce();
  });
  BO.on('points', n => {
    if (!S() || !S().map || !(n > 0)) return;
    updateButton();
    maybeAnnounce();
  });
  BO.on('tick', () => { if (S() && S().map) updateButton(); });
  BO.on('lang', () => {
    if (!S() || !S().map) return;
    updateButton();
    if (isOpen()) renderMap();
  });

  /* API для інших модулів (досягнення, підказки …):
     BO.map.opened()     — скільки рівнів відкрито зараз;
     BO.map.price(n)     — ціна відкриття рівня n (threshold(n) — те саме, для сумісності);
     BO.map.canAfford()  — чи вистачає зірок на наступний рівень;
     BO.map.rewardFor(n), BO.map.zoneOf(n) — нагорода / зона (з номером кола) рівня n;
     BO.map.levelFor(total) — СТАРЕ правило "рівень за totalEarned", лише для міграції.
     Подія при відкритті рівня: document 'bo:mapLevel', detail { level, price }. */
  BO.map = { threshold, price, levelFor, rewardFor, zoneOf, opened, canAfford, config: MAP };
})();
