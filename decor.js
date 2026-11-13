/* OTOTO — модуль "Моя кімната" (декор). CoLaba Production.
   Затишна кімната за спиною персонажа на головному екрані + екран, де дитина
   за зароблені грою бали ⭐ купує й розставляє речі. Без реальних грошей,
   без таймерів, без штрафів: речі ніколи не зникають, купівля — два тапи.

   Стан: state.decor = { owned: [id…], placed: { slot: id } }.
   Речі з price: 0 вважаються своїми завжди (навіть у старих збереженнях).

   Щоб додати нову річ: один рядок у DECOR_ITEMS + назва 'decor.item.<id>'
   у кожній мові. Більше нічого міняти не треба.

   premium: 'ototo.pack.…' — річ із платного набору (shop.js). За зірки НЕ
   купується; поки набору немає — замочок і лагідне пояснення (без магазину).
   Такі речі не пишуться в decor.owned (значки «Колекція» лишаються за гру). */
(function () {
  'use strict';
  if (!window.BO) return;

  // Слоти кімнати в порядку показу на екрані декору. Назва — 'decor.slot.<id>'.
  const DECOR_SLOTS = ['window', 'wall', 'shelf', 'lamp', 'floorL', 'floorR', 'rug'];

  // Каталог. bg — необов'язковий фон (небо у вікні, візерунок килимка).
  const DECOR_ITEMS = [
    { id: 'win_moon',     slot: 'window', emoji: '🌙', price: 0,   bg: 'linear-gradient(#141a44,#2b2f6e)' },
    { id: 'win_sun',      slot: 'window', emoji: '🌤️', price: 70,  bg: 'linear-gradient(#6fb8ff,#bfe3ff)' },
    { id: 'win_rainbow',  slot: 'window', emoji: '🌈', price: 260, bg: 'linear-gradient(#7fc8ff,#e3d4ff)' },
    { id: 'pic_flower',   slot: 'wall',   emoji: '🌻', price: 20 },
    { id: 'pic_frame',    slot: 'wall',   emoji: '🏞️', price: 90 },
    { id: 'pic_planet',   slot: 'wall',   emoji: '🪐', price: 420 },
    { id: 'shelf_books',  slot: 'shelf',  emoji: '📚', price: 30 },
    { id: 'shelf_clock',  slot: 'shelf',  emoji: '🕰️', price: 110 },
    { id: 'shelf_trophy', slot: 'shelf',  emoji: '🏆', price: 600 },
    { id: 'lamp_bulb',    slot: 'lamp',   emoji: '💡', price: 40 },
    { id: 'lamp_lantern', slot: 'lamp',   emoji: '🏮', price: 160 },
    { id: 'lamp_disco',   slot: 'lamp',   emoji: '🪩', price: 480 },
    { id: 'plant',        slot: 'floorL', emoji: '🪴', price: 0 },
    { id: 'teddy',        slot: 'floorL', emoji: '🧸', price: 60 },
    { id: 'guitar',       slot: 'floorL', emoji: '🎸', price: 300 },
    { id: 'ball',         slot: 'floorR', emoji: '⚽', price: 25 },
    { id: 'drum',         slot: 'floorR', emoji: '🥁', price: 180 },
    { id: 'fish',         slot: 'floorR', emoji: '🐠', price: 380 },
    { id: 'rug_blue',     slot: 'rug',    emoji: '🔵', price: 0,   bg: 'radial-gradient(ellipse at center,#5d7fd6 0 38%,#4363b3 39% 62%,#5d7fd6 63%)' },
    { id: 'rug_pink',     slot: 'rug',    emoji: '🌸', price: 50,  bg: 'radial-gradient(ellipse at center,#f59ac8 0 30%,#d873ab 31% 55%,#f59ac8 56%)' },
    { id: 'rug_rainbow',  slot: 'rug',    emoji: '🌈', price: 340, bg: 'radial-gradient(ellipse at center,#ffd86b 0 18%,#7fe0a6 19% 36%,#6fb8ff 37% 54%,#b48cff 55% 72%,#ff8fb8 73%)' },
    // набір «Космічна кімната» (ototo.pack.room1) — по одній речі в кожне місце
    { id: 'win_space',       slot: 'window', emoji: '🌌', price: 0, premium: 'ototo.pack.room1', bg: 'radial-gradient(circle at 30% 30%,#fff 0 1px,transparent 2px),radial-gradient(circle at 70% 60%,#fff 0 1px,transparent 2px),linear-gradient(#0b0630,#3a1a6e)' },
    { id: 'pic_comet',       slot: 'wall',   emoji: '☄️', price: 0, premium: 'ototo.pack.room1' },
    { id: 'shelf_telescope', slot: 'shelf',  emoji: '🔭', price: 0, premium: 'ototo.pack.room1' },
    { id: 'lamp_star',       slot: 'lamp',   emoji: '💫', price: 0, premium: 'ototo.pack.room1' },
    { id: 'rocket',          slot: 'floorL', emoji: '🚀', price: 0, premium: 'ototo.pack.room1' },
    { id: 'ufo',             slot: 'floorR', emoji: '🛸', price: 0, premium: 'ototo.pack.room1' },
    { id: 'rug_space',       slot: 'rug',    emoji: '🪐', price: 0, premium: 'ototo.pack.room1', bg: 'radial-gradient(ellipse at center,#ffd86b 0 10%,#2c2a7a 11% 40%,#7b5cd6 41% 60%,#1a1850 61%)' },
  ];

  const BO = window.BO;
  const t = (k, v) => BO.t('decor.' + k, v);
  const byId = (id) => DECOR_ITEMS.find(i => i.id === id);
  let armedId = null;     // річ, на яку тапнули один раз (показує кнопку "Купити")
  let toastTimer = null;
  let mainRoom = null, previewRoom = null, navBtn = null, view = null;

  /* ---------- стан ---------- */
  function ds() {
    const s = BO.state;
    if (!s.decor || typeof s.decor !== 'object') s.decor = { owned: [], placed: {} };
    if (!Array.isArray(s.decor.owned)) s.decor.owned = [];
    if (!s.decor.placed || typeof s.decor.placed !== 'object') s.decor.placed = {};
    return s.decor;
  }
  const premiumOwned = it => !!(BO.shop && BO.shop.owns(it.premium));
  function isOwned(it) { return it.premium ? premiumOwned(it) : (it.price === 0 || ds().owned.includes(it.id)); }
  const hideItem = it => !!it.premium && !premiumOwned(it) && !!(BO.shop && BO.shop.hideLocked());

  function ensureState() {
    const fresh = !BO.state.decor;
    const d = ds();
    if (fresh) {
      // новий гравець або старе збереження: стартові речі одразу в кімнаті
      DECOR_ITEMS.filter(i => i.price === 0 && !i.premium).forEach(i => {
        if (!d.owned.includes(i.id)) d.owned.push(i.id);
        if (!d.placed[i.slot]) d.placed[i.slot] = i.id;
      });
    }
    // прибрати з кімнати те, чого вже немає в каталозі
    Object.keys(d.placed).forEach(sl => { const it = byId(d.placed[sl]); if (!it || it.slot !== sl) delete d.placed[sl]; });
    dropLocked();
    BO.saveState();
  }
  // преміум-річ без набору (напр. вимкнули тестовий режим) — прибрати з кімнати
  function dropLocked() {
    const d = ds();
    let changed = false;
    Object.keys(d.placed).forEach(sl => { const it = byId(d.placed[sl]); if (it && it.premium && !premiumOwned(it)) { delete d.placed[sl]; changed = true; } });
    return changed;
  }

  /* ---------- кімната (одна функція для головного екрана і прев'ю) ---------- */
  function buildRoom(el) {
    el.classList.add('decorRoom');
    el.innerHTML =
      '<div class="dr-wall"></div><div class="dr-floor"></div><div class="dr-light"></div>' +
      '<div class="dr-slot s-window"><div class="dr-sky"></div><span class="dr-item"></span></div>' +
      '<div class="dr-slot s-wall"><span class="dr-item"></span></div>' +
      '<div class="dr-slot s-shelf"><span class="dr-item"></span><i class="dr-plank"></i></div>' +
      '<div class="dr-slot s-lamp"><i class="dr-cord"></i><span class="dr-item"></span></div>' +
      '<div class="dr-slot s-floorL"><span class="dr-item"></span></div>' +
      '<div class="dr-slot s-floorR"><span class="dr-item"></span></div>' +
      '<div class="dr-slot s-rug"><span class="dr-item"></span></div>' +
      '<div class="dr-night"></div>';
    el._last = null; // перше малювання — без анімації
    return el;
  }

  function pop(slotEl) {
    slotEl.classList.remove('dr-pop'); void slotEl.offsetWidth; slotEl.classList.add('dr-pop');
    const sp = document.createElement('span');
    sp.className = 'dr-spark'; sp.textContent = '✨';
    slotEl.appendChild(sp);
    setTimeout(() => sp.remove(), 900);
  }

  function updateRoom(el) {
    if (!el) return;
    const placed = ds().placed;
    const first = !el._last;
    el._last = el._last || {};
    DECOR_SLOTS.forEach(sl => {
      const slotEl = el.querySelector('.s-' + sl);
      const id = placed[sl] || '';
      if (el._last[sl] === id && !first) return;
      const it = id ? byId(id) : null;
      const itemEl = slotEl.querySelector('.dr-item');
      slotEl.classList.toggle('filled', !!it);
      if (sl === 'rug') { itemEl.textContent = ''; itemEl.style.background = it ? it.bg : ''; }
      else itemEl.textContent = it ? it.emoji : '';
      if (sl === 'window') slotEl.querySelector('.dr-sky').style.background = (it && it.bg) || '';
      if (sl === 'lamp') el.classList.toggle('lit', !!it);
      if (!first && it) pop(slotEl);
      el._last[sl] = id;
    });
    el.classList.toggle('night', !!BO.state.sleeping);
  }

  function mountMainRoom() {
    const stage = BO.$('stage');
    if (!stage) return;
    mainRoom = document.getElementById('decorRoom');
    if (!mainRoom) {
      mainRoom = document.createElement('div');
      mainRoom.id = 'decorRoom';
      stage.insertBefore(mainRoom, stage.firstChild);
      buildRoom(mainRoom);
    }
    stage.classList.add('hasRoom');
  }

  /* ---------- екран декору ---------- */
  function mountView() {
    view = document.createElement('section');
    view.id = 'view-decor';
    view.className = 'view hidden';
    view.innerHTML =
      '<div class="decorHead">' +
        '<div class="decorTop">' +
          '<button class="decorBack" type="button">←</button>' +
          '<h2 class="decorTitle"></h2>' +
          '<div class="decorPoints"></div>' +
        '</div>' +
        '<div class="decorPreview"><div class="decorPreviewInner"><img class="decorPet" alt=""></div></div>' +
        '<div class="decorToast"></div>' +
      '</div>' +
      '<div class="decorList"></div>' +
      '<button class="secondaryBtn decorBackBottom" type="button"></button>';
    BO.$('screen').appendChild(view);
    const inner = view.querySelector('.decorPreviewInner');
    previewRoom = document.createElement('div');
    inner.insertBefore(previewRoom, inner.firstChild);
    buildRoom(previewRoom);
    view.querySelector('.decorBack').addEventListener('click', closeView);
    view.querySelector('.decorBackBottom').addEventListener('click', closeView);
    // тап повз картки — скасувати "Купити"
    view.addEventListener('click', (e) => {
      if (armedId && !e.target.closest('.decorCard')) { armedId = null; renderList(); }
    });
  }

  function openView() {
    armedId = null;
    renderView();
    BO.openView('view-decor');
    view.scrollTop = 0;
  }
  function closeView() { armedId = null; BO.backToMain(); }

  function renderView() {
    if (!view) return;
    view.querySelector('.decorTitle').textContent = t('title');
    view.querySelector('.decorBackBottom').textContent = t('back');
    const ch = BO.activeCharacter();
    const pet = view.querySelector('.decorPet');
    if (pet.getAttribute('src') !== ch.img) pet.setAttribute('src', ch.img);
    renderPoints();
    updateRoom(previewRoom);
    renderList();
  }
  function renderPoints() {
    if (view) view.querySelector('.decorPoints').textContent = '⭐ ' + (BO.state.points || 0);
  }

  function cardFooter(it, d) {
    const pts = BO.state.points || 0;
    if (d.placed[it.slot] === it.id) return '<span class="dTag on">' + t('placed') + '</span>';
    if (isOwned(it)) return '<span class="dTag">' + t('place') + '</span>';
    if (it.premium) return '<span class="dTag dPremium">🔒 ' + BO.t('shop.lockTag') + '</span>';
    if (pts < it.price) return '<span class="dTag need">' + t('need', { left: it.price - pts }) + '</span>';
    if (armedId === it.id) return '<button class="dBuy" type="button">' + t('buy', { n: it.price }) + '</button>';
    return '<span class="dTag price">' + t('price', { n: it.price }) + '</span>';
  }

  function renderList() {
    if (!view) return;
    const d = ds();
    const pts = BO.state.points || 0;
    const list = view.querySelector('.decorList');
    list.innerHTML = '';
    DECOR_SLOTS.forEach(sl => {
      const items = DECOR_ITEMS.filter(i => i.slot === sl && !hideItem(i));
      if (!items.length) return;
      const group = document.createElement('div');
      group.className = 'decorGroup';
      group.innerHTML = '<div class="decorGroupTitle">' + t('slot.' + sl) + '</div><div class="decorGrid"></div>';
      const grid = group.querySelector('.decorGrid');
      items.forEach(it => {
        const owned = isOwned(it);
        const card = document.createElement('div');
        card.className = 'decorCard' +
          (d.placed[sl] === it.id ? ' placed' : '') +
          (owned ? ' owned' : (it.premium ? ' locked premium' : (pts >= it.price ? ' canBuy' : ' locked'))) +
          (armedId === it.id ? ' armed' : '');
        card.innerHTML =
          '<span class="dEmoji' + (sl === 'rug' ? ' dRug' : '') + '"' + (sl === 'rug' ? ' style="background:' + it.bg + '"' : '') + '>' +
            (sl === 'rug' ? '' : it.emoji) + '</span>' +
          '<span class="dName">' + t('item.' + it.id) + '</span>' + cardFooter(it, d);
        card.addEventListener('click', (e) => { e.stopPropagation(); onCard(it); });
        const buy = card.querySelector('.dBuy');
        if (buy) buy.addEventListener('click', (e) => { e.stopPropagation(); buyItem(it); });
        grid.appendChild(card);
      });
      list.appendChild(group);
    });
  }

  function onCard(it) {
    const d = ds();
    if (isOwned(it)) {
      armedId = null;
      if (d.placed[it.slot] === it.id) delete d.placed[it.slot];
      else d.placed[it.slot] = it.id;
      BO.saveState();
      updateRoom(previewRoom);
      updateRoom(mainRoom);
      renderList();
      return;
    }
    if (it.premium) { armedId = null; renderList(); if (BO.shop) BO.shop.lockedInfo(it.premium); return; }   // лише пояснення, не магазин
    if ((BO.state.points || 0) < it.price) { armedId = null; renderList(); return; }
    armedId = (armedId === it.id) ? null : it.id; // тап удруге по картці — скасувати
    renderList();
  }

  function buyItem(it) {
    const d = ds();
    if (it.premium || isOwned(it) || (BO.state.points || 0) < it.price) return;
    BO.addPoints(-it.price);
    d.owned.push(it.id);
    d.placed[it.slot] = it.id; // щойно куплене одразу ставимо в кімнату
    armedId = null;
    BO.saveState();
    BO.render();
    renderPoints();
    updateRoom(previewRoom);
    renderList();
    showToast(t('bought', { name: t('item.' + it.id) }));
  }

  function showToast(text) {
    const el = view.querySelector('.decorToast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  /* ---------- кнопка в #navRow ---------- */
  function mountNav() {
    const row = BO.$('navRow');
    if (!row) return;
    navBtn = document.createElement('button');
    navBtn.className = 'navBtn';
    navBtn.id = 'btnDecor';
    navBtn.type = 'button';
    navBtn.innerHTML = '🏠<span></span>';
    navBtn.addEventListener('click', openView);
    row.appendChild(navBtn);
    renderNav();
  }
  function renderNav() { if (navBtn) navBtn.querySelector('span').textContent = t('nav'); }

  /* ---------- хуки ---------- */
  BO.on('init', () => {
    ensureState();
    mountMainRoom();
    mountView();
    mountNav();
  });
  BO.on('render', () => {
    updateRoom(mainRoom);
    if (view && !view.classList.contains('hidden')) renderPoints();
  });
  BO.on('points', () => {
    if (view && !view.classList.contains('hidden')) { renderPoints(); renderList(); }
  });
  BO.on('lang', () => {
    renderNav();
    if (view) renderView();
  });

  // для інших модулів / налагодження
  // покупка / відновлення / вимкнення тестового режиму — перемалювати
  window.addEventListener('bo:shopchange', () => {
    if (!BO.state) return;
    if (dropLocked()) BO.saveState();
    updateRoom(mainRoom);
    if (view && !view.classList.contains('hidden')) { updateRoom(previewRoom); renderList(); }
  });

  BO.decor = { items: DECOR_ITEMS, slots: DECOR_SLOTS };
})();
