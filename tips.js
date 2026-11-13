/* OTOTO — модуль «Підказки»: улюбленець сам показує, як грати. CoLaba Production.

   1) ЕКСКУРСІЯ (один раз). Щойно після народження закривається сцена з мамою,
      улюбленець веде дитину 7 короткими кроками: шкали → «Годувати» (дитина
      тапає сама, крок іде далі лише після тапу) → ігри → бали ⭐ (друзі 🦎,
      кімната 🏠) → мапа 🗺️ → вогник 🔥 → «Веселої гри!». Решта екрана
      притемнена, навколо потрібної кнопки — м'яке сяйво, улюбленець «говорить»
      у хмарці поруч. Велике «Далі», маленьке «Пропустити». Немає кнопки на
      екрані — крок просто пропускається. Повторити — кнопка «Як грати?» під
      рядом «Кімната / Мапа / Звук».
   2) ПІДКАЗКИ-НАГАДУВАННЯ (кожна — один раз за всю гру): шкала вперше низька,
      улюбленець уперше захворів, перша бульбашка-бонус, уперше вистачає балів
      на нового друга, уперше на мапі чекає нагорода. Вони НЕ блокують гру:
      лише сяйво навколо кнопки + хмарка, зникають самі за кілька секунд або
      від будь-якого тапу.

   Стан: state.tips = { tour: null|'started'|'done'|'skipped'|'old', seen: { <id>: 1 } }.
   Тексти: ключі 'tips.*' у мовних файлах. Ядро (app.js) не правиться. */
