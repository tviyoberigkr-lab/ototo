/* OTOTO — модуль «Для батьків»: батьківський замок і батьківський екран. CoLaba Production.

   НАВІЩО. Дитячі розділи магазинів (Apple Kids, правило 1.3; Google Play
   Families) вимагають: покупки й посилання назовні — лише за «замком», який
   дорослий проходить легко, а мала дитина — ні. Цей модуль і є тим замком;
   майбутні покупки підключаються ТІЛЬКИ через нього.

   API:
     BO.parentGate(onPass, { reason })  — показує вікно-перевірку; onPass()
                                          викликається лише після правильної
                                          відповіді. reason — необов'язковий
                                          (вже перекладений) рядок «навіщо».
     BO.parentGate.isOpen()             — чи відкрите вікно зараз.
     BO.PRIVACY_URL                     — адреса політики приватності: 'privacy/'
                                          (сторінка сайту поруч із грою) або повна
                                          https://…; порожня — «скоро», без посилання.

   ПЕРЕВІРКА: двозначне × однозначне (напр. 23 × 4), числа щоразу нові,
   відповідь — на екранній цифровій клавіатурі (без варіантів, тож не вгадати).
   3 помилки → пауза 60 с; пауза зберігається в state.pgate (перезапуск гри її
   не знімає). Успішна перевірка НЕ запам'ятовується: кожна захищена дія
   питає знову. Вік гравця (state.age) замок не відкриває — дитина могла
   обрати будь-який вік.

   ЕКРАН «Для батьків» (кнопка 🔒 під кнопками модулів, поруч із «Як грати?»):
   коротко про дані/рекламу, політика приватності, «Почати гру спочатку»
   (той самий діалог, що й кнопка ⟲) і «Магазин» (shop.js; якщо shop.js не
   підключено — неактивна заглушка «Магазин (скоро)»).

   Стан: state.pgate = { fails: 0..2, until: мітка часу кінця паузи або 0 }.
   Тексти: ключі 'parent.*' (i18n_parent.json → tools/i18n_parent.py).
   Ядро (app.js) не правиться. */
