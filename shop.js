/* OTOTO — модуль «Магазин» (покупки в застосунку, безпечні для дітей). CoLaba Production.

   ПРИНЦИПИ (див. SHOP_PLAN.md):
   - без реклами, без підписок, без «лутбоксів», без таймерів і тиску;
   - лише разові покупки (non-consumable): «Повна версія» або окремі набори;
   - зірки ⭐ заробляються тільки грою — за гроші НЕ продаються;
   - навчання (5 ігор), догляд, мапа, міні-ігри, усі нинішні речі — безкоштовні;
   - магазин відкривається ЛИШЕ з екрана «Для батьків» (після замка), і перед
     кожною оплатою замок питає ще раз; дитина магазину не бачить;
   - зачинена річ у грі показує лише нейтральне пояснення, без «попроси купити»
     (Директива ЄС 2005/29, додаток I п. 28 — заборонено закликати дітей
     умовляти батьків купити).

   КАТАЛОГ — масив CATALOG нижче (одне місце). Що саме відкриває набір, каже
   сама річ: у CONFIG.wardrobe — unlock: { type: 'premium', product },
   у каталозі декору (decor.js) — premium: '<product>', у CONFIG.characters —
   premium: '<product>'. «Повна версія» (ototo.full) відкриває всі набори.

   СТАН: state.shop = { owned: { '<id>': { src: 'play'|'appstore'|'test', at } }, hideLocked }
   Покупки з тестового режиму (src 'test') діють ЛИШЕ поки тестовий режим увімкнений.

   API:
     BO.shop.catalog            — каталог (масив)
     BO.shop.owns(id)           — чи відкритий набір / повна версія
     BO.shop.open()             — відкрити магазин (без екрана «Для батьків» — спершу замок)
     BO.shop.lockedInfo(id)     — лагідне пояснення дитині про зачинену річ
     BO.shop.hideLocked()       — батьки обрали «не показувати зачинені речі»
     BO.shop.backend()          — 'none' | 'digitalGoods' | 'test'
     BO.shop.selectBackend()    — заново визначити спосіб оплати (Promise)
     BO.shop.registerBackend(name, impl) — під майбутній App Store (StoreKit-міст)
   Події (window): 'bo:purchase' { id, source, restored } — набір відкрито;
                   'bo:shopchange' — змінився набір відкритих речей.

   СПОСОБИ ОПЛАТИ (адаптери з однаковим інтерфейсом):
     none          — сайт: «Покупки будуть доступні в застосунку з Google Play / App Store»;
     digitalGoods  — Google Play у застосунку-обгортці (TWA): Digital Goods API +
                     Payment Request. Вмикається, лише коли є window.getDigitalGoodsService
                     І задано BO.SHOP_VERIFY_URL (сервер, що перевіряє й підтверджує
                     покупку через Google Play Developer API; без підтвердження за
                     3 дні Google сам повертає гроші). Без сервера — режим none;
     test          — для перевірки: ?shoptest=1 у адресі (або localStorage
                     'ototo.shoptest' = '1'); вимкнути — ?shoptest=0. Чітко позначено
                     «ТЕСТ». Не вмикається всередині застосунку з Google Play і коли
                     BO.SHOP_ALLOW_TEST === false (ставити так у релізі).
   Тексти: ключі 'shop.*' (i18n_shop.json → tools/i18n_shop.py). */