(function () {
  'use strict';
  if (!window.BO) return;
  const BO = window.BO;
  const T = (k, v) => BO.t('tips.' + k, v);
  const $ = id => document.getElementById(id);
  const shown = id => { const el = $(id); return !!el && !el.classList.contains('hidden'); };
  const BLOCKERS = ['mamaOverlay', 'eventModal', 'statModal', 'langModal'];
  const mainFree = () => shown('view-main') && !BLOCKERS.some(shown);

  const CFG = {
    lowBelow: 30,          // шкала нижче — підказка «нагодуй / помий / …»
    hintLife: 6500,        // скільки висить підказка-нагадування
    hintGap: 15000,        // мінімальна пауза між двома нагадуваннями
    oldSaveDays: 2,        // старші збереження екскурсію автоматично не бачать
  };

  // Кроки екскурсії. target — що підсвітити; also — додаткові (тонше) кільця;
  // tap — крок іде далі, коли дитина натисне саму кнопку (кнопки «Далі» нема).
  const STEPS = [
    { id: 'stats',  target: () => $('stats') },
    { id: 'feed',   target: () => $('btnFeed'), tap: true, vars: () => ({ btn: BO.t('action.feed') }) },
    { id: 'play',   target: () => $('btnPlay') },
    { id: 'points', target: () => $('points'), also: () => [$('btnCharacters'), $('btnDecor')] },
    { id: 'map',    target: () => $('btnMap') },
    { id: 'streak', target: () => $('streak') },
    { id: 'fun',    target: () => $('pet') },
  ];

  // Нагадування: умова + на що вказати. Порядок = пріоритет.
  const LOW = [['hunger', 'btnFeed', 'action.feed'], ['hygiene', 'btnWash', 'action.wash'],
               ['energy', 'btnSleep', 'action.sleep'], ['mood', 'btnPlay', 'action.play']];
  function nextFriend() {
    const s = BO.state, list = BO.CONFIG.characters || [];
    for (let i = 1; i < list.length; i++) {
      if (s.ownedChars.includes(list[i].id)) continue;
      return s.ownedChars.includes(list[i - 1].id) ? list[i] : null;
    }
    return null;
  }
  function mapWaiting() {
    const s = BO.state;
    return !!(BO.map && BO.map.opened && s.map && typeof s.map.claimed === 'number' && BO.map.opened() > s.map.claimed); // незабрана нагорода (про «вистачає на рівень» каже сама мапа)
  }
  const HINTS = [
    { id: 'sick', when: s => s.sick && !s.sleeping, target: () => $('btnHeal'), vars: () => ({ btn: BO.t('action.heal') }) },
    ...LOW.map(([k, btn, label]) => ({
      id: 'low_' + k, text: k,
      when: s => !s.sick && !s.sleeping && typeof s[k] === 'number' && s[k] < CFG.lowBelow,
      target: () => $(btn), vars: () => ({ btn: BO.t(label) }),
    })),
    { id: 'map', when: () => mapWaiting(), target: () => $('btnMap'), vars: () => ({ btn: BO.t('map.nav') }) },
    { id: 'friend', when: s => { const c = nextFriend(); return !!c && s.points >= c.price; }, target: () => $('btnCharacters') },
  ];

  /* ---------- стан ---------- */
  function ts() {
    const s = BO.state;
    if (!s) return null;
    if (!s.tips || typeof s.tips !== 'object') {
      const age = (Date.now() - (s.bornAt || Date.now())) / 86400000;
      s.tips = { tour: age > CFG.oldSaveDays ? 'old' : null, seen: {} };
    }
    if (!s.tips.seen || typeof s.tips.seen !== 'object') s.tips.seen = {};
    return s.tips;
  }
  const save = () => { try { BO.saveState(); } catch (e) {} };

  /* ---------- DOM ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  let layer, svg, holesG, blocks, rings = [], bubble, avatar, textEl, foot, nextBtn, skipBtn, dotsEl, tail, replayBtn;

  function build() {
    if (layer) return;
    const screen = $('screen');
    if (!screen) return;
    layer = document.createElement('div');
    layer.id = 'tipsLayer';
    layer.className = 'hidden';
    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'tipsDim');
    svg.innerHTML = '<defs><mask id="tipsMask" maskUnits="userSpaceOnUse"><rect class="tipsMaskBg" x="0" y="0" width="100%" height="100%" fill="#fff"/><g class="tipsHoles"></g></mask></defs>' +
      '<rect x="0" y="0" width="100%" height="100%" mask="url(#tipsMask)" class="tipsShade"/>';
    holesG = svg.querySelector('.tipsHoles');
    layer.appendChild(svg);
    blocks = ['t', 'r', 'b', 'l', 'c'].map(k => {
      const d = document.createElement('div');
      d.className = 'tipsBlock tipsBlock-' + k;
      d.addEventListener('click', onBlockedTap);
      layer.appendChild(d);
      return d;
    });
    bubble = document.createElement('div');
    bubble.className = 'tipsBubble';
    bubble.setAttribute('role', 'dialog');
    bubble.setAttribute('aria-live', 'polite');
    bubble.innerHTML = '<div class="tipsBody"><img class="tipsAvatar" alt=""><div class="tipsText"></div></div>' +
      '<div class="tipsFoot"><button type="button" class="tipsSkip"></button><span class="tipsDots"></span>' +
      '<button type="button" class="tipsNext"></button></div><span class="tipsTail"></span>';
    avatar = bubble.querySelector('.tipsAvatar');
    textEl = bubble.querySelector('.tipsText');
    foot = bubble.querySelector('.tipsFoot');
    nextBtn = bubble.querySelector('.tipsNext');
    skipBtn = bubble.querySelector('.tipsSkip');
    dotsEl = bubble.querySelector('.tipsDots');
    tail = bubble.querySelector('.tipsTail');
    nextBtn.addEventListener('click', e => { e.stopPropagation(); next(); });
    skipBtn.addEventListener('click', e => { e.stopPropagation(); endTour('skipped'); });
    layer.appendChild(bubble);
    screen.appendChild(layer);
  }

  function ring(i) {
    while (rings.length <= i) {
      const r = document.createElement('div');
      r.className = 'tipsRing';
      layer.insertBefore(r, bubble);
      rings.push(r);
    }
    return rings[i];
  }

  function buildReplay() {
    if (replayBtn && replayBtn.isConnected) return;
    const main = $('view-main');
    if (!main) return;
    replayBtn = document.createElement('button');
    replayBtn.type = 'button';
    replayBtn.id = 'btnTips';
    replayBtn.innerHTML = '<b>?</b><span></span>';
    replayBtn.addEventListener('click', () => startTour(true));
    main.appendChild(replayBtn);
    renderReplay();
  }
  function renderReplay() {
    if (!replayBtn) return;
    replayBtn.querySelector('span').textContent = T('replay');
    replayBtn.setAttribute('aria-label', T('replay'));
  }

  /* ---------- геометрія ---------- */
  const isVis = el => !!el && el.isConnected && el.getClientRects().length > 0 &&
    getComputedStyle(el).visibility !== 'hidden' && !el.closest('.hidden');
  function rel(el, pad) {
    const sr = $('screen').getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - sr.left - pad, y: r.top - sr.top - pad, w: r.width + 2 * pad, h: r.height + 2 * pad };
  }
  function place(el, r) {
    el.style.transform = 'translate(' + r.x.toFixed(1) + 'px,' + r.y.toFixed(1) + 'px)';
    el.style.width = Math.max(0, r.w).toFixed(1) + 'px';
    el.style.height = Math.max(0, r.h).toFixed(1) + 'px';
  }
  function radiusFor(el, r) {
    const br = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    return Math.min(r.h / 2, Math.max(br + 6, 12));
  }

  /* ---------- спільний показ (екскурсія і нагадування) ---------- */
  let mode = null;           // null | 'tour' | 'hint'
  let raf = 0, lastSig = '';
  let cur = null;            // { targets: [el…], main: el, interactive, dim }

  function show(m, opts) {
    build();
    if (!layer) return false;
    mode = m;
    cur = opts;
    layer.className = 'tips-' + m;
    layer.classList.toggle('tips-dim', !!opts.dim);
    layer.classList.toggle('tips-interactive', !!opts.interactive);
    avatar.src = (BO.activeCharacter() || {}).img || 'img/gecko.png';
    textEl.textContent = opts.text;
    bubble.setAttribute('aria-label', T('aria'));
    foot.classList.toggle('hidden', m !== 'tour');
    bubble.classList.remove('tipsPop'); void bubble.offsetWidth; bubble.classList.add('tipsPop');
    rings.forEach(r => r.classList.add('hidden'));
    lastSig = '';
    cancelAnimationFrame(raf);
    loop();
    return true;
  }

  function hideLayer() {
    cancelAnimationFrame(raf); raf = 0;
    mode = null; cur = null;
    if (layer) layer.className = 'hidden';
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    try { position(); } catch (e) { console.error('[tips]', e); hideLayer(); }
  }

  function position() {
    if (!cur) return;
    // поки відкрито інше вікно (подія, мама, мова) — тихо ховаємось і чекаємо
    const paused = !mainFree();
    layer.classList.toggle('tips-paused', paused);
    if (paused) { lastSig = ''; return; }
    if (mode === 'hint' && cur.alive && !cur.alive()) { hideHint(); return; }
    const targets = cur.targets().filter(isVis);
    const main = targets[0] || null;
    if (mode === 'tour' && cur.needTarget && !main) { next(); return; }   // кнопка зникла — далі
    if (mode === 'hint' && !main) { hideHint(); return; }
    const scr = $('screen'), W = scr.clientWidth, H = scr.clientHeight;
    const rects = targets.map((el, i) => rel(el, i === 0 ? 6 : 4));
    const sig = W + '|' + H + '|' + rects.map(r => [r.x, r.y, r.w, r.h].map(Math.round).join(',')).join(';') + '|' + textEl.textContent.length;
    if (sig === lastSig) return;
    lastSig = sig;

    // кільця сяйва
    rings.forEach(r => r.classList.add('hidden'));
    targets.forEach((el, i) => {
      const r = ring(i), q = rects[i];
      r.classList.remove('hidden');
      r.classList.toggle('tipsRing-minor', i > 0);
      place(r, q);
      r.style.borderRadius = radiusFor(el, q) + 'px';
    });

    // притемнення з «віконцями»
    if (cur.dim) {
      holesG.innerHTML = '';
      targets.forEach((el, i) => {
        const q = rects[i], hole = document.createElementNS(NS, 'rect');
        hole.setAttribute('x', q.x); hole.setAttribute('y', q.y);
        hole.setAttribute('width', q.w); hole.setAttribute('height', q.h);
        const rr = radiusFor(el, q); hole.setAttribute('rx', rr); hole.setAttribute('ry', rr);
        hole.setAttribute('fill', '#000');
        holesG.appendChild(hole);
      });
      // блоки навколо головної цілі ловлять тапи; на «тап-кроці» сама ціль відкрита
      const q = rects[0] || { x: W / 2, y: H / 2, w: 0, h: 0 };
      const x1 = Math.max(0, q.x), y1 = Math.max(0, q.y), x2 = Math.min(W, q.x + q.w), y2 = Math.min(H, q.y + q.h);
      place(blocks[0], { x: 0, y: 0, w: W, h: y1 });
      place(blocks[1], { x: x2, y: y1, w: W - x2, h: y2 - y1 });
      place(blocks[2], { x: 0, y: y2, w: W, h: H - y2 });
      place(blocks[3], { x: 0, y: y1, w: x1, h: y2 - y1 });
      place(blocks[4], { x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
    }

    const anchor = cur.anchor ? cur.anchor() : null;
    placeBubble(anchor && isVis(anchor) ? rel(anchor, 4) : main ? rects[0] : null, W, H);
  }

  function placeBubble(q, W, H) {
    const margin = 12, gap = 14;
    const bw = Math.min(340, W - 2 * margin);
    bubble.style.width = bw + 'px';
    const bh = bubble.offsetHeight;
    let x, y, side;
    if (!q) { x = (W - bw) / 2; y = (H - bh) / 2; side = 'none'; }
    else {
      const below = H - (q.y + q.h) - gap - margin, above = q.y - gap - margin;
      if (below >= bh || below >= above) { side = 'top'; y = Math.min(q.y + q.h + gap, H - bh - margin); }
      else { side = 'bottom'; y = Math.max(margin, q.y - gap - bh); }
      x = Math.max(margin, Math.min(W - margin - bw, q.x + q.w / 2 - bw / 2));
    }
    bubble.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    bubble.dataset.tail = side;
    if (q) {
      if (cur && cur.anchor) { tail.style.left = '50%'; return; }
      const tx = Math.max(22, Math.min(bw - 22, q.x + q.w / 2 - x));
      tail.style.left = tx.toFixed(1) + 'px';
    }
  }

  function onBlockedTap() {
    if (mode !== 'tour') return;
    // тап повз — м'яко нагадуємо, куди тиснути
    const el = cur && cur.interactive ? rings[0] : nextBtn;
    if (!el) return;
    el.classList.remove('tipsNudge'); void el.offsetWidth; el.classList.add('tipsNudge');
  }

  /* ---------- екскурсія ---------- */
  let stepIdx = -1, tourSteps = [], startTimer = 0, startTries = 0;

  function startTour(manual) {
    const st = ts();
    if (!st || !mainFree()) return false;
    hideHint(true);
    if (window.BO_BONUS && BO_BONUS.current) BO_BONUS.clear();
    tourSteps = STEPS.slice();
    stepIdx = -1;
    st.tour = 'started';
    save();
    const main = $('view-main');
    if (main) main.scrollTop = 0;
    next();
    return true;
  }

  function next() {
    stepIdx++;
    while (stepIdx < tourSteps.length && !isVis(tourSteps[stepIdx].target())) stepIdx++;
    if (stepIdx >= tourSteps.length) { endTour('done'); return; }
    renderStep();
  }

  function renderStep() {
    const s = tourSteps[stepIdx];
    const el = s.target();
    if (el && el.scrollIntoView) {
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ block: 'center' });
    }
    const last = stepIdx === lastVisibleIdx();
    show('tour', {
      text: T('tour.' + s.id, Object.assign({ name: BO.state.name }, s.vars ? s.vars() : {})),
      targets: () => [s.target()].concat(s.also ? s.also() : []),
      needTarget: true, dim: true, interactive: !!s.tap,
    });
    layer.dataset.step = s.id;
    nextBtn.classList.toggle('hidden', !!s.tap);
    nextBtn.textContent = last ? T('done') : T('next');
    skipBtn.textContent = T('skip');
    skipBtn.classList.toggle('hidden', last);
    // крапки — лише для кроків, які справді є на екрані
    const vis = tourSteps.filter(x => isVis(x.target()));
    const pos = vis.indexOf(s);
    dotsEl.innerHTML = vis.map((x, i) => '<i class="' + (i === pos ? 'on' : i < pos ? 'past' : '') + '"></i>').join('');
  }
  function lastVisibleIdx() {
    for (let i = tourSteps.length - 1; i >= 0; i--) if (isVis(tourSteps[i].target())) return i;
    return -1;
  }

  function endTour(how) {
    const st = ts();
    if (st) { st.tour = how; save(); }
    stepIdx = -1;
    hideLayer();
    lastHintAt = Date.now();      // перше нагадування — не одразу після екскурсії
  }

  const tourActive = () => mode === 'tour';

  // Пробуємо почати екскурсію (після сцени з мамою) — кілька разів, поки екран не звільниться.
  let pending = false;
  function scheduleTour(delay) {
    clearTimeout(startTimer);
    startTries = 0;
    pending = true;
    const attempt = () => {
      const st = ts();
      if (!st || st.tour === 'done' || st.tour === 'skipped' || st.tour === 'old' || tourActive()) { pending = false; return; }
      if (mainFree() && BO.state.hatched) { pending = false; startTour(false); return; }
      if (++startTries < 30) startTimer = setTimeout(attempt, 1000);
      else pending = false;
    };
    startTimer = setTimeout(attempt, delay);
  }
  const tourPending = () => pending;

  // Перехід «сцена з мамою закрилась» стежимо з самого початку (ще до першого render,
  // бо при народженні модулі стартують лише після того, як мама зникне).
  (function watchMama() {
    const m = $('mamaOverlay');
    if (!m || !window.MutationObserver) return;
    new MutationObserver(recs => {
      for (const r of recs) {
        const was = (r.oldValue || '').split(/\s+/).includes('hidden');
        const now = m.classList.contains('hidden');
        if (!was && now) { scheduleTour(400); break; }
      }
    }).observe(m, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  })();

  // Під час «тап-кроку» чекаємо тапу саме по кнопці.
  document.addEventListener('click', e => {
    if (!tourActive() || stepIdx < 0) return;
    const s = tourSteps[stepIdx];
    if (!s || !s.tap) return;
    const el = s.target();
    if (el && el.contains(e.target)) {
      const idx = stepIdx;
      layer.classList.add('tips-wait');
      setTimeout(() => { if (tourActive() && stepIdx === idx) { layer.classList.remove('tips-wait'); next(); } }, 1100);
    }
  }, true);

  /* ---------- нагадування ---------- */
  let hintTimer = 0, lastHintAt = 0, curHint = null;

  function showHint(h, extra) {
    const st = ts();
    st.seen[h.id] = 1;
    save();
    curHint = h;
    lastHintAt = Date.now();
    show('hint', Object.assign({
      text: T('hint.' + (h.text || h.id), Object.assign({ name: BO.state.name }, h.vars ? h.vars() : {})),
      targets: () => [h.target()], dim: false, interactive: true,
    }, extra || {}));
    layer.dataset.step = h.id;
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => hideHint(), extra && extra.life || CFG.hintLife);
  }
  function hideHint(silent) {
    clearTimeout(hintTimer);
    if (mode === 'hint') hideLayer();
    curHint = null;
  }

  function canHint() {
    const st = ts();
    return !!st && BO.state.hatched && !tourActive() && !tourPending() && mainFree();
  }

  function checkHints() {
    if (!canHint() || mode === 'hint') return;
    if (Date.now() - lastHintAt < CFG.hintGap) return;
    const s = BO.state, seen = ts().seen;
    for (const h of HINTS) {
      if (seen[h.id]) continue;
      let ok = false;
      try { ok = h.when(s); } catch (e) { ok = false; }
      if (ok && isVis(h.target())) { showHint(h); return; }
    }
  }

  // Будь-який тап по екрану гасить нагадування (тап по самій кнопці теж спрацює як звичайно).
  document.addEventListener('pointerdown', e => {
    if (mode === 'hint' && !(bubble && bubble.contains(e.target))) setTimeout(() => { if (mode === 'hint') hideHint(); }, 150);
  }, true);

  // Перша бульбашка-бонус: показуємо одразу (вона живе лише кілька секунд) і стежимо за нею.
  (function watchBonus() {
    const stage = $('stage');
    if (!stage || !window.MutationObserver) return;
    new MutationObserver(recs => {
      for (const r of recs) for (const n of r.addedNodes) {
        if (!(n.nodeType === 1 && n.classList.contains('bonusFloat'))) continue;
        if (tourActive()) { if (window.BO_BONUS) BO_BONUS.clear(); return; }  // не відволікаємо посеред екскурсії
        const st = ts();
        if (!st || st.seen.bonus || !canHint()) return;
        const btn = n.querySelector('.bonusBubble');
        if (!btn) return;
        if (mode === 'hint') hideHint(true);
        showHint({ id: 'bonus', target: () => btn }, {
          anchor: () => $('stage'),
          alive: () => btn.isConnected && !n.classList.contains('popping'), life: 8000,
        });
        return;
      }
    }).observe(stage, { childList: true, subtree: true });
  })();

  /* ---------- хуки ---------- */
  BO.on('init', () => {
    const st = ts();
    save();
    build();
    buildReplay();
    // екскурсію перервали (закрили гру посередині) — продовжимо, щойно екран вільний
    if (st && st.tour === 'started') scheduleTour(1200);
    clearInterval(BO._tipsIv);
    BO._tipsIv = setInterval(checkHints, 2000);
  });
  BO.on('render', () => { buildReplay(); checkHints(); });
  BO.on('points', () => setTimeout(checkHints, 0));
  BO.on('lang', () => {
    renderReplay();
    if (tourActive() && stepIdx >= 0) renderStep();
    else if (mode === 'hint' && curHint) textEl.textContent = T('hint.' + (curHint.text || curHint.id), Object.assign({ name: BO.state.name }, curHint.vars ? curHint.vars() : {}));
  });

  // Для тестів / налагодження.
  window.BO_TIPS = {
    start: () => startTour(true),
    next, skip: () => endTour('skipped'),
    get step() { return stepIdx >= 0 && tourSteps[stepIdx] ? tourSteps[stepIdx].id : null; },
    get mode() { return mode; },
    get hint() { return curHint ? curHint.id : null; },
    check() { lastHintAt = 0; checkHints(); },
    hide: () => hideHint(),
    CFG, STEPS, HINTS,
  };
})();