(function () {
  'use strict';
  if (!window.BO) return;
  const BO = window.BO;
  if (typeof BO.PRIVACY_URL !== 'string') BO.PRIVACY_URL = 'privacy/?inapp=1';   // privacy/index.html поруч із грою; inapp=1 ховає переходи на сайт

  const CFG = {
    maxFails: 3,          // скільки помилок поспіль до паузи
    cooldownMs: 60000,    // пауза після maxFails помилок
    maxDigits: 3,         // найбільша відповідь 99 × 9 = 891
  };
  const T = (k, v) => BO.t('parent.' + k, v);
  const $ = id => document.getElementById(id);
  const save = () => { try { BO.saveState(); } catch (e) {} };

  /* ---------- стан паузи (переживає перезапуск) ---------- */
  let memGate = { fails: 0, until: 0 };   // якщо збереження ще нема (до активації)
  function gs() {
    const s = BO.state;
    if (!s) return memGate;
    if (!s.pgate || typeof s.pgate !== 'object') s.pgate = { fails: 0, until: 0 };
    const g = s.pgate;
    if (!(g.fails >= 0 && g.fails < CFG.maxFails)) g.fails = 0;
    if (typeof g.until !== 'number' || !isFinite(g.until)) g.until = 0;
    // годинник перевели назад — пауза не може тривати довше за саму паузу
    if (g.until - Date.now() > CFG.cooldownMs) g.until = Date.now() + CFG.cooldownMs;
    return g;
  }
  const leftMs = () => Math.max(0, gs().until - Date.now());

  /* ---------- приклад ---------- */
  function newProblem() {
    let a;
    do { a = 12 + Math.floor(Math.random() * 88); } while (a % 10 === 0 || a % 11 === 0);   // без «круглих» 20, 30… і 22, 33…
    const b = 3 + Math.floor(Math.random() * 7);                                            // 3…9
    return { a, b, ans: a * b };
  }

  /* ---------- вікно-перевірка ---------- */
  let modal, card, reasonEl, problemEl, answerEl, msgEl, padEl, cancelBtn, closeBtn, titleEl, hintEl;
  let open = false, problem = null, typed = '', onPassCb = null, timer = 0, lastFocus = null;

  function build() {
    if (modal) return;
    modal = document.createElement('div');
    modal.id = 'pgModal';
    modal.className = 'hidden';
    modal.innerHTML =
      '<div id="pgCard" role="dialog" aria-modal="true" aria-labelledby="pgTitle" tabindex="-1">' +
        '<button type="button" id="pgClose" class="pgClose">✕</button>' +
        '<div class="pgLock" aria-hidden="true">🔒</div>' +
        '<div id="pgTitle" class="pgTitle"></div>' +
        '<p id="pgHint" class="pgHint"></p>' +
        '<p id="pgReason" class="pgReason hidden"></p>' +
        '<div class="pgTask"><span id="pgProblem" class="pgProblem"></span>' +
          '<span id="pgAnswer" class="pgAnswer" role="status" aria-live="polite"></span></div>' +
        '<p id="pgMsg" class="pgMsg" aria-live="assertive"></p>' +
        '<div id="pgPad" class="pgPad"></div>' +
        '<button type="button" id="pgCancel" class="secondaryBtn pgCancel"></button>' +
      '</div>';
    card = modal.querySelector('#pgCard');
    closeBtn = modal.querySelector('#pgClose');
    titleEl = modal.querySelector('#pgTitle');
    hintEl = modal.querySelector('#pgHint');
    reasonEl = modal.querySelector('#pgReason');
    problemEl = modal.querySelector('#pgProblem');
    answerEl = modal.querySelector('#pgAnswer');
    msgEl = modal.querySelector('#pgMsg');
    padEl = modal.querySelector('#pgPad');
    cancelBtn = modal.querySelector('#pgCancel');
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'].forEach(k => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pgKey' + (k === 'ok' ? ' pgOk' : k === 'del' ? ' pgDel' : '');
      b.dataset.k = k;
      b.textContent = k === 'del' ? '⌫' : k === 'ok' ? '✓' : k;
      b.addEventListener('click', () => press(k));
      padEl.appendChild(b);
    });
    closeBtn.addEventListener('click', cancel);
    cancelBtn.addEventListener('click', cancel);
    modal.addEventListener('click', e => { if (e.target === modal) cancel(); });   // тап повз картку = скасувати
    document.addEventListener('keydown', onKey, true);
    ($('screen') || document.body).appendChild(modal);
  }

  function texts() {
    if (!modal) return;
    titleEl.textContent = T('title');
    hintEl.textContent = T('gateHint');
    cancelBtn.textContent = T('cancel');
    closeBtn.setAttribute('aria-label', T('cancel'));
    padEl.querySelector('.pgDel').setAttribute('aria-label', T('erase'));
    padEl.querySelector('.pgOk').setAttribute('aria-label', T('check'));
    answerEl.setAttribute('aria-label', T('answer'));
    paint();
  }

  function paint() {
    if (!modal || !problem) return;
    const wait = leftMs();
    modal.classList.toggle('pgWait', wait > 0);
    problemEl.textContent = problem.a + ' × ' + problem.b + ' =';
    answerEl.textContent = typed || '?';
    answerEl.classList.toggle('pgEmpty', !typed);
    padEl.querySelectorAll('.pgKey').forEach(b => {
      const k = b.dataset.k;
      b.disabled = wait > 0 || (k === 'ok' && !typed) || (k === 'del' && !typed) ||
        (/\d/.test(k) && typed.length >= CFG.maxDigits);
    });
    if (wait > 0) {
      msgEl.textContent = T('cooldown', { n: Math.ceil(wait / 1000) });
      msgEl.className = 'pgMsg pgMsgWait';
    }
  }

  function press(k) {
    if (!open || leftMs() > 0) return;
    if (k === 'del') typed = typed.slice(0, -1);
    else if (k === 'ok') return check();
    else if (/^\d$/.test(k) && typed.length < CFG.maxDigits) typed = (typed === '0' ? '' : typed) + k;
    if (msgEl.classList.contains('pgMsgErr')) { msgEl.textContent = ''; msgEl.className = 'pgMsg'; }
    paint();
  }

  function check() {
    if (!typed) return;
    const g = gs();
    if (+typed === problem.ans) {
      g.fails = 0; g.until = 0; save();
      const cb = onPassCb;
      close();
      if (typeof cb === 'function') {
        try { cb(); } catch (e) { console.error('[parentGate] onPass', e); }
      }
      return;
    }
    g.fails += 1;
    typed = '';
    problem = newProblem();          // щоразу новий приклад — перебором не підібрати
    if (g.fails >= CFG.maxFails) {
      g.fails = 0;
      g.until = Date.now() + CFG.cooldownMs;
      startTimer();
    } else {
      msgEl.textContent = T('wrong');
      msgEl.className = 'pgMsg pgMsgErr';
      card.classList.remove('pgShake'); void card.offsetWidth; card.classList.add('pgShake');
    }
    save();
    paint();
  }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
      if (!open) { clearInterval(timer); timer = 0; return; }
      if (leftMs() <= 0) {
        clearInterval(timer); timer = 0;
        gs().until = 0; save();
        msgEl.textContent = ''; msgEl.className = 'pgMsg';
      }
      paint();
    }, 1000);
  }

  function onKey(e) {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); return; }
    if (/^\d$/.test(e.key)) { e.preventDefault(); press(e.key); }
    else if (e.key === 'Backspace') { e.preventDefault(); press('del'); }
    else if (e.key === 'Enter' && typed && leftMs() <= 0) { e.preventDefault(); press('ok'); }
  }

  function close() {
    open = false;
    onPassCb = null;
    problem = null;
    typed = '';
    clearInterval(timer); timer = 0;
    if (modal) modal.classList.add('hidden');
    if (lastFocus && lastFocus.isConnected && typeof lastFocus.focus === 'function') { try { lastFocus.focus(); } catch (e) {} }
    lastFocus = null;
  }
  function cancel() { if (open) close(); }   // onPass не викликається

  function parentGate(onPass, opts) {
    if (open) return false;                 // уже відкрито — друге вікно не відкриваємо
    build();
    opts = opts || {};
    onPassCb = onPass;
    problem = newProblem();
    typed = '';
    open = true;
    lastFocus = document.activeElement;
    reasonEl.textContent = opts.reason ? String(opts.reason) : '';
    reasonEl.classList.toggle('hidden', !opts.reason);
    msgEl.textContent = ''; msgEl.className = 'pgMsg';
    card.classList.remove('pgShake');
    texts();
    modal.classList.remove('hidden');
    if (leftMs() > 0) startTimer(); else if (gs().until) { gs().until = 0; save(); }
    try { card.focus({ preventScroll: true }); } catch (e) {}
    return true;
  }
  parentGate.isOpen = () => open;
  BO.parentGate = parentGate;

  /* ---------- екран «Для батьків» ---------- */
  let view, entryBtn;

  function buildView() {
    if (view) return;
    const screen = $('screen');
    if (!screen) return;
    view = document.createElement('section');
    view.id = 'view-parents';
    view.className = 'view hidden';
    view.innerHTML =
      '<h2 id="parTitle"></h2>' +
      '<div class="parCard">' +
        '<p class="parLine"><span aria-hidden="true">🛡️</span><span id="parInfo"></span></p>' +
        '<p class="parLine"><span aria-hidden="true">📱</span><span id="parLocal"></span></p>' +
      '</div>' +
      '<div class="parList">' +
        '<div id="parPrivacy" class="parRow"></div>' +
        '<button type="button" id="parReset" class="parRow parBtn"><span aria-hidden="true">⟲</span><span id="parResetTxt"></span></button>' +
        '<button type="button" id="parShop" class="parRow parBtn" disabled><span aria-hidden="true">🛒</span><span id="parShopTxt"></span></button>' +
        '<p id="parShopNote" class="parNote"></p>' +
      '</div>' +
      '<button type="button" id="parBack" class="secondaryBtn"></button>';
    screen.appendChild(view);
    // той самий діалог «Почати спочатку?», що й кнопка ⟲ угорі (resetGame у app.js)
    $('parReset').addEventListener('click', () => { const r = $('btnReset'); if (r) r.click(); });
    $('parBack').addEventListener('click', () => BO.backToMain());
    // магазин — лише звідси, тобто вже після замка (shop.js ще раз питає замок перед кожною оплатою)
    $('parShop').addEventListener('click', () => { if (BO.shop) BO.shop.open(); });
    renderView();
  }

  function renderView() {
    if (!view) return;
    $('parTitle').textContent = T('title');
    $('parInfo').textContent = T('info');
    $('parLocal').textContent = T('local');
    $('parResetTxt').textContent = T('reset');
    const shop = !!BO.shop;
    $('parShop').disabled = !shop;
    $('parShopTxt').textContent = shop ? BO.t('shop.entry') : T('shop');
    $('parShopNote').textContent = shop ? BO.t('shop.entryNote') : T('shopNote');
    $('parBack').textContent = BO.t('common.back');
    const p = $('parPrivacy');
    p.innerHTML = '';
    const url = privacyHref();
    if (url) {
      const a = document.createElement('a');
      a.className = 'parLink';
      a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.innerHTML = '<span aria-hidden="true">📄</span><span></span>';
      a.lastChild.textContent = T('privacy');
      p.appendChild(a);
      p.classList.add('parHasLink');
    } else {
      p.classList.remove('parHasLink');
      p.innerHTML = '<span aria-hidden="true">📄</span><span class="parGrow"></span><span class="parSoon"></span>';
      p.children[1].textContent = T('privacy');
      p.children[2].textContent = T('soon');
    }
  }

  // Відносна адреса ('privacy/') — відносно сторінки гри; дозволяємо лише https:// або
  // свій же сайт (http://localhost під час перевірок), без javascript:, data: тощо.
  function privacyHref() {
    const raw = BO.PRIVACY_URL;
    if (!raw || typeof raw !== 'string') return '';
    let u;
    try { u = new URL(raw, document.baseURI); } catch (e) { return ''; }
    if (u.protocol === 'https:') return u.href;
    if ((u.protocol === 'http:' || u.protocol === 'file:') && u.protocol === location.protocol &&
        u.host === location.host) return u.href;
    return '';
  }

  function openParents() {
    BO.parentGate(() => { buildView(); renderView(); BO.openView('view-parents'); view.scrollTop = 0; });
  }

  /* ---------- кнопка 🔒 на головному екрані ---------- */
  // Тихий ряд під кнопками модулів: «? Як грати?» (tips.js) і «🔒 Для батьків».
  function buildEntry() {
    const main = $('view-main');
    if (!main) return;
    let foot = $('mainFoot');
    if (!foot) {
      foot = document.createElement('div');
      foot.id = 'mainFoot';
      main.appendChild(foot);
    }
    const tips = $('btnTips');
    if (tips && tips.parentElement !== foot) foot.insertBefore(tips, foot.firstChild);
    if (!entryBtn || !entryBtn.isConnected) {
      entryBtn = document.createElement('button');
      entryBtn.type = 'button';
      entryBtn.id = 'btnParents';
      entryBtn.innerHTML = '<b aria-hidden="true">🔒</b><span></span>';
      entryBtn.addEventListener('click', openParents);
      foot.appendChild(entryBtn);
      renderEntry();
    } else if (entryBtn.parentElement !== foot) foot.appendChild(entryBtn);
    if (foot !== main.lastElementChild) main.appendChild(foot);
  }
  function renderEntry() {
    if (!entryBtn) return;
    entryBtn.querySelector('span').textContent = T('title');
    entryBtn.setAttribute('aria-label', T('title'));
  }

  // гру згорнули, поки відкритий екран для батьків, — повертаємось на головний,
  // щоб дитина потім не застала «відімкнений» розділ
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && view && !view.classList.contains('hidden')) BO.backToMain();
  });

  BO.on('init', () => { gs(); buildEntry(); });
  BO.on('render', buildEntry);
  BO.on('lang', () => { renderEntry(); renderView(); texts(); });
})();
