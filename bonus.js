/* OTOTO — модуль «Бульбашки-бонуси». CoLaba Production.
   Поки дитина на головному екрані і улюбленець не спить, раз на 40–110 с над
   кімнатою пропливає одна м'яка бульбашка з ⭐/🍬/🍓/💎. Тап — бульбашка лопається,
   +2…5 ⭐ (рідкісна золота — +10…15). Не встиг — тихо зникає, без жодних наслідків.
   Не більше 12 зібраних за календарний день; далі — тиша до завтра.
   Ядро (app.js) не правиться: усе через window.BO. */
(function () {
  'use strict';
  if (!window.BO) return;
  const BO = window.BO;

  const CFG = {
    minDelay: 40000, maxDelay: 110000, // пауза між бульбашками (лише поки екран активний)
    life: 9000,                        // скільки бульбашка пливе, якщо її не тапнути
    fade: 1400,                        // з них — м'яке зникнення в кінці
    dailyCap: 12,                      // зібраних за день
    goldChance: 1 / 12,
    normal: [2, 5], gold: [10, 15],
    items: ['⭐', '🍬', '🍓', '💎'],
    petBubbleChance: 0.5,
    step: 1000,                        // крок планувальника
  };

  let remaining = 0;     // мс до наступної бульбашки (зменшується лише коли екран активний)
  let stepTimer = null;
  let current = null;    // { float, btn, anim, gold, n, lifeTimer, popped }
  let layer = null;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const rndInt = (a, b) => Math.floor(rnd(a, b + 1));
  const today = () => new Date().toDateString();
  const visible = id => { const el = document.getElementById(id); return !!el && !el.classList.contains('hidden'); };

  function bs() {
    const s = BO.state;
    if (!s) return null;
    if (!s.bonus || typeof s.bonus !== 'object') s.bonus = { day: null, count: 0, total: 0, gold: 0 };
    if (s.bonus.day !== today()) { s.bonus.day = today(); s.bonus.count = 0; }
    return s.bonus;
  }

  // Чи можна зараз показувати бульбашки: головний екран, не сон, вкладка видима, без модалок.
  function isActive() {
    const s = BO.state;
    if (!s || s.sleeping) return false;
    if (document.visibilityState === 'hidden') return false;
    if (!visible('view-main')) return false;
    if (['eventModal', 'statModal', 'langModal', 'mamaOverlay'].some(visible)) return false;
    return true;
  }
  function capReached() { const b = bs(); return !b || b.count >= CFG.dailyCap; }

  function ensureLayer() {
    if (layer && layer.isConnected) return layer;
    const stage = document.getElementById('stage');
    if (!stage) return null;
    layer = document.createElement('div');
    layer.id = 'bonusLayer';
    layer.setAttribute('aria-live', 'polite');
    // вставляємо між #pet і #bubble: бульбашка над улюбленцем, а його репліка — над бульбашкою
    const speech = document.getElementById('bubble');
    stage.insertBefore(layer, speech && speech.parentNode === stage ? speech : null);
    return layer;
  }

  /* ---------- планувальник ---------- */
  function resetDelay() { remaining = rnd(CFG.minDelay, CFG.maxDelay); }
  function schedule() { clearTimeout(stepTimer); stepTimer = setTimeout(step, CFG.step); }
  function step() {
    if (current) {
      if (!current.popped && !isActive()) removeCurrent(); // дитина пішла з екрана / улюбленець заснув
    } else if (isActive() && !capReached()) {
      remaining -= CFG.step;
      if (remaining <= 0) { spawn(); resetDelay(); }
    }
    schedule();
  }

  /* ---------- бульбашка ---------- */
  function spawn(force) {
    if (current) removeCurrent();
    if (!force && (!isActive() || capReached())) return false;
    const L = ensureLayer();
    if (!L) return false;
    // шар трохи більший за сцену (щоб бризки й «+N» не обрізались), але сама
    // бульбашка пливе лише в межах сцени — над кімнатою, не над кнопками
    const stage = L.parentNode;
    const top0 = stage.getBoundingClientRect().top - L.getBoundingClientRect().top;
    const W = L.clientWidth, H = stage.clientHeight;
    if (W < 80 || H < 76) return false;

    const gold = force === 'gold' ? true : force === 'normal' ? false : Math.random() < CFG.goldChance;
    const n = gold ? rndInt(CFG.gold[0], CFG.gold[1]) : rndInt(CFG.normal[0], CFG.normal[1]);
    const item = gold ? '⭐' : CFG.items[rndInt(0, CFG.items.length - 1)];

    const float = document.createElement('div');
    float.className = 'bonusFloat';
    const bob = document.createElement('div');
    bob.className = 'bonusBob';
    bob.style.animationDuration = rnd(2.2, 3).toFixed(2) + 's';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bonusBubble' + (gold ? ' gold' : '');
    btn.setAttribute('aria-label', BO.t('bonus.aria'));
    btn.innerHTML = '<span class="bonusShine"></span><span class="bonusItem">' + item + '</span>' +
      (gold ? '<span class="bonusTwinkle t1">✨</span><span class="bonusTwinkle t2">✨</span>' : '');
    bob.appendChild(btn);
    float.appendChild(bob);
    L.appendChild(float);

    // траєкторія: з одного боку до іншого, верхня/середня частина сцени
    const size = 68, pad = 6;
    const maxX = W - size - pad;
    const minY = top0 + 10, maxY = Math.max(minY, top0 + H - size - 4);
    const ltr = Math.random() < 0.5;
    const x0 = ltr ? pad : maxX, x1 = ltr ? maxX : pad;
    const y0 = rnd(minY, maxY), y1 = rnd(minY, maxY);
    const xm = (x0 + x1) / 2, ym = Math.min(maxY, Math.max(minY, (y0 + y1) / 2 + rnd(-30, 30)));
    const tr = (x, y) => 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    const fadeAt = 1 - CFG.fade / CFG.life;
    const anim = float.animate([
      { transform: tr(x0, y0), opacity: 0, offset: 0 },
      { opacity: 1, offset: 0.08 },
      { transform: tr(xm, ym), offset: 0.5 },
      { opacity: 1, offset: fadeAt },
      { transform: tr(x1, y1), opacity: 0, offset: 1 },
    ], { duration: CFG.life, easing: 'linear', fill: 'forwards' });

    const c = current = { float, btn, anim, gold, n, popped: false };
    c.lifeTimer = setTimeout(() => { if (current === c && !c.popped) removeCurrent(); }, CFG.life + 50);
    btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); pop(c); });
    btn.addEventListener('click', e => { e.stopPropagation(); pop(c); }); // клавіатура / запасний шлях
    return true;
  }

  function removeCurrent() {
    if (!current) return;
    clearTimeout(current.lifeTimer);
    current.float.remove();
    current = null;
  }

  function pop(c) {
    if (c.popped || current !== c) return;
    c.popped = true;
    clearTimeout(c.lifeTimer);
    c.anim.pause();
    c.float.style.opacity = '1';
    c.float.classList.add('popping');

    const b = bs();
    b.count += 1;
    b.total = (b.total || 0) + 1;
    if (c.gold) b.gold = (b.gold || 0) + 1;
    BO.addPoints(c.n);
    BO.saveState();
    BO.render();

    // «+N ⭐» і бризки — у тому ж місці, де лопнула бульбашка
    const plus = document.createElement('div');
    plus.className = 'bonusPlus' + (c.gold ? ' gold' : '');
    plus.textContent = BO.t('bonus.plus', { n: c.n });
    c.float.appendChild(plus);
    const drops = c.gold ? 10 : 7;
    for (let i = 0; i < drops; i++) {
      const d = document.createElement('span');
      d.className = c.gold ? 'bonusSpark' : 'bonusDrop';
      if (c.gold) d.textContent = i % 2 ? '✨' : '⭐';
      const a = (i / drops) * Math.PI * 2 + rnd(-0.2, 0.2), r = c.gold ? rnd(46, 62) : rnd(34, 46);
      d.style.setProperty('--dx', (Math.cos(a) * r).toFixed(1) + 'px');
      d.style.setProperty('--dy', (Math.sin(a) * r).toFixed(1) + 'px');
      c.float.appendChild(d);
    }
    const pts = document.getElementById('points');
    if (pts) { pts.classList.remove('bonusPulse'); void pts.offsetWidth; pts.classList.add('bonusPulse'); }

    // улюбленець «відгукується» трохи згодом — коли «+N» уже злетіло й не ховається під реплікою
    if (BO.showBubble && (c.gold || Math.random() < CFG.petBubbleChance)) {
      const msg = c.gold ? BO.t('bonus.gold') : BO.t('bonus.pet.' + rndInt(1, 3));
      setTimeout(() => { if (isActive()) BO.showBubble(msg, 1800); }, c.gold ? 900 : 700);
    }
    setTimeout(() => { if (current === c) current = null; c.float.remove(); }, c.gold ? 1300 : 1050);
  }

  /* ---------- хуки ---------- */
  BO.on('init', () => {
    const s = BO.state;
    if (!s.bonus || typeof s.bonus !== 'object') s.bonus = { day: null, count: 0, total: 0, gold: 0 };
    bs();
    BO.saveState();
    ensureLayer();
    resetDelay();
    schedule();
  });
  BO.on('render', () => {
    ensureLayer();
    if (current && !current.popped && !isActive()) removeCurrent(); // заснув / відкрилась модалка
  });
  BO.on('lang', () => { if (current) current.btn.setAttribute('aria-label', BO.t('bonus.aria')); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && current && !current.popped) removeCurrent();
  });

  // Для тестів: примусово показати бульбашку ('gold' | 'normal' | без аргументу — випадкова).
  window.BO_BONUS = {
    spawnNow(kind) { return spawn(kind === 'gold' || kind === 'normal' ? kind : true); },
    get current() { return current; },
    clear() { removeCurrent(); },
    skipWait() { remaining = 0; },     // наступний крок планувальника одразу покаже бульбашку (якщо можна)
    get remaining() { return remaining; },
    CFG,
  };
})();