(function () {
  'use strict';
  if (!window.BO) return;
  const BO = window.BO;

  /* ---------- каталог (єдине місце) ----------
     id — ідентифікатор товару в Play Console / App Store Connect (однаковий);
     price — орієнтовний рівень ціни для налаштування в консолях (справжню ціну
     в валюті покупця дає магазин); у тестовому режимі показуємо USD. */
  const CATALOG = [
    { id: 'ototo.full',          kind: 'full', icon: '🎁', includes: ['ototo.pack.outfits1', 'ototo.pack.room1'],
      price: { USD: 4.99, EUR: 4.99, UAH: 199 } },
    { id: 'ototo.pack.outfits1', kind: 'pack', icon: '👗', price: { USD: 1.99, EUR: 1.99, UAH: 79 } },
    { id: 'ototo.pack.room1',    kind: 'pack', icon: '🚀', price: { USD: 1.99, EUR: 1.99, UAH: 79 } },
    // наступний набір (друзі) — коли будуть малюнки: { id: 'ototo.pack.friends1', kind: 'pack', icon: '🐾', … }
    // і premium: 'ototo.pack.friends1' у CONFIG.characters; додати його в includes повної версії.
  ];
  const FULL = 'ototo.full';
  const byId = id => CATALOG.find(p => p.id === id);
  const short = id => id.replace(/^ototo\.(pack\.)?/, '');            // 'ototo.pack.room1' → 'room1'
  const T = (k, v) => BO.t('shop.' + k, v);
  const $ = id => document.getElementById(id);
  const save = () => { try { BO.saveState(); } catch (e) {} };
  const TEST_KEY = 'ototo.shoptest';
  const PLAY = 'https://play.google.com/billing';

  /* ---------- стан ---------- */
  function ss() {
    const s = BO.state;
    if (!s) return { owned: {}, hideLocked: false };
    if (!s.shop || typeof s.shop !== 'object') s.shop = { owned: {}, hideLocked: false };
    if (!s.shop.owned || typeof s.shop.owned !== 'object' || Array.isArray(s.shop.owned)) s.shop.owned = {};
    s.shop.hideLocked = !!s.shop.hideLocked;
    return s.shop;
  }

  /* ---------- тестовий режим ---------- */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  (function readFlag() {
    const m = /[?&]shoptest=([01])\b/.exec(location.search || '');
    if (m) lsSet(TEST_KEY, m[1] === '1' ? '1' : null);
  })();
  function testAllowed() {
    if (BO.SHOP_ALLOW_TEST === false) return false;
    return !('getDigitalGoodsService' in window);   // у застосунку з Google Play тестових покупок немає
  }
  const testMode = () => lsGet(TEST_KEY) === '1' && testAllowed();
  const TEST_STORE = 'ototo.shoptest.store';
  function testStore() {
    try { const a = JSON.parse(lsGet(TEST_STORE) || '[]'); return Array.isArray(a) ? a.filter(id => typeof id === 'string') : []; } catch (e) { return []; }
  }

  /* ---------- права (entitlements) ---------- */
  function valid(id) {
    const r = ss().owned[id];
    return !!r && (r.src !== 'test' || testMode());
  }
  function owns(id) {
    if (!id) return false;
    if (valid(id)) return true;
    const full = byId(FULL);
    return id !== FULL && !!full && full.includes.includes(id) && valid(FULL);
  }
  function grant(id, src, restored) {
    if (!byId(id)) return false;
    const o = ss().owned;
    const had = owns(id);
    if (!o[id] || o[id].src === 'test') o[id] = { src, at: Date.now() };
    save();
    if (!had) window.dispatchEvent(new CustomEvent('bo:purchase', { detail: { id, source: src, restored: !!restored } }));
    changed();
    return !had;
  }
  // після зміни прав: зняти з персонажа / з кімнати те, що більше не відкрите
  function cleanup() {
    const s = BO.state;
    if (!s) return;
    let dirty = false;
    const w = (BO.CONFIG.wardrobe || []).find(x => x.id === s.equipped);
    if (w && w.unlock && w.unlock.type === 'premium' && !owns(w.unlock.product)) { s.equipped = 'none'; dirty = true; }
    const c = (BO.CONFIG.characters || []).find(x => x.id === s.activeChar);
    if (c && c.premium && !owns(c.premium) && !(s.ownedChars || []).includes(c.id)) { s.activeChar = BO.CONFIG.characters[0].id; dirty = true; }
    if (dirty) save();
  }
  function changed() {
    cleanup();
    window.dispatchEvent(new CustomEvent('bo:shopchange'));
    try { if (BO.state && !$('view-main').classList.contains('hidden')) BO.render(); } catch (e) {}
    renderView();
  }

  /* ---------- що входить у набір (з самих речей) ---------- */
  function contents(id) {
    const p = byId(id);
    if (!p) return [];
    if (p.kind === 'full') return p.includes.reduce((a, x) => a.concat(contents(x)), []);
    const out = [];
    (BO.CONFIG.wardrobe || []).forEach(w => { if (w.unlock && w.unlock.type === 'premium' && w.unlock.product === id) out.push({ kind: 'wardrobe', id: w.id, emoji: w.emoji }); });
    ((BO.decor && BO.decor.items) || []).forEach(d => { if (d.premium === id) out.push({ kind: 'decor', id: d.id, emoji: d.emoji }); });
    (BO.CONFIG.characters || []).forEach(c => { if (c.premium === id) out.push({ kind: 'char', id: c.id, img: c.img }); });
    return out;
  }
  const itemName = it => it.kind === 'wardrobe' ? BO.t('wardrobe.' + it.id) : it.kind === 'decor' ? BO.t('decor.item.' + it.id) : BO.t('char.' + it.id + '.name');

  /* ---------- адаптери оплати ----------
     Інтерфейс: init() → Promise<bool> (чи доступний), prices(ids) → Promise<{id: рядок ціни}>,
     buy(id) → Promise<{ ok, cancelled?, error? }>, restore() → Promise<[id…]>. */
  const fmt = (value, currency) => {
    const lang = (BO.state && BO.state.lang) || 'en';
    try { return new Intl.NumberFormat(lang, { style: 'currency', currency }).format(value); } catch (e) { return value + ' ' + currency; }
  };

  const BACKENDS = {
    none: {
      init: () => Promise.resolve(true),
      prices: () => Promise.resolve({}),
      buy: () => Promise.resolve({ ok: false, error: 'unavailable' }),
      restore: () => Promise.resolve([]),
    },

    // «акаунт магазину» тестового режиму — окремий запис localStorage, переживає
    // скидання гри (як справжній Google-акаунт), тож «Відновити покупки» можна перевірити
    test: {
      init: () => Promise.resolve(testMode()),
      prices: ids => Promise.resolve(ids.reduce((m, id) => { m[id] = 'TEST ' + fmt(byId(id).price.USD, 'USD'); return m; }, {})),
      buy: id => {
        const st = testStore();
        if (!st.includes(id)) { st.push(id); lsSet(TEST_STORE, JSON.stringify(st)); }
        return Promise.resolve({ ok: true });
      },
      restore: () => Promise.resolve(testStore()),
    },

    // Google Play Billing у TWA (developer.chrome.com/docs/android/trusted-web-activity/receive-payments-play-billing)
    digitalGoods: (function () {
      let service = null;
      // перевірка на сервері: він звіряє токен через Google Play Developer API і
      // підтверджує (acknowledge) покупку. Шлемо лише токен і id товару — жодних даних про дитину.
      async function verify(purchaseToken, sku) {
        const url = BO.SHOP_VERIFY_URL;
        if (!url || !/^https:\/\//i.test(url)) return false;
        try {
          const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ purchaseToken, sku, packageName: BO.SHOP_PACKAGE || '' }) });
          if (!r.ok) return false;
          const j = await r.json();
          return !!(j && j.ok === true);
        } catch (e) { return false; }
      }
      return {
        async init() {
          service = null;
          if (!('getDigitalGoodsService' in window)) return false;
          if (!BO.SHOP_VERIFY_URL || !/^https:\/\//i.test(BO.SHOP_VERIFY_URL)) return false;   // без сервера покупки не продаємо
          if (typeof window.PaymentRequest !== 'function') return false;
          try { service = await window.getDigitalGoodsService(PLAY); } catch (e) { service = null; }
          return !!service;
        },
        async prices(ids) {
          const out = {};
          try {
            const det = await service.getDetails(ids);
            (det || []).forEach(d => { if (d && d.price) out[d.itemId] = fmt(d.price.value, d.price.currency); });
          } catch (e) { console.warn('[shop] getDetails', e); }
          return out;
        },
        async buy(sku) {
          const req = new PaymentRequest([{ supportedMethods: PLAY, data: { sku } }],
            { total: { label: 'Total', amount: { currency: 'USD', value: '0' } } });   // обов'язкове поле, Play його ігнорує
          let resp;
          try { resp = await req.show(); } catch (e) {
            return (e && e.name === 'AbortError') ? { ok: false, cancelled: true } : { ok: false, error: String(e && e.message || e) };
          }
          const token = resp && resp.details && resp.details.purchaseToken;
          const ok = !!token && await verify(token, sku);
          try { await resp.complete(ok ? 'success' : 'fail'); } catch (e) {}
          return ok ? { ok: true } : { ok: false, error: 'verify' };
        },
        async restore() {
          const list = await service.listPurchases();
          const out = [];
          for (const p of (list || [])) {
            if (p && byId(p.itemId) && await verify(p.purchaseToken, p.itemId)) out.push(p.itemId);
          }
          return out;
        },
      };
    })(),
  };
  const SRC = { digitalGoods: 'play', test: 'test', appStore: 'appstore' };

  let backendName = 'none', prices = {}, busy = false;
  async function selectBackend() {
    let name = 'none';
    if (testMode() && await BACKENDS.test.init()) name = 'test';
    else if (BACKENDS.digitalGoods && await BACKENDS.digitalGoods.init().catch(() => false)) name = 'digitalGoods';
    else if (BACKENDS.appStore && await BACKENDS.appStore.init().catch(() => false)) name = 'appStore';
    backendName = name;
    prices = {};
    try { prices = await BACKENDS[name].prices(CATALOG.map(p => p.id)) || {}; } catch (e) { prices = {}; }
    changed();
    return name;
  }

  /* ---------- дії ---------- */
  function buy(id) {
    const p = byId(id);
    if (!p || busy || owns(id) || backendName === 'none') return;
    // замок перед КОЖНОЮ оплатою (навіть якщо магазин уже відкрито)
    BO.parentGate(async () => {
      busy = true; renderView();
      let res;
      try { res = await BACKENDS[backendName].buy(id); } catch (e) { res = { ok: false, error: String(e) }; }
      busy = false;
      if (res && res.ok) {
        grant(id, SRC[backendName] || backendName, false);
        toast(T('thanks', { name: T('p.' + short(id) + '.name') }));
      } else {
        renderView();
        toast(res && res.cancelled ? T('cancelled') : T('error'));
      }
    }, { reason: T('reason', { name: T('p.' + short(id) + '.name') }) });
  }

  async function restore() {
    if (busy) return;
    if (backendName === 'none') { toast(T('noneInfo')); return; }
    busy = true; renderView(); toast(T('restoring'));
    let ids = [];
    let failed = false;
    try { ids = await BACKENDS[backendName].restore() || []; } catch (e) { failed = true; }
    busy = false;
    // відновлення лише ДОДАЄ: збій мережі не повинен забирати куплене
    let n = 0;
    ids.forEach(id => { if (byId(id)) { grant(id, SRC[backendName] || backendName, true); n++; } });
    renderView();
    toast(failed ? T('error') : n ? T('restored', { n }) : T('restoredNone'));
  }

  // дитина тапнула зачинену річ: лише нейтральне пояснення, магазин НЕ відкривається
  function lockedInfo() {
    BO.showEventModal('🔒', T('lockedText'));
  }

  /* ---------- екран магазину ---------- */
  let view = null, toastTimer = 0;

  function buildView() {
    if (view) return;
    const screen = $('screen');
    if (!screen) return;
    view = document.createElement('section');
    view.id = 'view-shop';
    view.className = 'view hidden';
    view.innerHTML =
      '<h2 id="shopTitle"></h2>' +
      '<div id="shopTest" class="shopTest hidden"></div>' +
      '<div class="shopCard shopIntro">' +
        '<p class="shopLine"><span aria-hidden="true">💳</span><span id="shopIntro"></span></p>' +
        '<p class="shopLine"><span aria-hidden="true">⭐</span><span id="shopStars"></span></p>' +
      '</div>' +
      '<p id="shopNone" class="shopNone hidden"></p>' +
      '<div id="shopList" class="shopList"></div>' +
      '<button type="button" id="shopRestore" class="parRow parBtn shopRestore"><span aria-hidden="true">↻</span><span id="shopRestoreTxt"></span></button>' +
      '<label class="shopToggle"><input type="checkbox" id="shopHide"><span id="shopHideTxt"></span></label>' +
      '<p id="shopFamily" class="parNote"></p>' +
      '<div id="shopToast" class="shopToast" role="status" aria-live="polite"></div>' +
      '<button type="button" id="shopBack" class="secondaryBtn"></button>';
    screen.appendChild(view);
    $('shopBack').addEventListener('click', close);
    $('shopRestore').addEventListener('click', restore);
    $('shopHide').addEventListener('change', e => { ss().hideLocked = !!e.target.checked; save(); changed(); });
    $('shopList').addEventListener('click', e => {
      const b = e.target.closest('.shopBuy');
      if (b && !b.disabled) buy(b.dataset.id);
    });
  }

  function renderView() {
    if (!view) return;
    $('shopTitle').textContent = T('title');
    $('shopIntro').textContent = T('intro');
    $('shopStars').textContent = T('starsNote');
    const test = backendName === 'test';
    $('shopTest').textContent = T('testBanner');
    $('shopTest').classList.toggle('hidden', !test);
    $('shopNone').textContent = T('noneInfo');
    $('shopNone').classList.toggle('hidden', backendName !== 'none');
    $('shopRestoreTxt').textContent = T('restore');
    $('shopRestore').disabled = busy || backendName === 'none';
    $('shopHide').checked = ss().hideLocked;
    $('shopHideTxt').textContent = T('hideLocked');
    $('shopFamily').textContent = T('family');
    $('shopBack').textContent = BO.t('common.back');

    const list = $('shopList');
    list.innerHTML = '';
    CATALOG.forEach(p => {
      const items = contents(p.id);
      if (!items.length) return;                       // набір без речей не продаємо
      const key = short(p.id);
      const own = owns(p.id);
      const inFull = own && !valid(p.id);              // відкрито через повну версію
      const allOwned = p.kind === 'full' && !own && p.includes.every(owns);
      const card = document.createElement('div');
      card.className = 'shopProduct' + (p.kind === 'full' ? ' shopFull' : '') + (own || allOwned ? ' shopOwned' : '');
      card.dataset.id = p.id;
      card.innerHTML =
        '<div class="shopHead"><span class="shopIcon" aria-hidden="true"></span>' +
          '<div class="shopNames"><div class="shopName"></div><div class="shopDesc"></div></div></div>' +
        '<div class="shopIncl"><span class="shopInclT"></span><span class="shopItems"></span></div>' +
        '<div class="shopFoot"></div>';
      card.querySelector('.shopIcon').textContent = p.icon;
      card.querySelector('.shopName').textContent = T('p.' + key + '.name');
      card.querySelector('.shopDesc').textContent = T('p.' + key + '.desc');
      card.querySelector('.shopInclT').textContent = T('includes');
      const row = card.querySelector('.shopItems');
      items.forEach(it => {
        const s = document.createElement('span');
        s.className = 'shopItem';
        s.title = itemName(it);
        s.setAttribute('aria-label', itemName(it));
        if (it.img) { const im = document.createElement('img'); im.src = it.img; im.alt = ''; s.appendChild(im); }
        else s.textContent = it.emoji;
        row.appendChild(s);
      });
      const foot = card.querySelector('.shopFoot');
      if (own || allOwned) {
        foot.innerHTML = '<span class="shopDone"></span>';
        foot.firstChild.textContent = inFull ? T('inFull') : own ? T('owned') : T('allOwned');
      } else if (backendName === 'none') {
        foot.innerHTML = '<span class="shopSoon"></span>';
        foot.firstChild.textContent = T('priceSoon');
      } else {
        const price = prices[p.id] || '';
        foot.innerHTML = '<span class="shopPrice"></span><button type="button" class="shopBuy"></button>';
        foot.querySelector('.shopPrice').textContent = price;
        const b = foot.querySelector('.shopBuy');
        b.dataset.id = p.id;
        b.textContent = T('buy');
        b.disabled = busy;
      }
      list.appendChild(card);
    });
  }

  function toast(text) {
    const el = $('shopToast');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
  }

  function openNow() {
    buildView();
    renderView();
    BO.openView('view-shop');
    view.scrollTop = 0;
  }
  // магазин відкривається лише з екрана «Для батьків» (уже після замка); з будь-якого
  // іншого місця — спершу замок
  function open() {
    const par = $('view-parents');
    if (par && !par.classList.contains('hidden')) openNow();
    else BO.parentGate(openNow);
  }
  function close() {
    // назад — на екран «Для батьків», якщо він є
    const par = $('view-parents');
    if (par) { BO.openView('view-parents'); par.scrollTop = 0; } else BO.backToMain();
  }
  // гру згорнули з відкритим магазином — на головний екран (дитина не застане магазин)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && view && !view.classList.contains('hidden')) BO.backToMain();
  });

  BO.shop = {
    catalog: CATALOG,
    owns,
    open,
    lockedInfo,
    hideLocked: () => !!(BO.state && ss().hideLocked),
    backend: () => backendName,
    testMode,
    selectBackend,
    contents,
    registerBackend(name, impl) { if (name && impl && !BACKENDS[name]) BACKENDS[name] = impl; },
  };

  BO.on('init', () => { ss(); cleanup(); save(); selectBackend(); });
  BO.on('lang', () => { selectBackend(); });
})();
