/* OTOTO — модуль «Нагороди» (досягнення / значки). CoLaba Production.

   Значки за гру: доглядати, грати, збирати, мандрувати мапою, приходити в гості.
   Лагідно: значки ніколи не забираються, немає таймерів і штрафів, нагорода —
   кілька ⭐ (бали тільки за гру, не за гроші).

   Стан: state.ach = {
     got:   { id: timestamp },   // отримані значки
     queue: [id …],              // отримані, але ще не показані (свято чекає вільного головного екрана)
     n:     { feeds, washes, sleeps, heals, games, records, taps, … },  // лічильники, яких немає в ядрі
     played:{ gameId: 1 },       // у які міні-ігри вже грали
     days, lastDay,              // скільки різних днів дитина заходила
     seen                        // скільки значків було на момент останнього відкриття екрана (крапка на 🏆)
   }

   Щоб додати значок: один рядок у ACHIEVEMENTS + два ключі в кожній мові:
   'ach.<id>.name' і 'ach.<id>.desc' ({n} — ціль, {name} — ім'я друга, {zone} — назва землі на мапі;
   обидва — у називному відмінку, не відмінюються).
   Новий тип умови — одна функція в STATS. Ядро (app.js) не правиться. */
(function () {
  'use strict';
  if (!window.BO) return;
  const BO = window.BO;

  const REWARD = { bronze: 5, silver: 15, gold: 30 };   // ⭐ за значок
  const CATS = ['care', 'play', 'collection', 'journey', 'loyalty', 'fun'];

  /* ---------- Каталог значків ----------
     stat — назва лічильника з STATS (або 'назва:аргумент'), goal — скільки треба.
     secret: true — поки не отримано, показується як «❔ Секрет» з підказкою. */
  const ACHIEVEMENTS = [
    // турбота
    { id: 'feed10',    cat: 'care', icon: '🍎', tier: 'bronze', stat: 'feeds',  goal: 10 },
    { id: 'feed50',    cat: 'care', icon: '🥕', tier: 'silver', stat: 'feeds',  goal: 50 },
    { id: 'feed200',   cat: 'care', icon: '🍰', tier: 'gold',   stat: 'feeds',  goal: 200 },
    { id: 'wash10',    cat: 'care', icon: '🧼', tier: 'bronze', stat: 'washes', goal: 10 },
    { id: 'wash50',    cat: 'care', icon: '🛁', tier: 'silver', stat: 'washes', goal: 50 },
    { id: 'wash200',   cat: 'care', icon: '🫧', tier: 'gold',   stat: 'washes', goal: 200 },
    { id: 'sleep5',    cat: 'care', icon: '🌙', tier: 'bronze', stat: 'sleeps', goal: 5 },
    { id: 'sleep30',   cat: 'care', icon: '🛏️', tier: 'silver', stat: 'sleeps', goal: 30 },
    { id: 'heal1',     cat: 'care', icon: '💊', tier: 'bronze', stat: 'heals',  goal: 1 },
    { id: 'heal10',    cat: 'care', icon: '🩺', tier: 'silver', stat: 'heals',  goal: 10 },
    // ігри
    { id: 'game1',     cat: 'play', icon: '🎮', tier: 'bronze', stat: 'games',   goal: 1 },
    { id: 'game25',    cat: 'play', icon: '🕹️', tier: 'silver', stat: 'games',   goal: 25 },
    { id: 'game100',   cat: 'play', icon: '👾', tier: 'gold',   stat: 'games',   goal: 100 },
    { id: 'allGames',  cat: 'play', icon: '🎪', tier: 'gold',   stat: 'tried',   goal: 15 },
    { id: 'record1',   cat: 'play', icon: '📈', tier: 'bronze', stat: 'records', goal: 1 },
    { id: 'record15',  cat: 'play', icon: '🚀', tier: 'silver', stat: 'records', goal: 15 },
    { id: 'score10',   cat: 'play', icon: '🎯', tier: 'bronze', stat: 'best',    goal: 10 },
    { id: 'score25',   cat: 'play', icon: '🏅', tier: 'silver', stat: 'best',    goal: 25 },
    { id: 'score50',   cat: 'play', icon: '🥇', tier: 'gold',   stat: 'best',    goal: 50 },
    // колекція
    { id: 'friend_mushroom', cat: 'collection', icon: '🍄', tier: 'bronze', stat: 'friend:mushroom', goal: 1, char: 'mushroom' },
    { id: 'friend_robot',    cat: 'collection', icon: '🤖', tier: 'silver', stat: 'friend:robot',    goal: 1, char: 'robot' },
    { id: 'friend_whale',    cat: 'collection', icon: '🐳', tier: 'silver', stat: 'friend:whale',    goal: 1, char: 'whale' },
    { id: 'friend_cactus',   cat: 'collection', icon: '🌵', tier: 'gold',   stat: 'friend:cactus',   goal: 1, char: 'cactus' },
    { id: 'decor6',    cat: 'collection', icon: '🪴', tier: 'bronze', stat: 'decor',  goal: 6 },
    { id: 'decor12',   cat: 'collection', icon: '🛋️', tier: 'silver', stat: 'decor',  goal: 12 },
    { id: 'decor21',   cat: 'collection', icon: '🏰', tier: 'gold',   stat: 'decor',  goal: 21 },
    { id: 'outfit',    cat: 'collection', icon: '👕', tier: 'bronze', stat: 'outfit', goal: 1 },
    // мандрівка мапою
    { id: 'level5',    cat: 'journey', icon: '👣', tier: 'bronze', stat: 'level', goal: 5 },
    { id: 'level20',   cat: 'journey', icon: '🧭', tier: 'silver', stat: 'level', goal: 20 },
    { id: 'level50',   cat: 'journey', icon: '🗺️', tier: 'gold',   stat: 'level', goal: 50 },
    { id: 'zone_forest',    cat: 'journey', icon: '🌲', tier: 'bronze', stat: 'level', goal: 11, zone: 'forest' },
    { id: 'zone_sea',       cat: 'journey', icon: '🌊', tier: 'silver', stat: 'level', goal: 21, zone: 'sea' },
    { id: 'zone_mountains', cat: 'journey', icon: '⛰️', tier: 'silver', stat: 'level', goal: 31, zone: 'mountains' },
    { id: 'zone_sky',       cat: 'journey', icon: '☁️', tier: 'gold',   stat: 'level', goal: 41, zone: 'sky' },
    { id: 'zone_space',     cat: 'journey', icon: '🪐', tier: 'gold',   stat: 'level', goal: 51, zone: 'space' },
    // вірність
    { id: 'streak3',   cat: 'loyalty', icon: '🔥', tier: 'bronze', stat: 'streak', goal: 3 },
    { id: 'streak7',   cat: 'loyalty', icon: '📅', tier: 'silver', stat: 'streak', goal: 7 },
    { id: 'streak14',  cat: 'loyalty', icon: '💫', tier: 'silver', stat: 'streak', goal: 14 },
    { id: 'streak30',  cat: 'loyalty', icon: '👑', tier: 'gold',   stat: 'streak', goal: 30 },
    { id: 'days10',    cat: 'loyalty', icon: '🌱', tier: 'bronze', stat: 'days',   goal: 10 },
    { id: 'days30',    cat: 'loyalty', icon: '🌳', tier: 'silver', stat: 'days',   goal: 30 },
    { id: 'days100',   cat: 'loyalty', icon: '💎', tier: 'gold',   stat: 'days',   goal: 100 },
    // веселі секрети
    { id: 'taps20',    cat: 'fun', icon: '🤗', tier: 'bronze', stat: 'taps',    goal: 20, secret: true },
    { id: 'goldBubble',cat: 'fun', icon: '✨', tier: 'silver', stat: 'gold',    goal: 1,  secret: true },
    { id: 'bubbles30', cat: 'fun', icon: '🫧', tier: 'bronze', stat: 'bubbles', goal: 30, secret: true },
    { id: 'nightSleep',cat: 'fun', icon: '🌜', tier: 'bronze', stat: 'night',   goal: 1,  secret: true },
    { id: 'earlyBird', cat: 'fun', icon: '🐦', tier: 'bronze', stat: 'morning', goal: 1,  secret: true },
  ];

  /* =====================================================================
     НАВЧАННЯ 🎓 — медалі 5 освітніх ігор у екрані нагород.
     Медалі видають самі ігри (edu_*.js через edu.js → ctx.win({medal})),
     вони лежать у BO.state.edu[<гра>].medals. Тут — лише показ:
       · розділ «Навчання» на екрані 🏆 (по підгрупі на гру, «N з M»);
       · тост «Нова медаль!» з тієї ж черги, що й значки (подія 'bo:eduMedal').
     ⭐ ЗА МЕДАЛІ ТУТ НЕ НАРАХОВУЮТЬСЯ: зірки вже дала сама гра. Див. EDU_REWARD = 0.
     Назва медалі: math — ключ 'edu.math.medal.<x>', решта ігор — ключ = id медалі.
     Умова для закритої медалі: ключ '<ключ назви>.desc', якщо гра його має;
     інакше загальне «Грай у «<гра>», щоб отримати» ('ach.edu.hint').
     Іконки math і world — ті самі, що в іграх; logic/draw/read своїх іконок
     не мають — підібрано тут. Нова медаль у грі = один рядок тут.
     ===================================================================== */
  const EDU_REWARD = 0;          // свідомо: медалі навчання не дають ⭐ в «Нагородах» (гра вже нагородила)
  const EDU_GAMES = ['math', 'draw', 'logic', 'read', 'world'];   // порядок слотів хаба
  const EDU_ICON = { math: '🔢', draw: '✏️', logic: '🧩', read: '🔤', world: '🌍' };
  const EDU_MEDALS = {
    math: [   // edu_math.js MEDALS
      ['edu.math.first', '🎒'], ['edu.math.tasks10', '✏️'], ['edu.math.tasks50', '📘'], ['edu.math.tasks100', '💯'],
      ['edu.math.tasks250', '🧮'], ['edu.math.tasks500', '🎓'], ['edu.math.tasks1000', '🏛️'], ['edu.math.streak10', '🔥'],
      ['edu.math.streak25', '☄️'], ['edu.math.perfect', '✨'], ['edu.math.perfect10', '🌟'], ['edu.math.level5', '🥉'],
      ['edu.math.level10', '🥈'], ['edu.math.level25', '🥇'], ['edu.math.level50', '🏆'], ['edu.math.level100', '👑'],
      ['edu.math.speed20', '⚡'],
    ],
    draw: [   // edu_draw.js MEDALS
      ['edu.draw.mFirst', '🖍️'], ['edu.draw.m10', '🖌️'], ['edu.draw.m50', '🎨'], ['edu.draw.m200', '🖼️'],
      ['edu.draw.mPerfect', '💎'], ['edu.draw.mDigits', '🔢'], ['edu.draw.mLetters', '🔤'], ['edu.draw.mMirror', '🪞'],
      ['edu.draw.mMemory', '📸'], ['edu.draw.mLvl10', '🥉'], ['edu.draw.mLvl25', '🥈'], ['edu.draw.mLvl50', '🥇'],
      ['edu.draw.mLvl100', '👑'], ['edu.draw.mSniper', '🎯'],
    ],
    logic: [  // edu_logic.js finish(): add('…')
      ['edu.logic.mFirst', '💡'], ['edu.logic.m10', '🧩'], ['edu.logic.m50', '🧠'], ['edu.logic.m200', '🦉'],
      ['edu.logic.mSudoku', '🔲'], ['edu.logic.mSudoku9', '🧮'], ['edu.logic.mMemory', '🃏'], ['edu.logic.mPattern10', '🔷'],
      ['edu.logic.mHanoi', '🗼'], ['edu.logic.mLevel10', '🥉'], ['edu.logic.mLevel25', '🥈'], ['edu.logic.mLevel50', '🥇'],
      ['edu.logic.mLevel100', '👑'],
    ],
    read: [   // edu_read.js MEDALS
      ['edu.read.mFirst', '🅰️'], ['edu.read.mStreak', '🔥'], ['edu.read.mLevel5', '📖'], ['edu.read.mSolved', '📚'],
    ],
    world: [  // edu_world.js MEDALS
      ['edu.world.compass', '🧭'], ['edu.world.paw', '🐾'], ['edu.world.globe', '🌐'], ['edu.world.rocket', '🚀'],
    ],
  };
  const EDU_LIST = [];
  EDU_GAMES.forEach(game => EDU_MEDALS[game].forEach(([id, icon]) => EDU_LIST.push({
    id, game, icon, edu: true,
    key: game === 'math' ? 'edu.math.medal.' + id.slice('edu.math.'.length) : id,
  })));
  const eduById = id => EDU_LIST.find(m => m.id === id);
  const EDU_Q = 'edu:';                                        // префікс медалі в спільній черзі state.ach.queue
  const eduGot = m => { const s = S(); const p = s && s.edu && s.edu[m.game]; return !!(p && Array.isArray(p.medals) && p.medals.includes(m.id)); };
  const eduName = m => BO.t(m.key);
  const eduGame = game => BO.t('edu.' + game + '.name');
  function eduCond(m) {
    const k = m.key + '.desc', v = BO.t(k);
    return v !== k ? v : T('edu.hint', { game: eduGame(m.game) });
  }
  function eduGotCount() { return EDU_LIST.filter(eduGot).length; }

  /* ---------- Звідки береться прогрес (s — BO.state) ---------- */
  const N = (s, k) => (s.ach && s.ach.n && s.ach.n[k]) || 0;
  const STATS = {
    feeds:   s => N(s, 'feeds'),
    washes:  s => N(s, 'washes'),
    sleeps:  s => N(s, 'sleeps'),
    heals:   s => N(s, 'heals'),
    games:   s => N(s, 'games'),
    records: s => N(s, 'records'),
    taps:    s => N(s, 'taps'),
    night:   s => N(s, 'night'),
    morning: s => N(s, 'morning'),
    tried:   s => BO.CONFIG.miniGames.filter(g => s.ach && s.ach.played && s.ach.played[g.id]).length,
    best:    s => Math.max(0, ...Object.values(s.bestScores || {}).map(v => +v || 0)),
    friend:  (s, id) => (s.ownedChars || []).includes(id) ? 1 : 0,
    decor:   s => (s.decor && Array.isArray(s.decor.owned)) ? s.decor.owned.length : 0,
    outfit:  s => (N(s, 'outfit') || (s.equipped && s.equipped !== 'none')) ? 1 : 0,
    level:   s => (BO.map && BO.map.opened) ? BO.map.opened() : 0,
    streak:  s => Math.max(s.streak || 0, N(s, 'bestStreak')),
    days:    s => (s.ach && s.ach.days) || 0,
    gold:    s => (s.bonus && s.bonus.gold) || 0,
    bubbles: s => (s.bonus && s.bonus.total) || 0,
  };

  const T = (k, v) => BO.t('ach.' + k, v);
  const S = () => BO.state;
  const byId = id => ACHIEVEMENTS.find(a => a.id === id);
  const today = () => new Date().toDateString();
  const shown = id => { const el = BO.$(id); return !!el && !el.classList.contains('hidden'); };

  /* ---------- стан ---------- */
  function as() {
    const s = S(); if (!s) return null;
    if (!s.ach || typeof s.ach !== 'object') s.ach = {};
    const a = s.ach;
    if (!a.got || typeof a.got !== 'object') a.got = {};
    if (!Array.isArray(a.queue)) a.queue = [];
    if (!a.n || typeof a.n !== 'object') a.n = {};
    if (!a.played || typeof a.played !== 'object') a.played = {};
    if (typeof a.days !== 'number') a.days = 0;
    return a;
  }
  function bump(k, by) { const a = as(); a.n[k] = (a.n[k] || 0) + (by || 1); }

  function progress(ach) {
    const s = S(); if (!s) return 0;
    const [name, arg] = ach.stat.split(':');
    const fn = STATS[name];
    let v = 0;
    try { v = fn ? +fn(s, arg) || 0 : 0; } catch (e) { v = 0; }
    return Math.max(0, Math.min(v, ach.goal));
  }
  function textVars(ach) {
    return { n: ach.goal, name: ach.char ? BO.t('char.' + ach.char + '.name') : '', zone: ach.zone ? BO.t('map.zone.' + ach.zone) : '' };
  }

  // Перевірити всі значки; нові — у чергу свята.
  function check() {
    const a = as(); if (!a) return;
    let changed = false;
    ACHIEVEMENTS.forEach(ach => {
      if (a.got[ach.id]) return;
      if (progress(ach) >= ach.goal) { a.got[ach.id] = Date.now(); a.queue.push(ach.id); changed = true; }
    });
    if (changed) { BO.saveState(); updateNav(); if (isOpen()) renderView(); }
    pump();
  }

  // Новий день — +1 до днів у грі; і найкращий стрік (щоб значок не залежав від сьогоднішнього)
  function countDay() {
    const a = as(); if (!a) return;
    const s = S();
    if (a.lastDay !== today()) {
      a.lastDay = today(); a.days += 1;
      const h = new Date().getHours();
      if (h >= 5 && h < 9) bump('morning');
      BO.saveState();
    }
    if ((s.streak || 0) > (a.n.bestStreak || 0)) a.n.bestStreak = s.streak;
  }

  /* ---------- лічильники: слухаємо кліки, ядро не чіпаємо ----------
     Фаза capture — запам'ятати стан ДО дії, фаза bubble (після обробника ядра) —
     порівняти: рахуємо лише ту дію, що справді щось змінила. */
  let before = null;
  const ACTION_BTNS = ['btnFeed', 'btnWash', 'btnSleep', 'btnHeal'];
  document.addEventListener('click', e => {
    const s = S(); if (!s || !e.target.closest) return;
    const btn = e.target.closest('button');
    if (btn && ACTION_BTNS.includes(btn.id)) {
      before = { id: btn.id, hunger: s.hunger, hygiene: s.hygiene, health: s.health, sleeping: !!s.sleeping };
    } else before = null;
    const g = e.target.closest('#gameMenuGrid .gameMenuItem');
    if (g) {
      const idx = [...g.parentNode.children].indexOf(g);
      const game = BO.CONFIG.miniGames[idx];
      pendingGame = game ? { id: game.id, prevBest: (s.bestScores || {})[game.id] || 0 } : null;
    }
  }, true);
  document.addEventListener('click', e => {
    const s = S(); if (!s || !e.target.closest) return;
    const b = before; before = null;
    if (b) {
      if (b.id === 'btnFeed' && s.hunger > b.hunger) bump('feeds');
      else if (b.id === 'btnWash' && s.hygiene > b.hygiene) bump('washes');
      else if (b.id === 'btnHeal' && s.health > b.health) bump('heals');
      else if (b.id === 'btnSleep' && !b.sleeping && s.sleeping) {
        bump('sleeps');
        const h = new Date().getHours();
        if (h >= 19 && h <= 23) bump('night');
      }
      BO.saveState(); check();
    }
    if (e.target.closest('#pet') && shown('view-main')) { bump('taps'); check(); }
    if (e.target.closest('#wardrobeGrid .wardrobeItem') && s.equipped && s.equipped !== 'none') { bump('outfit'); check(); }
  });

  // Міні-гра: старт — тап по картці в меню; кінець — #view-game знову схований.
  let pendingGame = null;
  // головний екран сховали (відкрили гру, мапу, кімнату…) — тост зі значком прибираємо
  function watchMain() {
    const vm = BO.$('view-main'); if (!vm) return;
    new MutationObserver(() => { if (showing && vm.classList.contains('hidden')) hideToast(); })
      .observe(vm, { attributes: true, attributeFilter: ['class'] });
  }
  // 🎓 тост медалі, показаний на екрані «Навчання», ховаємо, щойно дитина відкрила гру
  function watchEdu(tries) {
    const play = document.querySelector('#view-edu .eduPlay');
    // edu.js будує екран у своєму init — після нашого; кілька спроб, потім здаємось (модуля може не бути)
    if (!play) { if ((tries || 0) < 10) setTimeout(() => watchEdu((tries || 0) + 1), 100); return; }
    new MutationObserver(() => { if (showing && !play.classList.contains('hidden')) hideToast(); else pump(); })
      .observe(play, { attributes: true, attributeFilter: ['class'] });
  }
  function watchGames() {
    const vg = BO.$('view-game'); if (!vg) return;
    let wasOpen = !vg.classList.contains('hidden');
    new MutationObserver(() => {
      const open = !vg.classList.contains('hidden');
      if (wasOpen && !open && pendingGame) {
        const s = S(), a = as();
        bump('games');
        a.played[pendingGame.id] = 1;
        const now = (s.bestScores || {})[pendingGame.id] || 0;
        if (pendingGame.prevBest > 0 && now > pendingGame.prevBest) bump('records');
        pendingGame = null;
        BO.saveState();
        check();
      }
      wasOpen = open;
    }).observe(vg, { attributes: true, attributeFilter: ['class'] });
  }

  /* ---------- свято: тост зі значком, по одному з черги ---------- */
  let toast = null, toastTimer = null, pumpTimer = null, showing = false;
  // головний екран видно, нічим не закритий: не перебиваємо міні-гру, маму, вікна
  function mainFree() {
    return shown('view-main') && !['mamaOverlay', 'eventModal', 'statModal', 'langModal', 'view-game', 'view-hatch'].some(shown)
      && document.visibilityState !== 'hidden';
  }
  // 🎓 медаль навчання можна показати й на екрані «Навчання» — але лише коли гра закрита
  // (#view-edu .eduPlay схована) і поверх нічого не відкрито
  function eduFree() {
    const v = BO.$('view-edu');
    if (!v || v.classList.contains('hidden') || document.visibilityState === 'hidden') return false;
    const play = v.querySelector('.eduPlay');
    return !(play && !play.classList.contains('hidden')) && !['mamaOverlay', 'eventModal', 'statModal', 'langModal'].some(shown);
  }
  const isEduQ = q => typeof q === 'string' && q.indexOf(EDU_Q) === 0;
  // перший елемент черги, який можна показати зараз (значки — лише на вільному головному екрані)
  function nextShowable() {
    const a = as(); if (!a) return -1;
    const main = mainFree(), edu = main || eduFree();
    return a.queue.findIndex(q => isEduQ(q) ? edu : main);
  }
  function pump() {
    const a = as();
    if (showing || !a || !a.queue.length) return;
    clearTimeout(pumpTimer);
    // невелика пауза, щоб не накрити бульбашку від дії; і повторна перевірка, поки черга не порожня
    pumpTimer = setTimeout(() => { if (!showing && nextShowable() >= 0) showNext(); else if (as().queue.length) pump(); }, nextShowable() >= 0 ? 900 : 1500);
  }
  function ensureToast() {
    if (toast && toast.isConnected) return toast;
    toast = document.createElement('div');
    toast.id = 'achToast';
    toast.className = 'hidden';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML =
      '<div class="achConfetti"></div>' +
      '<button type="button" class="achToastCard">' +
        '<span class="achToastBadge"><span class="achToastIcon"></span></span>' +
        '<span class="achToastText"><span class="achToastHead"></span><span class="achToastName"></span><span class="achToastReward"></span></span>' +
      '</button>';
    toast.querySelector('.achToastCard').addEventListener('click', hideToast);
    BO.$('screen').appendChild(toast);
    return toast;
  }
  function showNext() {
    const a = as();
    // невідомі id (старі/зламані записи) — викидаємо
    a.queue = a.queue.filter(q => isEduQ(q) ? !!eduById(q.slice(EDU_Q.length)) : !!byId(q));
    const i = nextShowable();
    if (i < 0) { BO.saveState(); pump(); return; }
    const q = a.queue.splice(i, 1)[0];
    const med = isEduQ(q) ? eduById(q.slice(EDU_Q.length)) : null;
    const ach = med ? null : byId(q);
    showing = true;
    // 🎓 медаль навчання: EDU_REWARD = 0 — зірки за неї вже нарахувала гра, тут не додаємо
    const n = med ? EDU_REWARD : (REWARD[ach.tier] || 0);
    if (n) BO.addPoints(n);
    BO.saveState();
    BO.render();
    const el = ensureToast();
    el.dataset.tier = med ? 'edu' : ach.tier;
    el.querySelector('.achToastIcon').textContent = med ? med.icon : ach.icon;
    el.querySelector('.achToastHead').textContent = med ? T('edu.unlocked') : T('unlocked');
    el.querySelector('.achToastName').textContent = med ? eduName(med) : T(ach.id + '.name', textVars(ach));
    el.querySelector('.achToastReward').textContent = med ? EDU_ICON[med.game] + ' ' + eduGame(med.game) : (n ? T('reward', { n }) : '');
    const conf = el.querySelector('.achConfetti');
    conf.innerHTML = '';
    const COLORS = ['#ffd86b', '#ff7ac6', '#6bffd1', '#4fc3ff', '#b48cff', '#ff9f5a'];
    for (let i = 0; i < 26; i++) {
      const p = document.createElement('i');
      const ang = (i / 26) * Math.PI * 2 + Math.random() * 0.3;
      const r = 70 + Math.random() * 90;
      p.style.setProperty('--dx', (Math.cos(ang) * r).toFixed(0) + 'px');
      p.style.setProperty('--dy', (Math.sin(ang) * r * 0.7 - 30).toFixed(0) + 'px');
      p.style.setProperty('--rot', Math.round(Math.random() * 720 - 360) + 'deg');
      p.style.setProperty('--d', (Math.random() * 0.25).toFixed(2) + 's');
      p.style.background = COLORS[i % COLORS.length];
      if (i % 3 === 0) p.className = 'round';
      conf.appendChild(p);
    }
    el.classList.remove('hidden', 'out');
    void el.offsetWidth;
    el.classList.add('in');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 3800);
  }
  function hideToast() {
    if (!toast || !showing) return;
    clearTimeout(toastTimer);
    toast.classList.remove('in');
    toast.classList.add('out');
    setTimeout(() => {
      toast.classList.add('hidden'); toast.classList.remove('out');
      showing = false;
      pump();
    }, 320);
  }

  /* ---------- кнопка 🏆 у #navRow ---------- */
  let navBtn = null, view = null, detail = null;
  function addNav() {
    const row = BO.$('navRow'); if (!row || BO.$('btnAchieve')) return;
    navBtn = document.createElement('button');
    navBtn.className = 'navBtn achNavBtn';
    navBtn.id = 'btnAchieve';
    navBtn.type = 'button';
    navBtn.innerHTML = '🏆<span></span><b class="achNavDot hidden"></b>';
    navBtn.addEventListener('click', openView);
    // перед вузькою кнопкою звуку, якщо вона є
    const snd = BO.$('btnSound');
    if (snd && snd.parentNode === row) row.insertBefore(navBtn, snd); else row.appendChild(navBtn);
  }
  function updateNav() {
    if (!navBtn) return;
    navBtn.querySelector('span').textContent = T('nav');
    navBtn.setAttribute('aria-label', T('title'));
    // крапка: є нові значки, яких дитина ще не бачила на екрані нагород
    const a = as();
    navBtn.querySelector('.achNavDot').classList.toggle('hidden', !a || gotCount() <= (a.seen || 0));
  }
  // для крапки на 🏆 рахуємо і значки, і медалі навчання
  function gotCount() { const a = as(); return a ? ACHIEVEMENTS.filter(x => a.got[x.id]).length + eduGotCount() : 0; }

  /* ---------- екран нагород ---------- */
  function mountView() {
    view = document.createElement('section');
    view.id = 'view-achieve';
    view.className = 'view hidden';
    view.innerHTML =
      '<div class="achHead">' +
        '<button class="achBack" type="button">←</button>' +
        '<h2 class="achTitle"></h2>' +
        '<div class="achPoints"></div>' +
      '</div>' +
      '<div class="achSummary"><div class="achTotal"></div><div class="achBar"><i></i></div></div>' +
      '<div class="achList"></div>' +
      '<button class="secondaryBtn achBackBottom" type="button"></button>' +
      '<div class="achDetail hidden"><div class="achDetailCard">' +
        '<div class="achDetailBadge"><span></span></div>' +
        '<div class="achDetailTier"></div>' +
        '<div class="achDetailName"></div>' +
        '<div class="achDetailDesc"></div>' +
        '<div class="achDetailProg"><div class="achBar"><i></i></div><span></span></div>' +
        '<div class="achDetailReward"></div>' +
        '<button class="secondaryBtn achDetailClose" type="button"></button>' +
      '</div></div>';
    BO.$('screen').appendChild(view);
    detail = view.querySelector('.achDetail');
    view.querySelector('.achBack').addEventListener('click', closeView);
    view.querySelector('.achBackBottom').addEventListener('click', closeView);
    detail.querySelector('.achDetailClose').addEventListener('click', () => detail.classList.add('hidden'));
    detail.addEventListener('click', e => { if (e.target === detail) detail.classList.add('hidden'); });
    view.querySelector('.achList').addEventListener('click', e => {
      const med = e.target.closest('.achEduCard');
      if (med) return openEduDetail(eduById(med.dataset.edu));
      const card = e.target.closest('.achCard');
      if (card) openDetail(byId(card.dataset.id));
    });
  }
  function isOpen() { return !!view && !view.classList.contains('hidden'); }
  function openView() {
    check();
    as().seen = gotCount(); BO.saveState(); updateNav();
    if (!view) mountView();
    renderView();
    detail.classList.add('hidden');
    BO.openView('view-achieve');
    view.scrollTop = 0;
  }
  function closeView() { if (detail) detail.classList.add('hidden'); BO.backToMain(); }

  function renderView() {
    if (!view) return;
    const a = as();
    const total = ACHIEVEMENTS.length;
    const got = ACHIEVEMENTS.filter(x => a.got[x.id]).length;
    view.querySelector('.achTitle').textContent = T('title');
    view.querySelector('.achPoints').textContent = '⭐ ' + (S().points || 0);
    view.querySelector('.achTotal').textContent = '🏆 ' + T('count', { n: got, total });
    view.querySelector('.achSummary .achBar i').style.width = Math.round(got / total * 100) + '%';
    view.querySelector('.achBackBottom').textContent = T('back');
    view.querySelector('.achBack').setAttribute('aria-label', T('back'));   // стрілка «←» без слів — назва для екранних читачів
    detail.querySelector('.achDetailClose').textContent = T('ok');
    let html = '';
    CATS.forEach(cat => {
      const list = ACHIEVEMENTS.filter(x => x.cat === cat);
      if (!list.length) return;
      const g = list.filter(x => a.got[x.id]).length;
      html += '<div class="achGroup"><div class="achGroupHead"><span class="achGroupName">' + esc(T('cat.' + cat)) +
        '</span><span class="achGroupCount">' + g + '/' + list.length + '</span></div><div class="achGrid">';
      list.forEach(x => {
        const done = !!a.got[x.id];
        const hide = x.secret && !done;
        const p = progress(x);
        const name = hide ? T('secret') : T(x.id + '.name', textVars(x));
        html += '<button type="button" class="achCard t-' + x.tier + (done ? ' done' : ' locked') + '" data-id="' + x.id + '">' +
          '<span class="achBadge"><span class="achIcon">' + (hide ? '❔' : x.icon) + '</span></span>' +
          '<span class="achName">' + esc(name) + '</span>' +
          (done ? '<span class="achDone">✓</span>'
                : '<span class="achProg"><span class="achBar"><i style="width:' + Math.round(p / x.goal * 100) + '%"></i></span>' +
                  '<span class="achNum">' + (hide ? '?' : p + '/' + x.goal) + '</span></span>') +
          '</button>';
      });
      html += '</div></div>';
    });
    html += eduSectionHtml();
    view.querySelector('.achList').innerHTML = html;
  }

  /* ---------- 🎓 розділ «Навчання» на екрані нагород ---------- */
  function eduSectionHtml() {
    const got = eduGotCount();
    let html = '<div class="achGroup achEduGroup"><div class="achGroupHead"><span class="achGroupName">🎓 ' + esc(T('cat.edu')) +
      '</span><span class="achGroupCount achEduTotal">' + esc(T('count', { n: got, total: EDU_LIST.length })) + '</span></div>';
    EDU_GAMES.forEach(game => {
      const list = EDU_LIST.filter(m => m.game === game);
      const g = list.filter(eduGot).length;
      html += '<div class="achEduSub" data-game="' + game + '"><div class="achEduSubHead"><span class="achEduSubName">' +
        EDU_ICON[game] + ' ' + esc(eduGame(game)) + '</span><span class="achGroupCount">' + esc(T('count', { n: g, total: list.length })) +
        '</span></div><div class="achGrid">';
      list.forEach(m => {
        const done = eduGot(m), name = eduName(m);
        html += '<button type="button" class="achEduCard' + (done ? ' done' : ' locked') + '" data-edu="' + m.id + '" aria-label="' +
          esc(name + (done ? ' ✓' : ' — ' + eduCond(m))) + '">' +
          '<span class="achBadge"><span class="achIcon">' + m.icon + '</span></span>' +
          '<span class="achName">' + esc(name) + '</span>' +
          '<span class="achDone">' + (done ? '✓' : '🔒') + '</span></button>';
      });
      html += '</div></div>';
    });
    return html + '</div>';
  }
  function openEduDetail(m) {
    if (!m) return;
    const done = eduGot(m);
    const card = detail.querySelector('.achDetailCard');
    card.className = 'achDetailCard t-edu edu' + (done ? ' done' : ' locked');
    card.querySelector('.achDetailBadge span').textContent = m.icon;
    card.querySelector('.achDetailTier').textContent = EDU_ICON[m.game] + ' ' + eduGame(m.game);
    card.querySelector('.achDetailName').textContent = eduName(m);
    card.querySelector('.achDetailDesc').textContent = done ? '' : eduCond(m);
    card.querySelector('.achDetailProg span').textContent = done ? T('done') : '';
    card.querySelector('.achDetailReward').textContent = '';   // ⭐ за медаль дала гра — тут нічого не обіцяємо
    detail.classList.remove('hidden');
  }

  // гра видала медаль → у спільну чергу свята (покажеться, коли дитина вийде з гри)
  document.addEventListener('bo:eduMedal', e => {
    const d = e.detail || {}, m = eduById(d.medal);
    const a = as(); if (!m || !a) return;
    const q = EDU_Q + m.id;
    if (!a.queue.includes(q)) a.queue.push(q);
    BO.saveState(); updateNav(); if (isOpen()) renderView();
    pump();
  });
  function openDetail(x) {
    if (!x) return;
    const a = as();
    const done = !!a.got[x.id], hide = x.secret && !done, p = progress(x);
    const card = detail.querySelector('.achDetailCard');
    card.className = 'achDetailCard t-' + x.tier + (done ? ' done' : ' locked');
    card.querySelector('.achDetailBadge span').textContent = hide ? '❔' : x.icon;
    card.querySelector('.achDetailTier').textContent = T('tier.' + x.tier);
    card.querySelector('.achDetailName').textContent = hide ? T('secret') : T(x.id + '.name', textVars(x));
    card.querySelector('.achDetailDesc').textContent = T(x.id + '.desc', textVars(x));
    const prog = card.querySelector('.achDetailProg');
    prog.querySelector('i').style.width = Math.round(p / x.goal * 100) + '%';
    prog.querySelector('span').textContent = done ? T('done') : (hide ? T('secretHint') : p + '/' + x.goal);
    card.querySelector('.achDetailReward').textContent = done ? T('earned', { n: REWARD[x.tier] }) : T('reward', { n: REWARD[x.tier] });
    detail.classList.remove('hidden');
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  /* ---------- хуки ---------- */
  BO.on('init', () => {
    as();
    countDay();
    addNav();
    updateNav();
    watchGames();
    watchMain();
    watchEdu();
    BO.saveState();
    check();
  });
  BO.on('render', () => { if (S()) pump(); });
  BO.on('tick', () => { if (!S()) return; countDay(); check(); });
  BO.on('points', () => { if (S() && S().ach) setTimeout(check, 0); });
  BO.on('lang', () => { updateNav(); if (isOpen()) renderView(); });

  // для тестів і налагодження
  BO.ach = { list: ACHIEVEMENTS, STATS, REWARD, check, progress, open: openView, get queue() { return as().queue.slice(); },
    edu: { list: EDU_LIST, games: EDU_GAMES, REWARD: EDU_REWARD, got: eduGotCount } };
})();
