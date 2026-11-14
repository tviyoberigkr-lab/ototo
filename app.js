/* OTOTO — тамагочі-компаньйон. Один файл логіки, без залежностей, без інтернету, без сервера.
   Все, що варто крутити без переписування коду, винесено в CONFIG нижче.
   Усі тексти, які бачить дитина, лежать у мовних файлах lang/<код>.js і беруться
   функцією t('ключ'). У цьому файлі текстів для дитини немає — лише ключі.
   Каталог країн — countries.js. */

const SAVE_KEY = 'bo_save_v2';
const DEFAULT_PERSONA = 'bo';
let selectedPersona = DEFAULT_PERSONA;

const CONFIG = {
  // швидкість деградації шкал: одиниць на годину реального часу
  decay: { hunger: 4, mood: 2.2, energy: 1.6, hygiene: 3 },

  sleep: { energyRecoveryPerHour: 6, hungerDecayFactor: 0.3, hygieneDecayFactor: 0.5, autoWakeEnergy: 95 },

  // Скільки енергії забирає ОДИН раунд міні-гри. Було 12 — це занадто дорого:
  // 5-7 раундів (кілька хвилин активної гри) з'їдали всю шкалу 0-100, і дитина
  // впиралась у "йди спати" за пару хвилин замість очікуваної ~години активної гри.
  // 4 дає приблизно 15-16 раундів запасу на одній "зарядці" енергії.
  miniGameEnergyCost: 4,

  // здоров'я падає тільки якщо голод/гігієна довго критичні — м'який механізм, без "смерті"
  health: {
    criticalThreshold: 15,      // hunger/hygiene нижче цього вважаються "критичними"
    decayPerHourWhenNeglected: 5,
    recoveryPerHourWhenOk: 2,
    sickBelow: 35,               // якщо health падає нижче — persona "захворіла"
  },

  // Легка занедбаність: 1-2 шкали низькі, але ще не критично — грати можна,
  // просто показуємо сумний вигляд і підказку. Жодного штрафу, тільки нагадування.
  neglect: {
    mildHungerBelow: 25,
    mildHygieneBelow: 25,
    mildEnergyBelow: 20,
    mildMoodBelow: 25,
  },

  // Дуже довга відсутність (застосунок не відкривали багато годин/днів):
  // замість того щоб "докручувати" занедбаність до хворобливого стану,
  // persona переходить у "режим сну в очікуванні" — при поверненні дитини
  // всі шкали м'яко підтягуються до безпечного рівня, прогрес (стадія,
  // гардероб, стрік-досягнення) не втрачається. Тільки denний стрік
  // перерветься природним шляхом через updateStreak() — це єдине, що "згорає".
  longAbsence: {
    hibernateAfterHours: 48,
    returnStats: { hunger: 55, mood: 60, energy: 70, hygiene: 55, health: 65 },
  },

  stages: [
    // Персонажа видно з першої секунди; стадія визначає його розмір на екрані (scale).
    // Назва стадії — у мовному файлі: ключ 'stage.<key>'.
    { key: 'egg',   scale: 0.62, minDays: 0 },
    { key: 'baby',  scale: 0.72, minDays: 1 },
    { key: 'kid',   scale: 0.82, minDays: 4 },
    { key: 'teen',  scale: 0.92, minDays: 9 },
    { key: 'adult', scale: 1.0,  minDays: 16 },
  ],
  sickEmoji: '🤒',

  /* ---------- Народження Сяйка: яйце-ореол ----------
     Показується ОДИН раз, тільки на самому старті (перший персонаж завжди
     Сяйко). Дитина тапає яйце 10 разів — кожен поріг додає новий клас у
     style.css (блимання → тремор → трясіння → тріщини → розкриття). */
  hatch: { tapsToHatch: 10 },

  /* ---------- Мама: один образ, 15 "хореографій" появи ----------
     Один SVG-малюнок мами (у index.html) рухається по-різному щоразу:
     нахил, підскок, тривалість і частинки різні — для дитини це виглядає
     як 15 різних появ, хоча малюнок один (дешевше за 15 окремих сцен).
     Обираються по черзі (0→14→0), не випадково — жодна не повторюється
     підряд. Підпис до кожної — у мовному файлі, ключ 'mama.<номер>'.
     Мама прив'язана виключно до Сяйка (він — єдиний, хто
     "народжується" з яйця; решта персонажів розблоковуються за бали). */
  mamaChoreographies: [
    { tilt: 6,  bounce: 10, dur: 1.6, particle: '💛' },
    { tilt: -8, bounce: 14, dur: 1.9, particle: '✨' },
    { tilt: 10, bounce: 8,  dur: 1.4, particle: '💕' },
    { tilt: -5, bounce: 16, dur: 2.0, particle: '🌟' },
    { tilt: 4,  bounce: 12, dur: 1.7, particle: '💫' },
    { tilt: -9, bounce: 9,  dur: 1.5, particle: '💛' },
    { tilt: 8,  bounce: 15, dur: 1.8, particle: '💕' },
    { tilt: -6, bounce: 11, dur: 1.6, particle: '✨' },
    { tilt: 5,  bounce: 13, dur: 1.9, particle: '🌟' },
    { tilt: -7, bounce: 10, dur: 1.5, particle: '💫' },
    { tilt: 9,  bounce: 14, dur: 1.7, particle: '💛' },
    { tilt: -4, bounce: 9,  dur: 1.4, particle: '💕' },
    { tilt: 7,  bounce: 16, dur: 2.0, particle: '✨' },
    { tilt: -10,bounce: 12, dur: 1.8, particle: '🌟' },
    { tilt: 6,  bounce: 11, dur: 1.6, particle: '💫' },
  ],

  personas: {
    mimi: { label: 'mimi', pronounSubj: 'вона', theme: 'theme-mimi', pickEmoji: '🌸' },
    bo:   { label: 'bo',   pronounSubj: 'він',  theme: 'theme-bo',   pickEmoji: '⚡' },
  },

  /* ---------- Гардероб: каталог, не хардкод ----------
     Кожен предмет — один запис з полем unlock.type. Щоб додати новий предмет:
     1) додай один об'єкт у цей масив (не чіпай нічого іншого)
     2) якщо unlock.type вже існує (free / streak / minigame / seasonal) — усе,
        жодного коду більше не треба, гра підхопить предмет автоматично.
     Новий ТИП розблокування (не з переліку нижче) — єдиний випадок, коли треба
     дописати одну гілку в isWardrobeUnlocked(). Самі предмети це ніколи не чіпає.

     Типи, які вже підтримані:
       free      — доступно одразу
       streak    — { value: N } — від N днів стрику поспіль
       minigame  — { game: 'tap'|'memory'|'catch', scoreThreshold: N } — нагорода за
                   результат у конкретній міні-грі; грант ставиться автоматично
                   в grantMinigameRewards(), без ручного втручання
       seasonal  — { from: 'YYYY-MM-DD', until: 'YYYY-MM-DD' } — предмет видимий
                   у гардеробі тільки в цьому проміжку дат, поза ним — ховається сам
       premium   — { product: 'ototo.pack.…' } — з платного набору (shop.js). Дитині
                   показується з замочком; тап — лише лагідне пояснення, НЕ магазин.
  */
  // Назва предмета — у мовному файлі, ключ 'wardrobe.<id>'.
  // place — де саме сидить аксесуар на зображенні персонажа (зсув від
  // стандартного top:-14px/right:-6px + кут повороту). Без поля — старі
  // стандартні координати (підходить для того, що просто "зверху").
  // gender — 'girl' | 'boy' | 'any'. Фільтрується у гардеробі за персоною
  // (mimi → girl, bo → boy); 'any' видно завжди обом.
  // hue — необов'язковий колірний зсув того самого emoji (filter: hue-rotate),
  // щоб мати "кілька кольорів" одного предмета без нових малюнків.
  wardrobe: [
    { id: 'none',       emoji: '',   gender: 'any', unlock: { type: 'free' } },
    { id: 'bow_pink',   emoji: '🎀', gender: 'girl', unlock: { type: 'streak', value: 2 },  place: { top: -8, right: 10, rotate: -20 } },
    { id: 'bow_purple', emoji: '🎀', gender: 'girl', unlock: { type: 'streak', value: 6 },  place: { top: -8, right: 10, rotate: -20 }, hue: 260 },
    { id: 'cap_red',    emoji: '🧢', gender: 'boy', unlock: { type: 'streak', value: 3 },  place: { top: -18, right: -2, rotate: 0 } },
    { id: 'cap_blue',   emoji: '🧢', gender: 'boy', unlock: { type: 'streak', value: 5 },  place: { top: -18, right: -2, rotate: 0 }, hue: 200 },
    { id: 'cap_green',  emoji: '🧢', gender: 'boy', unlock: { type: 'streak', value: 8 },  place: { top: -18, right: -2, rotate: 0 }, hue: 100 },
    { id: 'helmet',     emoji: '⛑️', gender: 'boy', unlock: { type: 'streak', value: 11 }, place: { top: -18, right: -2, rotate: 0 } },
    { id: 'glasses',    emoji: '🕶️', gender: 'any', unlock: { type: 'streak', value: 7 } },
    { id: 'crown',      emoji: '👑', gender: 'any', unlock: { type: 'streak', value: 14 }, place: { top: -20, right: -2, rotate: 0 } },
    { id: 'medal_tap',  emoji: '🥇', gender: 'any', unlock: { type: 'minigame', game: 'tap', scoreThreshold: 8 } },
    { id: 'hat_santa',  emoji: '🎅', gender: 'any', unlock: { type: 'seasonal', from: '2026-12-01', until: '2027-01-10' }, place: { top: -20, right: -2, rotate: 0 } },
    // premium — з набору «Модний гардероб» (shop.js, покупка лише через батьківський замок).
    // Безкоштовні речі вище НЕ чіпаємо: старі збереження нічого не втрачають.
    { id: 'goggles',     emoji: '🥽', gender: 'any',  unlock: { type: 'premium', product: 'ototo.pack.outfits1' }, place: { top: -16, right: -2, rotate: 0 } },
    { id: 'grad_cap',    emoji: '🎓', gender: 'any',  unlock: { type: 'premium', product: 'ototo.pack.outfits1' }, place: { top: -20, right: -2, rotate: 0 } },
    { id: 'headphones',  emoji: '🎧', gender: 'any',  unlock: { type: 'premium', product: 'ototo.pack.outfits1' }, place: { top: -16, right: -2, rotate: 0 } },
    { id: 'star_clip',   emoji: '🌟', gender: 'any',  unlock: { type: 'premium', product: 'ototo.pack.outfits1' }, place: { top: -8, right: 10, rotate: -20 } },
    { id: 'flower_clip', emoji: '🌺', gender: 'girl', unlock: { type: 'premium', product: 'ototo.pack.outfits1' }, place: { top: -8, right: 10, rotate: -20 } },
    { id: 'butterfly',   emoji: '🦋', gender: 'girl', unlock: { type: 'premium', product: 'ototo.pack.outfits1' }, place: { top: -10, right: 8, rotate: -15 } },
  ],

  // випадкові "флейвор" події — не впливають критично на геймплей, тримають цікавість
  randomEvents: {
    checkChancePerTick: 0.10, // шанс при кожному тіку (раз на 30с) що взагалі перевіряємо подію
    pool: [
      // текст події — у мовному файлі, ключ 'event.<id>'
      { id: 'gift',    weight: 2, emoji: '🎁', effect: s => { s.mood = clamp(s.mood + 10); } },
      { id: 'trick',   weight: 2, emoji: '✨', effect: () => {} },
      { id: 'friend',  weight: 1, emoji: '🦋', effect: () => {} },
      { id: 'weather', weight: 1, emoji: '🌦️', effect: () => {} },
    ],
  },

  /* ---------- Персонажі: каталог, порядкова шкала ----------
     Відкриваються СТРОГО по черзі: наступного можна купити за бали, тільки
     коли попередній уже відкритий. Перший (price: 0) — стартовий.
     Щоб додати нового персонажа: покласти картинку в img/ і додати один рядок
     у кінець масиву. Більше нічого міняти не треба.
     premium: 'ototo.pack.…' — друг із платного набору (shop.js): за зірки не
     купується, відкривається покупкою батьків (поза чергою). Зараз жоден із 5
     друзів НЕ преміум — набір друзів з'явиться разом із новими малюнками. */
  characters: [
    // ім'я і підпис — у мовному файлі: 'char.<id>.name', 'char.<id>.title'
    { id: 'gecko',    img: 'img/gecko.png',    price: 0 },
    { id: 'mushroom', img: 'img/mushroom.png', price: 150 },
    { id: 'robot',    img: 'img/robot.png',    price: 400 },
    { id: 'whale',    img: 'img/whale.png',    price: 800 },
    { id: 'cactus',   img: 'img/cactus.png',   price: 1500 },
  ],

  /* ---------- Бали (внутрішня валюта, тільки зароблена грою, НЕ за гроші) ----------
     Розрахунок: раунд міні-гри дає ~10-25 балів, за день активної гри ~200-300.
     Грибочок — у перший же день, робот — 2-3 день, кит — ~5 день, кактус — ~10-12 день. */
  points: {
    perGameScore: 1,      // 1 очко в міні-грі = 1 бал
    newRecordBonus: 5,    // бонус за побитий рекорд
    careAction: 1,        // за догляд — тільки якщо шкала справді була потрібна (<70), щоб не "фармили" тапами
    careNeededBelow: 70,
    healAction: 3,
    dailyVisit: 10,       // перший візит за день
    streakBonusPerDay: 2, // + за кожен день стрику, максимум 7 днів
    energyRefillCost: 20,  // заповнити шкалу енергії повністю (1-й раз у грі — безкоштовно)
    streakShieldCost: 25,  // захистити стрік на 1 пропущений день (1-й раз у грі — безкоштовно)
  },

  /* ---------- Міні-ігри: каталог, не хардкод ----------
     Той самий принцип, що й у гардеробі. Щоб додати нову гру:
     1) написати функцію-реалізацію (напр. startBalloonGame(area))
     2) додати один рядок сюди: { id: 'balloon', icon: '🎈' } + назву й підказку
        в КОЖЕН мовний файл: 'game.balloon' і 'game.balloon.prompt'
     3) додати один рядок у GAME_RUNNERS нижче: balloon: startBalloonGame
     Жодного іншого коду (диспетчер startMiniGame) чіпати не треба.
     Складність усередині кожної гри росте без жорсткої стелі (інтервал
     скорочується з кожним очком, до мінімальної межі) — дитина не "добиває"
     гру за хвилину, а прогресує настільки, наскільки встигає. */
  miniGames: [
    { id: 'tap',       icon: '🎯' },
    { id: 'memory',    icon: '🍓' },
    { id: 'catch',     icon: '🍬' },
    { id: 'hidden',    icon: '🔍' },
    { id: 'balloon',   icon: '🎈' },
    { id: 'count',     icon: '👏' },
    { id: 'bigger',    icon: '📏' },
    { id: 'direction', icon: '🧭' },
    { id: 'odd',       icon: '🧩' },
    { id: 'shrink',    icon: '⭕' },
    { id: 'dodge',     icon: '🛤️' },
    { id: 'color',     icon: '🎨' },
    { id: 'rhythm',    icon: '🫧' },
    { id: 'numbers',   icon: '🔢' },
    { id: 'mood',      icon: '🙂' },
  ],
};

function clamp(v) { return Math.max(0, Math.min(100, v)); }
const $ = (id) => document.getElementById(id);

/* ---------- Мови і переклад ----------
   t('ключ', {змінні}) — повертає текст мовою дитини. Якщо для цієї мови ще
   немає перекладу (немає файлу або ключа) — англійською, далі українською.
   Значення { m, f } обирається за статтю персонажа (bo — m, mimi — f). */
let pendingLang = null;      // мова під час активації, до створення збереження
let pendingCountry = null;

function detectLang() {
  const full = (navigator.language || 'en').toLowerCase();
  const nav = full.slice(0, 2);
  if (nav === 'ru' || nav === 'be') return 'en'; // російської/білоруської в грі немає
  // регіональний варіант мови (pt-BR → lang/pt-BR.js), якщо такий файл є
  const regional = Object.keys(window.BO_LANG || {}).find(k => k.includes('-') && k.toLowerCase() === full);
  if (regional) return regional;
  return (window.BO_LANG && window.BO_LANG[nav]) ? nav : 'en';
}
function curLang() { return (state && state.lang) || pendingLang || detectLang(); }
function langReady(code) { return !!(window.BO_LANG && window.BO_LANG[code]); }
function isFemale() { return ((state && state.persona) || selectedPersona) === 'mimi'; }

function t(key, vars) {
  const L = window.BO_LANG || {};
  let v = (L[curLang()] || {})[key];
  if (v === undefined) v = (L.en || {})[key];
  if (v === undefined) v = (L.uk || {})[key];
  if (v === undefined) return key;
  if (typeof v === 'object') v = isFemale() ? v.f : v.m;
  return v.replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined) ? vars[k] : m);
}
// форма множини: 1 день / 2 дні / 5 днів (правила кожної мови — вбудовані в браузер)
function tPlural(base, n) {
  let form = 'other';
  // pt — це португальська Португалії: 'pt' у браузері = бразильські правила (0 → «one»), а pt-PT дає «0 dias».
  // pt-BR теж бере pt-PT: у шкільній нормі Бразилії «zero dias», а не «0 dia».
  const pl = langReady(curLang()) ? curLang() : 'en';
  try { form = new Intl.PluralRules(pl === 'pt' || pl === 'pt-BR' ? 'pt-PT' : pl).select(n); } catch (e) {}
  const key = base + '.' + form;
  const v = t(key, { n });
  return v === key ? t(base + '.other', { n }) : v;
}
function charName(id) { return (state && state.charNames && state.charNames[id]) || t('char.' + id + '.name'); }

// Розставляє тексти в HTML: data-i18n (текст), data-i18n-ph (placeholder), data-i18n-title.
function applyI18n() {
  document.documentElement.lang = langReady(curLang()) ? curLang() : 'en';
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  const inp = $('petNameInput');
  if (inp) inp.placeholder = t('start.namePlaceholder', { name: t('char.gecko.name') });
  if (state) runHooks('lang');
}

/* ---------- Модулі (декор, мапа, бонуси …) ----------
   Кожен великий блок гри — окремий файл (decor.js, map.js, bonus.js …), що
   підключається в index.html ПІСЛЯ app.js і реєструється так:
     BO.on('init',   () => { ... })   // один раз, коли є збереження і видно головний екран
     BO.on('render', () => { ... })   // після кожного оновлення головного екрана
     BO.on('tick',   () => { ... })   // раз на 30 с
     BO.on('points', n  => { ... })   // нараховано/списано n балів
     BO.on('lang',   () => { ... })   // дитина змінила мову
   Модуль сам додає свою кнопку в #navRow і свій екран (section.view) у #screen.
   Ядро (цей файл) модулі не правлять. */
const BO_HOOKS = {};
let modulesBooted = false;
function runHooks(name, arg) {
  (BO_HOOKS[name] || []).forEach(fn => { try { fn(arg); } catch (e) { console.error('[module ' + name + ']', e); } });
}
window.BO = {
  on(name, fn) { (BO_HOOKS[name] = BO_HOOKS[name] || []).push(fn); },
  get state() { return state; },
  CONFIG, t, tPlural, $, saveState, render, addPoints, showBubble, showEventModal,
  isFemale, charName, activeCharacter: () => activeCharacter(),
  openView(id) { document.querySelectorAll('#screen > .view').forEach(v => v.classList.add('hidden')); $(id).classList.remove('hidden'); },
  backToMain() { document.querySelectorAll('#screen > .view').forEach(v => v.classList.add('hidden')); $('view-main').classList.remove('hidden'); render(); },
};

let state = loadState();
if (state && !state.unlockedItems) state.unlockedItems = [];
if (state && !state.bestScores) state.bestScores = {}; // міграція старих збережень без цього поля
if (state && state.points === undefined) {
  state.points = 0; state.ownedChars = ['gecko']; state.activeChar = 'gecko';
  state.charNames = { gecko: state.name };
}
// Міграція старих збережень без сцени народження/мами: такий гравець уже
// "народився" раніше (яйця не було в грі), сцену яйця йому не показуємо.
if (state && state.hatched === undefined) {
  state.hatched = true;
  state.mamaIndex = 0;
  state.lastMamaDay = null;
  state.lastSeenStage = currentStage().key;
}
// Старі збереження, створені до вибору країни: гра була українською.
if (state && !state.lang) { state.lang = 'uk'; state.country = 'ua'; }
if (state && state.energyRefillUsed === undefined) {
  state.energyRefillUsed = false;
  state.streakShieldUsed = false;
  state.streakShieldActive = false;
}
let gameType = null;
let gameTimer = null;
let gameScore = 0;
let gameTargetTimeout = null;
let fallSpawnTimer = null;
let matchRoundTimeout = null;
let balloonSpawnTimer = null;

function loadState() {
  try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; }
  catch (e) { return null; }
}
function saveState() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }

function defaultState(persona, name, country, lang) {
  return {
    persona, name,
    country,             // код країни з countries.js — обирається один раз при активації
    lang,                // мова гри (за замовчуванням — перша мова країни; можна змінити)
    bornAt: Date.now(), lastTick: Date.now(),
    hunger: 80, mood: 80, energy: 80, hygiene: 80, health: 100,
    sick: false,
    streak: 0, lastVisitDay: null,
    sleeping: false,
    equipped: 'none',
    unlockedItems: [],
    bestScores: {},
    points: 0,
    ownedChars: ['gecko'],
    activeChar: 'gecko',
    charNames: { gecko: name }, // ім'я, яке дитина дала стартовому; решта — з каталогу
    hatched: false,      // чи вже пройшла сцена яйця-народження
    mamaIndex: 0,        // яку з 15 хореографій мами показати наступного разу
    lastMamaDay: null,   // дата останньої щоденної сцени з мамою
    lastSeenStage: 'egg',// для визначення "дитина щойно виросла на новий етап"
    energyRefillUsed: false,  // чи вже використано безкоштовне заповнення енергії
    streakShieldUsed: false,  // чи вже використано безкоштовний захист стрику
    streakShieldActive: false,// щит активний прямо зараз (згорає на наступному пропущеному дні)
  };
}

function daysAlive() { return Math.floor((Date.now() - state.bornAt) / 86400000); }
function currentStage() {
  const d = daysAlive(); let s = CONFIG.stages[0];
  for (const st of CONFIG.stages) if (d >= st.minDays) s = st;
  return s;
}
function persona() { return CONFIG.personas[state.persona] || CONFIG.personas.mimi; }

function applyOfflineDecay() {
  if (!state) return false;
  const now = Date.now();
  const hours = (now - state.lastTick) / 3600000;
  if (hours <= 0) return false;

  // Дуже довга відсутність — не докручуємо занедбаність, а лагідно
  // "пробуджуємо" persona з безпечними показниками. Прогрес не втрачається.
  if (hours >= CONFIG.longAbsence.hibernateAfterHours) {
    const r = CONFIG.longAbsence.returnStats;
    state.hunger = r.hunger; state.mood = r.mood; state.energy = r.energy;
    state.hygiene = r.hygiene; state.health = r.health;
    state.sick = false;
    state.sleeping = false;
    state.lastTick = now;
    return true; // сигнал показати "я тебе чекав(ла)!"
  }

  const d = CONFIG.decay;
  if (!state.sleeping) {
    state.hunger  = clamp(state.hunger  - d.hunger  * hours);
    state.mood    = clamp(state.mood    - d.mood    * hours);
    state.energy  = clamp(state.energy  - d.energy  * hours);
    state.hygiene = clamp(state.hygiene - d.hygiene * hours);
  } else {
    state.energy  = clamp(state.energy  + CONFIG.sleep.energyRecoveryPerHour * hours);
    state.hunger  = clamp(state.hunger  - d.hunger  * CONFIG.sleep.hungerDecayFactor  * hours);
    state.hygiene = clamp(state.hygiene - d.hygiene * CONFIG.sleep.hygieneDecayFactor * hours);
    if (state.energy >= CONFIG.sleep.autoWakeEnergy) state.sleeping = false;
  }

  const h = CONFIG.health;
  const neglected = state.hunger < h.criticalThreshold || state.hygiene < h.criticalThreshold;
  state.health = neglected
    ? clamp(state.health - h.decayPerHourWhenNeglected * hours)
    : clamp(state.health + h.recoveryPerHourWhenOk * hours);
  state.sick = state.health < h.sickBelow;

  state.lastTick = now;
  return false;
}

// Легка занедбаність (не хворий, не спить, але 1+ шкала низька) — лише
// сумний вигляд і підказка в render(), без жодного штрафу чи блокування.
function isMildlyNeglected() {
  if (state.sick || state.sleeping) return false;
  const n = CONFIG.neglect;
  return state.hunger < n.mildHungerBelow || state.hygiene < n.mildHygieneBelow ||
         state.energy < n.mildEnergyBelow || state.mood < n.mildMoodBelow;
}

function updateStreak() {
  const today = new Date().toDateString();
  if (state.lastVisitDay === today) return;
  const y = new Date(Date.now() - 86400000).toDateString();
  if (state.lastVisitDay === y) {
    state.streak += 1;
  } else if (!state.streak) {
    state.streak = 1;
  }
  // Пропущений день серію НЕ обнуляє — вона лише «чекає» (м'яка механіка для дітей,
  // орієнтир — настанови ЄС щодо захисту неповнолітніх онлайн). Щит більше не потрібен.
  state.streakShieldActive = false;
  state.lastVisitDay = today;
  const P = CONFIG.points;
  if (state.points !== undefined) addPoints(P.dailyVisit + Math.min(state.streak, 7) * P.streakBonusPerDay);
}

/* ---------- Мама: одна сцена-оверлей, 15 хореографій по черзі ---------- */

function nextMamaChoreo() {
  const list = CONFIG.mamaChoreographies;
  const ch = list[state.mamaIndex % list.length];
  state.mamaIndex = (state.mamaIndex + 1) % list.length;
  return ch;
}

function spawnMamaParticles(emoji) {
  const host = $('mamaHearts'); host.innerHTML = '';
  const boxW = $('mamaBox').offsetWidth || 260;
  for (let i = 0; i < 6; i++) {
    const span = document.createElement('span');
    span.className = 'mamaParticle';
    span.textContent = emoji;
    // Частинки з'являються там, де мама й малий дивляться одне на одного (там вони
    // зустрічаються), а не по всій ширині локації.
    span.style.left = (boxW * 0.40 + Math.random() * boxW * 0.30) + 'px'; // між мордочкою мами і малим
    span.style.bottom = '6px';
    span.style.animationDelay = (Math.random() * 0.9).toFixed(2) + 's';
    span.style.animationDuration = (1.4 + Math.random() * 0.8).toFixed(2) + 's';
    host.appendChild(span);
  }
}

function spawnDustPuffs(rightPercent) {
  const host = $('mamaHearts');
  for (let i = 0; i < 3; i++) {
    const span = document.createElement('span');
    span.className = 'dustParticle';
    span.style.right = (rightPercent + Math.random() * 6) + '%';
    span.style.animationDelay = (i * 0.08).toFixed(2) + 's';
    span.textContent = '💨';
    host.appendChild(span);
    setTimeout(() => span.remove(), 900);
  }
}

// context: 'birth' | 'daily' | 'growth' | 'reunion' — тільки для підпису,
// хореографія й частинки завжди йдуть по черзі з того ж пулу CONFIG.mamaChoreographies.
// Сцена — окрема "локація": мама й малий спочатку поруч, тулиться одне до
// одного, а за кілька секунд праворуч починає блимати підказка. Дитина тапає
// саме туди — малюк біжить у той бік екрана, і тільки після того, як добіг,
// гра переходить далі (на звичний екран тамагочі).
function showMamaScene(context) {
  const ch = nextMamaChoreo();
  const box = $('mamaBox');
  box.style.setProperty('--mamaTilt', ch.tilt + 'deg');
  box.style.setProperty('--mamaBounce', ch.bounce + 'px');
  $('mamaSvg').style.animationDuration = ch.dur + 's';

  const baby = $('mamaBabyImg');
  baby.setAttribute('src', activeCharacter().img);
  baby.classList.remove('running');
  spawnMamaParticles(ch.particle);

  const idx = (state.mamaIndex + CONFIG.mamaChoreographies.length - 1) % CONFIG.mamaChoreographies.length;
  let caption = t('mama.' + idx, { name: state.name });
  if (context === 'birth') caption = t('mama.birth', { name: state.name });
  else if (context === 'reunion') caption = t('mama.reunion', { name: state.name });
  $('mamaCaption').textContent = caption;

  $('mamaOverlay').classList.remove('hidden');
  // Підказка біжи-сюди з'являється не одразу — спершу дитина секунду просто
  // дивиться на маму з малим, потім праворуч починає блимати "👉 біжи сюди".
  const hint = $('mamaTapHint');
  hint.classList.add('hidden-hint');
  hint.textContent = t('mama.run');
  clearTimeout(showMamaScene._hintT);
  showMamaScene._hintT = setTimeout(() => hint.classList.remove('hidden-hint'), 1300);
  saveState();
}

// Тап по підказці: малюк біжить у правий бік сцени, і лише коли дістався —
// сцена закривається й гра переходить на наступний екран.
function onMamaRunHintTap() {
  const hint = $('mamaTapHint');
  if (hint.classList.contains('hidden-hint')) return; // ще не з'явилась — рано
  hint.classList.add('hidden-hint');
  const baby = $('mamaBabyImg');
  spawnDustPuffs(55);
  baby.classList.add('running');
  clearTimeout(onMamaRunHintTap._doneT);
  onMamaRunHintTap._doneT = setTimeout(hideMamaScene, 1500); // спокійніший біг малого (анімація в anim.js)
}

function hideMamaScene() {
  $('mamaOverlay').classList.add('hidden');
  clearTimeout(showMamaScene._hintT);
  clearTimeout(onMamaRunHintTap._doneT);
  if (hideMamaScene._afterHide) {
    const f = hideMamaScene._afterHide;
    hideMamaScene._afterHide = null;
    f();
  }
}

// Щоденна тепла сцена — тільки якщо Сяйко вже народився і саме він активний
// зараз (у робота/гриба/кита своєї мами немає — вони розблоковуються за бали,
// не висиджуються з яйця).
function maybeDailyMama() {
  if (!state.hatched || state.activeChar !== 'gecko') return;
  const today = new Date().toDateString();
  if (state.lastMamaDay === today) return;
  state.lastMamaDay = today;
  showMamaScene('daily');
}

// Викликається з render(): якщо етап росту щойно змінився (і це не перший
// показ при народженні) — одна з тих самих 15 хореографій, підпис "виріс(ла)".
function maybeMilestoneMama() {
  const key = currentStage().key;
  if (!state.hatched || state.activeChar !== 'gecko') { state.lastSeenStage = key; return; }
  if (key !== state.lastSeenStage) {
    const prev = state.lastSeenStage;
    state.lastSeenStage = key;
    if (prev) showMamaScene('growth');
  }
}

/* ---------- Народження Сяйка: яйце-ореол ---------- */

let hatchTaps = 0;

function hatchTierForTaps(t) {
  if (t >= CONFIG.hatch.tapsToHatch) return 'hatched';
  if (t >= 8) return 'crack2';
  if (t >= 6) return 'crack1';
  if (t >= 5) return 'tier4';
  if (t >= 4) return 'tier3';
  if (t >= 2) return 'tier2';
  if (t >= 1) return 'tier1';
  return '';
}

function beginHatchSequence() {
  hatchTaps = 0;
  const egg = $('eggAura');
  egg.className = 'egg-idle';
  $('tapHint').classList.remove('hint-fade');
  egg.onclick = onEggTap;
}

function onEggTap() {
  if (hatchTaps >= CONFIG.hatch.tapsToHatch) return;
  hatchTaps++;
  const egg = $('eggAura');
  const tier = hatchTierForTaps(hatchTaps);
  if (tier) egg.classList.add(tier);
  if (hatchTaps === 1) $('tapHint').classList.add('hint-fade');
  if (hatchTaps >= CONFIG.hatch.tapsToHatch) {
    egg.onclick = null;
    setTimeout(finishHatch, 900);
  }
}

function finishHatch() {
  state.hatched = true;
  state.lastMamaDay = new Date().toDateString(); // мама вже була в сцені народження — не повторювати сьогодні
  state.lastSeenStage = currentStage().key;
  saveState();
  showMamaScene('birth');
  hideMamaScene._afterHide = () => {
    $('view-hatch').classList.add('hidden');
    $('view-main').classList.remove('hidden');
    render();
  };
}

function showBubble(text, ms = 2000) {
  const b = $('bubble'); b.textContent = text; b.classList.remove('hidden');
  clearTimeout(showBubble._t);
  showBubble._t = setTimeout(() => b.classList.add('hidden'), ms);
}
function log(text) { $('log').textContent = text; }

function setBarLow(el, val) { el.classList.toggle('low', val < 25); }

function render() {
  if (!modulesBooted) { modulesBooted = true; runHooks('init'); }
  const stage = currentStage();
  const p = persona();
  document.body.className = p.theme;

  state.name = charName(state.activeChar);
  $('petName').textContent = state.name;
  $('stageLabel').textContent = t('stage.' + stage.key);
  $('streak').textContent = '🔥 ' + state.streak;
  const ch = activeCharacter();
  const img = $('petImg');
  if (img.getAttribute('src') !== ch.img) img.setAttribute('src', ch.img);
  img.style.width = Math.round(170 * stage.scale) + 'px';
  $('petEmoji').textContent = state.sleeping ? '💤' : (state.sick ? CONFIG.sickEmoji : '');
  $('pet').classList.toggle('sleeping', !!state.sleeping);
  $('points').textContent = '⭐ ' + state.points;
  const tf = $('topFlag'); const fs = flagSrc(state.country || 'ua');
  if (tf.getAttribute('src') !== fs) tf.setAttribute('src', fs);
  $('pet').classList.toggle('sad', isMildlyNeglected());

  const wItem = CONFIG.wardrobe.find(w => w.id === state.equipped);
  const acc = $('petAccessory');
  acc.textContent = (wItem && wItem.id !== 'none') ? wItem.emoji : '';
  const place = (wItem && wItem.place) || { top: -14, right: -6, rotate: 0 };
  acc.style.top = place.top + 'px';
  acc.style.right = place.right + 'px';
  acc.style.transform = 'rotate(' + place.rotate + 'deg)';
  acc.style.filter = (wItem && wItem.hue) ? 'hue-rotate(' + wItem.hue + 'deg)' : 'none';

  const bars = { hunger: 'barHunger', mood: 'barMood', energy: 'barEnergy', hygiene: 'barHygiene', health: 'barHealth' };
  for (const key in bars) {
    const el = $(bars[key]);
    el.style.width = state[key] + '%';
    setBarLow(el, state[key]);
  }

  $('btnHeal').disabled = !state.sick;

  const nm = { name: state.name };
  if (state.sick) log(t('log.sick', nm));
  else if (state.hunger < 25) log(t('log.hungry', nm));
  else if (state.hygiene < 25) log(t('log.dirty', nm));
  else if (state.energy < 20) log(t('log.sleepy', nm));
  else if (state.mood < 25) log(t('log.sad', nm));
  else log('');

  maybeMilestoneMama();
  runHooks('render');
}

function maybeRandomEvent() {
  if (state.sleeping || state.sick) return;
  // не перекривати міні-гру, мапу чи інші вікна
  if ($('view-main').classList.contains('hidden')) return;
  if (['eventModal', 'statModal', 'langModal', 'mamaOverlay'].some(id => { const el = $(id); return el && !el.classList.contains('hidden'); })) return;
  if (Math.random() > CONFIG.randomEvents.checkChancePerTick) return;
  const pool = CONFIG.randomEvents.pool;
  const totalWeight = pool.reduce((a, e) => a + e.weight, 0);
  let r = Math.random() * totalWeight;
  let chosen = pool[0];
  for (const e of pool) { if (r < e.weight) { chosen = e; break; } r -= e.weight; }
  chosen.effect(state);
  showEventModal(chosen.emoji, t('event.' + chosen.id, { name: state.name }));
}

function showEventModal(emoji, text) {
  $('eventEmoji').textContent = emoji;
  $('eventText').textContent = text;
  $('eventModal').classList.remove('hidden');
}

function tickLoop() {
  if (!state) return;
  const wokeFromLongAbsence = applyOfflineDecay();
  render();
  runHooks('tick');
  saveState();
  if (wokeFromLongAbsence) showWelcomeBackModal();
  else maybeRandomEvent();
}

function showWelcomeBackModal() {
  // Для Сяйка — та ж тепла сцена з мамою замість сухого модального вікна;
  // для інших персонажів (у яких мами немає) — звичний текстовий модал.
  if (state.hatched && state.activeChar === 'gecko') {
    state.lastMamaDay = new Date().toDateString(); // щоб та сама дата не "спрацювала" ще й як щоденна
    showMamaScene('reunion');
  } else {
    showEventModal('🌅', t('welcomeBack', { name: state.name }));
  }
}

/* ---------- Попап для ⚡ енергії і 🔥 стрику: інфо + разова безкоштовна,
   далі платна (за бали, НЕ за гроші) дія ---------- */

function showStatModal(emoji, title, text, actionLabel, actionFn) {
  $('statEmoji').textContent = emoji;
  $('statTitle').textContent = title;
  $('statText').textContent = text;
  const btn = $('statAction');
  if (actionLabel) {
    btn.textContent = actionLabel; btn.classList.remove('hidden'); btn.onclick = actionFn;
  } else {
    btn.classList.add('hidden'); btn.onclick = null;
  }
  $('statModal').classList.remove('hidden');
}
function hideStatModal() { $('statModal').classList.add('hidden'); }

function onEnergyTap() {
  const full = state.energy >= 100;
  let label = null, fn = null;
  if (!full) {
    if (!state.energyRefillUsed) {
      label = t('stat.energyFree');
      fn = () => { state.energy = 100; state.energyRefillUsed = true; saveState(); render(); hideStatModal(); showBubble(t('bubble.energyFull')); };
    } else {
      label = t('stat.energyPaid', { n: CONFIG.points.energyRefillCost });
      fn = () => {
        if (state.points < CONFIG.points.energyRefillCost) { hideStatModal(); showBubble(t('bubble.notEnough')); return; }
        state.points -= CONFIG.points.energyRefillCost; state.energy = 100;
        saveState(); render(); hideStatModal(); showBubble(t('bubble.energyFull'));
      };
    }
  }
  showStatModal('⚡', t('stat.energyTitle'), t('stat.energyText', { n: Math.round(state.energy) }), label, fn);
}

function onStreakTap() {
  // Лише інформація: серія не згорає, тож нічого купувати чи «захищати» не треба.
  showStatModal('🔥', t('stat.streakTitle'), t('stat.streakText', { days: tPlural('days', state.streak) }) + t('stat.streakPause'), null, null);
}

// Тестовий/службовий reset — повністю скидає прогрес і повертає на екран
// знайомства (щоб можна було ще раз побачити сцену яйця-народження).
// Підтвердження — через власне вікно гри, НЕ через confirm(): у тестовій
// версії (та й у частині вбудованих браузерів) системні вікна заблоковані,
// confirm() мовчки повертає "ні", і кнопка ⟲ виглядала зламаною.
function resetGame() {
  showStatModal('⟲', t('reset.title'), t('reset.confirm'), t('reset.yes'), doResetGame);
}
function doResetGame() {
  hideStatModal();
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  state = null;
  // Перезавантаження сторінки; якщо його заблоковано — повертаємось на перший екран вручну.
  try { location.reload(); } catch (e) {}
  setTimeout(() => {
    document.querySelectorAll('#screen > .view').forEach(v => v.classList.add('hidden'));
    ['mamaOverlay', 'eventModal', 'statModal', 'langModal'].forEach(id => { const el = $(id); if (el) el.classList.add('hidden'); });
    pendingCountry = null; pendingLang = null;
    applyI18n(); renderCountryList();
    $('view-country').classList.remove('hidden');
  }, 400);
}

/* ---------- Дії ---------- */

function feed() {
  if (state.sleeping) return showBubble(t('bubble.sleeping'));
  careReward(state.hunger);
  state.hunger = clamp(state.hunger + 22); state.mood = clamp(state.mood + 3);
  showBubble(t('bubble.fed')); render(); saveState();
}
function wash() {
  if (state.sleeping) return showBubble(t('bubble.sleeping'));
  careReward(state.hygiene);
  state.hygiene = clamp(state.hygiene + 30); state.mood = clamp(state.mood + 2);
  showBubble(t('bubble.washed')); render(); saveState();
}
function sleep() {
  state.sleeping = !state.sleeping;
  showBubble(state.sleeping ? t('bubble.goodnight') : t('bubble.woke'));
  render(); saveState();
}
function heal() {
  if (!state.sick) return showBubble(t('bubble.noMeds'));
  addPoints(CONFIG.points.healAction);
  state.health = clamp(state.health + 45);
  state.sick = state.health < CONFIG.health.sickBelow;
  showBubble(t('bubble.healed')); render(); saveState();
}
function playRequest() {
  if (state.sleeping) return showBubble(t('bubble.sleeping'));
  if (state.sick) return showBubble(t('bubble.healFirst'));
  if (state.energy < 15) return showBubble(t('bubble.tooTired'));
  openGameMenu();
}

/* ---------- Меню вибору гри: дитина сама обирає, у що грати ----------
   Список будується автоматично з CONFIG.miniGames — нова гра з'являється
   в меню сама, щойно її додано в каталог. Рекорд кожної гри зберігається
   в state.bestScores, щоб було до чого прагнути. */
function openGameMenu() {
  const grid = $('gameMenuGrid'); grid.innerHTML = '';
  const best = state.bestScores || {};
  CONFIG.miniGames.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'gameMenuItem';
    btn.innerHTML = g.icon + '<span class="gLabel">' + t('game.' + g.id) + '</span>' +
      '<span class="gBest">' + (best[g.id] ? '🏆 ' + best[g.id] : t('games.new')) + '</span>';
    btn.addEventListener('click', () => {
      $('view-gameMenu').classList.add('hidden');
      startMiniGame(g.id);
    });
    grid.appendChild(btn);
  });
  $('view-main').classList.add('hidden');
  $('view-gameMenu').classList.remove('hidden');
}

/* ---------- Міні-ігри: запуск обраної в меню гри ---------- */

function setScore(n) { $('gameScore').textContent = t('games.score', { n }); }

function startMiniGame(id) {
  gameType = id;
  gameScore = 0;
  setScore(0);
  $('gamePrompt').textContent = t('game.' + id + '.prompt');
  $('view-main').classList.add('hidden');
  $('view-game').classList.remove('hidden');
  const area = $('gameArea'); area.innerHTML = '';

  GAME_RUNNERS[gameType](area);
}

// Зв'язка id-гри → функція, що її запускає. Єдине місце, яке треба
// доповнити одним рядком, додаючи нову гру з каталогу CONFIG.miniGames.
const GAME_RUNNERS = {
  tap: (area) => startTapGame(area),
  memory: (area) => startMemoryGame(area),
  catch: (area) => startCatchGame(area),
  hidden: (area) => startHiddenGame(area),
  balloon: (area) => startBalloonGame(area),
  count: (area) => startCountGame(area),
  bigger: (area) => startBiggerGame(area),
  direction: (area) => startDirectionGame(area),
  odd: (area) => startOddGame(area),
  shrink: (area) => startShrinkGame(area),
  dodge: (area) => startDodgeGame(area),
  color: (area) => startColorGame(area),
  rhythm: (area) => startRhythmGame(area),
  numbers: (area) => startNumbersGame(area),
  mood: (area) => startMoodGame(area),
};

// Перевіряє гардероб-предмети типу "minigame" проти результату щойно зіграної гри
// і видає ті, що пройшли порог. Додати новий предмет-нагороду за міні-гру —
// це лише новий запис у CONFIG.wardrobe, цю функцію більше ніколи не чіпати.
function grantMinigameRewards() {
  const unlocked = [];
  CONFIG.wardrobe.forEach(w => {
    if (w.unlock.type === 'minigame' && w.unlock.game === gameType &&
        gameScore >= w.unlock.scoreThreshold && !state.unlockedItems.includes(w.id)) {
      state.unlockedItems.push(w.id);
      unlocked.push(w);
    }
  });
  return unlocked;
}

function endMiniGame() {
  clearTimeout(gameTimer); clearTimeout(gameTargetTimeout); clearTimeout(fallSpawnTimer); clearTimeout(matchRoundTimeout); clearTimeout(balloonSpawnTimer);
  $('view-game').classList.add('hidden');
  $('view-main').classList.remove('hidden');

  const moodGain = Math.min(30, 6 + gameScore * 2);
  state.mood = clamp(state.mood + moodGain);
  state.energy = clamp(state.energy - CONFIG.miniGameEnergyCost);

  const newlyUnlocked = grantMinigameRewards();
  let msg = t('games.fun', { n: moodGain });
  let earned = gameScore * CONFIG.points.perGameScore;
  const prevBest = state.bestScores[gameType] || 0;
  if (gameScore > prevBest) {
    state.bestScores[gameType] = gameScore;
    if (prevBest > 0) { msg += t('games.record', { n: gameScore }); earned += CONFIG.points.newRecordBonus; }
  }
  if (earned > 0) { addPoints(earned); msg += t('games.earned', { n: earned }); }
  if (newlyUnlocked.length) msg += t('games.newItem', { items: newlyUnlocked.map(w => w.emoji).join(' ') });
  showBubble(msg);
  render(); saveState();
}

// Варіант 1: тапни ціль, що рухається
function startTapGame(area) {
  const btn = document.createElement('button');
  btn.className = 'gameTarget'; btn.textContent = '🎯';
  area.appendChild(btn);
  function move() {
    const maxX = area.clientWidth - 54, maxY = area.clientHeight - 54;
    btn.style.left = Math.random() * maxX + 'px'; btn.style.top = Math.random() * maxY + 'px';
    // складність росте без стелі: кожне влучення скорочує інтервал, до мінімуму 500мс
    const interval = Math.max(500, 1300 - gameScore * 60);
    clearTimeout(gameTargetTimeout); gameTargetTimeout = setTimeout(move, interval);
  }
  btn.addEventListener('click', () => { gameScore++; setScore(gameScore); move(); });
  move();
  gameTimer = setTimeout(endMiniGame, 12000);
}

// Варіант 2: тапни символ, що збігається зі зразком зверху.
// (Замінено 11.11: попередня версія "запам'ятай невидиму послідовність" (Simon)
// виявилась незрозумілою з першого разу навіть дорослому тестеру — ціль тут
// завжди видима, нічого не треба тримати в пам'яті, правило зрозуміле з одного
// погляду. Без штрафу за помилку — завжди просто новий раунд.)
function startMemoryGame(area) {
  const pool = ['🍎','🍌','🍇','🍓','🍒','🍋','🍉','🍑'];

  const wrap = document.createElement('div');
  wrap.className = 'matchWrap';
  const targetDiv = document.createElement('div');
  targetDiv.className = 'matchTarget';
  const optionsDiv = document.createElement('div');
  optionsDiv.className = 'matchOptions';
  wrap.appendChild(targetDiv); wrap.appendChild(optionsDiv);
  area.appendChild(wrap);

  function nextRound() {
    clearTimeout(matchRoundTimeout);
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 4);
    const target = shuffled[Math.floor(Math.random() * shuffled.length)];
    targetDiv.textContent = target;
    optionsDiv.innerHTML = '';
    shuffled.sort(() => Math.random() - 0.5).forEach((emoji) => {
      const btn = document.createElement('button');
      btn.className = 'matchOption';
      btn.textContent = emoji;
      btn.addEventListener('click', () => {
        if (emoji === target) { gameScore++; setScore(gameScore); }
        nextRound();
      });
      optionsDiv.appendChild(btn);
    });
    // складність росте без стелі: з кожним очком менше часу на раунд, до мінімуму 1.8с
    matchRoundTimeout = setTimeout(nextRound, Math.max(1800, 4000 - gameScore * 150));
  }

  nextRound();
  gameTimer = setTimeout(endMiniGame, 25000);
}

// Варіант 3: лови предмети, що падають
function startCatchGame(area) {
  function spawn() {
    const item = document.createElement('button');
    item.className = 'fallItem'; item.textContent = ['🍓','🍬','⭐','🍪'][Math.floor(Math.random()*4)];
    item.style.left = Math.random() * (area.clientWidth - 30) + 'px';
    item.style.top = '-30px';
    area.appendChild(item);
    let y = -30;
    const fall = setInterval(() => {
      y += 6; item.style.top = y + 'px';
      if (y > area.clientHeight) { clearInterval(fall); item.remove(); }
    }, 40);
    item.addEventListener('click', () => { clearInterval(fall); item.remove(); gameScore++; setScore(gameScore); });
  }
  // складність росте без стелі: інтервал появи предметів скорочується з очками, до мінімуму 400мс
  function scheduleSpawn() {
    spawn();
    const interval = Math.max(400, 900 - gameScore * 30);
    fallSpawnTimer = setTimeout(scheduleSpawn, interval);
  }
  scheduleSpawn();
  gameTimer = setTimeout(endMiniGame, 14000);
}

// Варіант 4: знайди всі предмети-зразки серед інших (hidden-object, як у конкурентів)
function startHiddenGame(area) {
  const allEmoji = ['🍎','🍌','🍇','🍓','🍒','🍋','🌟','🍪'];
  const target = allEmoji[Math.floor(Math.random() * allEmoji.length)];
  $('gamePrompt').textContent = t('game.hidden.prompt', { emoji: target });

  const cells = []; for (let i = 0; i < 16; i++) cells.push(i);
  function cellPos(i) { return { x: (i % 4) * 68 + 12, y: Math.floor(i / 4) * 68 + 12 }; }

  function refillField() {
    area.innerHTML = '';
    // складність росте без стелі: з очками дедалі більше предметів на полі, до 12 з 16 клітинок
    const count = Math.min(12, 6 + Math.floor(gameScore / 2));
    const chosenCells = [...cells].sort(() => Math.random() - 0.5).slice(0, count);
    const targetCount = Math.max(2, Math.floor(count / 3));
    chosenCells.forEach((cell, idx) => {
      const isTarget = idx < targetCount;
      const emoji = isTarget ? target : allEmoji[Math.floor(Math.random() * allEmoji.length)];
      const btn = document.createElement('button');
      btn.className = 'hiddenItem'; btn.textContent = emoji;
      const pos = cellPos(cell);
      btn.style.left = pos.x + 'px'; btn.style.top = pos.y + 'px';
      btn.addEventListener('click', () => {
        if (emoji !== target) return; // декор — просто ігноруємо, без штрафу
        gameScore++; setScore(gameScore);
        btn.remove();
        const anyLeft = [...area.children].some(c => c.textContent === target);
        if (!anyLeft) refillField();
      });
      area.appendChild(btn);
    });
  }

  refillField();
  gameTimer = setTimeout(endMiniGame, 18000);
}

// Варіант 5: лопни кульки, що летять вгору (balloon-pop, як у конкурентів)
function startBalloonGame(area) {
  function spawn() {
    const item = document.createElement('button');
    item.className = 'balloonItem'; item.textContent = '🎈';
    item.style.left = Math.random() * (area.clientWidth - 34) + 'px';
    let y = area.clientHeight;
    item.style.top = y + 'px';
    area.appendChild(item);
    const rise = setInterval(() => {
      y -= 5; item.style.top = y + 'px';
      if (y < -34) { clearInterval(rise); item.remove(); }
    }, 40);
    item.addEventListener('click', () => { clearInterval(rise); item.remove(); gameScore++; setScore(gameScore); });
  }
  // складність росте без стелі: інтервал появи кульок скорочується з очками, до мінімуму 350мс
  function scheduleSpawn() {
    spawn();
    const interval = Math.max(350, 850 - gameScore * 25);
    balloonSpawnTimer = setTimeout(scheduleSpawn, interval);
  }
  scheduleSpawn();
  gameTimer = setTimeout(endMiniGame, 14000);
}

// Варіант 6: тапай задану кількість разів поспіль — ціль росте без стелі
function startCountGame(area) {
  let target = 3, count = 0;
  const badge = document.createElement('div'); badge.className = 'countBadge';
  const btn = document.createElement('button'); btn.className = 'countBtn'; btn.textContent = '👏';
  area.appendChild(badge); area.appendChild(btn);
  function newRound() { target = 3 + Math.floor(gameScore / 2); count = 0; badge.textContent = '0 / ' + target; }
  btn.addEventListener('click', () => {
    count++; badge.textContent = count + ' / ' + target;
    if (count >= target) { gameScore++; setScore(gameScore); newRound(); }
  });
  newRound();
  gameTimer = setTimeout(endMiniGame, 16000);
}

// Варіант 7: тапни більший за розміром символ
function startBiggerGame(area) {
  const wrap = document.createElement('div'); wrap.className = 'biggerWrap';
  const a = document.createElement('button'); a.className = 'biggerOpt';
  const b = document.createElement('button'); b.className = 'biggerOpt';
  wrap.appendChild(a); wrap.appendChild(b); area.appendChild(wrap);
  const emojis = ['🍎', '⭐', '🎈', '🐸', '🍉'];
  function round() {
    const e = emojis[Math.floor(Math.random() * emojis.length)];
    a.textContent = e; b.textContent = e;
    const big = 36 + Math.random() * 26, small = 16 + Math.random() * 10;
    const aBig = Math.random() < 0.5;
    a.style.fontSize = (aBig ? big : small) + 'px';
    b.style.fontSize = (aBig ? small : big) + 'px';
    a.dataset.big = aBig ? '1' : '0'; b.dataset.big = aBig ? '0' : '1';
  }
  function pick(correct) { if (correct) { gameScore++; setScore(gameScore); } round(); }
  a.addEventListener('click', () => pick(a.dataset.big === '1'));
  b.addEventListener('click', () => pick(b.dataset.big === '1'));
  round();
  gameTimer = setTimeout(endMiniGame, 14000);
}

// Варіант 8: тапни стрілку, що збігається зі зразком
function startDirectionGame(area) {
  const dirs = ['⬆️', '⬇️', '⬅️', '➡️'];
  const target = document.createElement('div'); target.className = 'dirTarget';
  const opts = document.createElement('div'); opts.className = 'dirOpts';
  area.appendChild(target); area.appendChild(opts);
  function round() {
    const d = dirs[Math.floor(Math.random() * dirs.length)];
    target.textContent = d;
    opts.innerHTML = '';
    dirs.slice().sort(() => Math.random() - 0.5).forEach(x => {
      const btn = document.createElement('button'); btn.className = 'dirBtn'; btn.textContent = x;
      btn.addEventListener('click', () => { if (x === d) { gameScore++; setScore(gameScore); } round(); });
      opts.appendChild(btn);
    });
  }
  round();
  gameTimer = setTimeout(endMiniGame, 16000);
}

// Варіант 9: знайди єдиний інший символ серед однакових — поле росте без стелі
function startOddGame(area) {
  const grid = document.createElement('div'); grid.className = 'oddGrid'; area.appendChild(grid);
  const pool = ['🍎', '🍌', '🍇', '🍓', '🍒', '🍋', '🍉', '🍑', '🥝', '🍍'];
  function round() {
    grid.innerHTML = '';
    const size = Math.min(16, 4 + gameScore);
    const main = pool[Math.floor(Math.random() * pool.length)];
    let other = pool[Math.floor(Math.random() * pool.length)];
    while (other === main) other = pool[Math.floor(Math.random() * pool.length)];
    const oddIndex = Math.floor(Math.random() * size);
    grid.style.gridTemplateColumns = 'repeat(' + Math.ceil(Math.sqrt(size)) + ',1fr)';
    for (let i = 0; i < size; i++) {
      const cell = document.createElement('button'); cell.className = 'oddCell';
      cell.textContent = i === oddIndex ? other : main;
      cell.addEventListener('click', () => { if (i === oddIndex) { gameScore++; setScore(gameScore); } round(); });
      grid.appendChild(cell);
    }
  }
  round();
  gameTimer = setTimeout(endMiniGame, 18000);
}

// Варіант 10: тапни кільце, поки воно ще велике (точність у часі) — пришвидшується без стелі
function startShrinkGame(area) {
  const ring = document.createElement('button'); ring.className = 'shrinkRing'; area.appendChild(ring);
  let dur = Math.max(700, 1700 - gameScore * 60);
  let tooLate = false;
  function round() {
    tooLate = false;
    ring.style.transition = 'none'; ring.style.transform = 'scale(1)'; void ring.offsetWidth;
    ring.style.transition = 'transform ' + dur + 'ms linear';
    ring.style.transform = 'scale(0.15)';
    clearTimeout(gameTargetTimeout); clearTimeout(fallSpawnTimer);
    gameTargetTimeout = setTimeout(() => { tooLate = true; }, Math.round(dur * 0.65));
    fallSpawnTimer = setTimeout(round, dur + 80);
  }
  ring.addEventListener('click', () => {
    if (!tooLate) { gameScore++; setScore(gameScore); }
    dur = Math.max(700, 1700 - gameScore * 60);
    round();
  });
  round();
  gameTimer = setTimeout(endMiniGame, 16000);
}

// Варіант 11: тапни безпечну доріжку (інша, ніж позначена "⚠️")
function startDodgeGame(area) {
  const wrap = document.createElement('div'); wrap.className = 'dodgeWrap';
  const lanes = [0, 1, 2].map(i => { const b = document.createElement('button'); b.className = 'dodgeLane'; b.dataset.i = i; wrap.appendChild(b); return b; });
  area.appendChild(wrap);
  let danger = 0;
  function round() {
    danger = Math.floor(Math.random() * 3);
    lanes.forEach((l, i) => { l.textContent = i === danger ? '⚠️' : '🟩'; });
  }
  lanes.forEach(l => l.addEventListener('click', () => {
    if (+l.dataset.i !== danger) { gameScore++; setScore(gameScore); }
    round();
  }));
  round();
  gameTimer = setTimeout(endMiniGame, 16000);
}

// Варіант 12: тапни кнопку того ж кольору, що й зразок
function startColorGame(area) {
  const colors = [['#ff5d5d', '🔴'], ['#5db2ff', '🔵'], ['#5dffa0', '🟢'], ['#ffd65d', '🟡'], ['#c77dff', '🟣']];
  const target = document.createElement('div'); target.className = 'colorTarget';
  const opts = document.createElement('div'); opts.className = 'colorOpts';
  area.appendChild(target); area.appendChild(opts);
  function round() {
    const t = colors[Math.floor(Math.random() * colors.length)];
    target.textContent = t[1]; target.style.color = t[0];
    opts.innerHTML = '';
    let set = colors.slice().sort(() => Math.random() - 0.5).slice(0, 3);
    if (!set.includes(t)) set[0] = t;
    set.sort(() => Math.random() - 0.5).forEach(c => {
      const b = document.createElement('button'); b.className = 'colorBtn'; b.textContent = c[1]; b.style.color = c[0];
      b.addEventListener('click', () => { if (c === t) { gameScore++; setScore(gameScore); } round(); });
      opts.appendChild(b);
    });
  }
  round();
  gameTimer = setTimeout(endMiniGame, 16000);
}

// Варіант 13: тапни кружечок у момент, коли він найбільший — темп пришвидшується без стелі
function startRhythmGame(area) {
  const circle = document.createElement('button'); circle.className = 'rhythmCircle'; area.appendChild(circle);
  let dur = Math.max(900, 1800 - gameScore * 50);
  let t0 = Date.now();
  circle.style.animation = 'rhythmPulse ' + dur + 'ms ease-in-out infinite';
  circle.addEventListener('click', () => {
    const phase = ((Date.now() - t0) % dur) / dur;
    if (Math.abs(phase - 0.5) < 0.18) { gameScore++; setScore(gameScore); }
    dur = Math.max(900, 1800 - gameScore * 50);
    circle.style.animation = 'rhythmPulse ' + dur + 'ms ease-in-out infinite';
    t0 = Date.now();
  });
  gameTimer = setTimeout(endMiniGame, 16000);
}

// Варіант 14: тапни більше число
function startNumbersGame(area) {
  const wrap = document.createElement('div'); wrap.className = 'numWrap';
  const a = document.createElement('button'); a.className = 'numBtn';
  const b = document.createElement('button'); b.className = 'numBtn';
  wrap.appendChild(a); wrap.appendChild(b); area.appendChild(wrap);
  function round() {
    let x = 1 + Math.floor(Math.random() * 20), y = 1 + Math.floor(Math.random() * 20);
    while (y === x) y = 1 + Math.floor(Math.random() * 20);
    a.textContent = x; b.textContent = y; a.dataset.v = x; b.dataset.v = y;
  }
  function pick(btn, other) { if (+btn.dataset.v > +other.dataset.v) { gameScore++; setScore(gameScore); } round(); }
  a.addEventListener('click', () => pick(a, b));
  b.addEventListener('click', () => pick(b, a));
  round();
  gameTimer = setTimeout(endMiniGame, 14000);
}

// Варіант 15: тапни 👍 для усміхненого обличчя, 👎 для сумного
function startMoodGame(area) {
  const faces = { happy: ['😀', '😃', '😄', '😁', '🙂'], sad: ['😢', '😭', '😔', '🙁', '😟'] };
  const faceEl = document.createElement('div'); faceEl.className = 'moodFace';
  const wrap = document.createElement('div'); wrap.className = 'moodOpts';
  const up = document.createElement('button'); up.className = 'moodBtn'; up.textContent = '👍';
  const down = document.createElement('button'); down.className = 'moodBtn'; down.textContent = '👎';
  wrap.appendChild(up); wrap.appendChild(down);
  area.appendChild(faceEl); area.appendChild(wrap);
  let current = 'happy';
  function round() {
    current = Math.random() < 0.5 ? 'happy' : 'sad';
    const pool = faces[current];
    faceEl.textContent = pool[Math.floor(Math.random() * pool.length)];
  }
  function pick(choice) { if (choice === current) { gameScore++; setScore(gameScore); } round(); }
  up.addEventListener('click', () => pick('happy'));
  down.addEventListener('click', () => pick('sad'));
  round();
  gameTimer = setTimeout(endMiniGame, 14000);
}

/* ---------- Гардероб ---------- */

// Єдине місце, де перевіряється "чи доступний предмет". Додаси новий ТИП
// розблокування (не free/streak/minigame/seasonal) — дописуєш гілку тут,
// і більше ніде. Самі предмети (дані) цю функцію не зачіпають ніколи.
function isWardrobeUnlocked(w) {
  const u = w.unlock;
  switch (u.type) {
    case 'free': return true;
    case 'streak': return state.streak >= u.value;
    case 'minigame': return state.unlockedItems.includes(w.id);
    case 'seasonal': {
      const now = Date.now();
      const from = u.from ? new Date(u.from).getTime() : -Infinity;
      const until = u.until ? new Date(u.until).getTime() : Infinity;
      return now >= from && now <= until;
    }
    case 'premium': return !!(window.BO && BO.shop && BO.shop.owns(u.product));
    default: return false;
  }
}

function lockLabel(w) {
  const u = w.unlock;
  if (u.type === 'streak') return t('lock.streak', { n: u.value });
  if (u.type === 'minigame') return t('lock.game');
  if (u.type === 'seasonal') return t('lock.season');
  if (u.type === 'premium') return '🔒 ' + t('shop.lockTag');
  return '🔒';
}

// mimi (дівчинка) бачить гардероб 'girl'+'any', bo (хлопчик) — 'boy'+'any'
function wardrobeGenderAllowed(w) {
  if (!w.gender || w.gender === 'any') return true;
  const want = isFemale() ? 'girl' : 'boy';
  return w.gender === want;
}

function renderWardrobe() {
  const grid = $('wardrobeGrid'); grid.innerHTML = '';
  CONFIG.wardrobe
    .filter(w => w.unlock.type !== 'seasonal' || isWardrobeUnlocked(w)) // сезонні поза вікном — ховаються самі
    .filter(wardrobeGenderAllowed)
    .filter(w => w.unlock.type !== 'premium' || isWardrobeUnlocked(w) || !(window.BO.shop && BO.shop.hideLocked()))
    .forEach(w => {
      const locked = !isWardrobeUnlocked(w);
      const premium = w.unlock.type === 'premium';
      const div = document.createElement('div');
      div.className = 'wardrobeItem' + (locked ? ' locked' : '') + (locked && premium ? ' premium' : '') + (state.equipped === w.id ? ' equipped' : '');
      div.dataset.id = w.id;
      div.innerHTML = (w.emoji || '🚫') + '<span class="wLabel">' + (locked ? lockLabel(w) : t('wardrobe.' + w.id)) + '</span>';
      if (!locked) div.addEventListener('click', () => { state.equipped = w.id; saveState(); renderWardrobe(); render(); });
      // зачинена преміум-річ: лише пояснення (без магазину і без закликів купити)
      else if (premium && window.BO.shop) div.addEventListener('click', () => BO.shop.lockedInfo(w.unlock.product));
      grid.appendChild(div);
    });
}

/* ---------- Бали і персонажі ---------- */

function addPoints(n) {
  state.points = (state.points || 0) + n;
  if (n > 0) state.totalEarned = (state.totalEarned || 0) + n; // усього зароблено за весь час (для мапи прогресу)
  runHooks('points', n);
}
function careReward(statBefore) {
  if (statBefore < CONFIG.points.careNeededBelow) addPoints(CONFIG.points.careAction);
}
function activeCharacter() {
  return CONFIG.characters.find(c => c.id === state.activeChar) || CONFIG.characters[0];
}
function setActiveCharacter(id) {
  const c = CONFIG.characters.find(x => x.id === id);
  state.activeChar = id;
  state.name = charName(id);
  saveState(); render();
}
function buyCharacter(c) {
  if (c.premium || state.points < c.price) return;   // преміум-друга за зірки не купити
  state.points -= c.price;
  state.ownedChars.push(c.id);
  setActiveCharacter(c.id);
  renderCharacters();
  showEventModal('🎉', t('chars.newFriend', { name: charName(c.id) }));
}
function renderCharacters() {
  const grid = $('charGrid'); grid.innerHTML = '';
  $('charPoints').textContent = t('chars.points', { n: state.points });
  const shop = window.BO.shop;
  const premiumOwned = c => !!(c && c.premium && shop && shop.owns(c.premium));
  const charOwned = c => state.ownedChars.includes(c.id) || premiumOwned(c);
  const free = CONFIG.characters.filter(c => !c.premium || charOwned(c) || !(shop && shop.hideLocked()));
  free.forEach((c) => {
    const owned = charOwned(c);
    const lockedPremium = !!c.premium && !owned;
    // черга «відкривай по порядку» — лише серед друзів за зірки (преміум поза чергою)
    const starChars = CONFIG.characters.filter(x => !x.premium);
    const si = starChars.indexOf(c);
    const prevOwned = !!c.premium || si <= 0 || state.ownedChars.includes(starChars[si - 1].id);
    const card = document.createElement('div');
    card.className = 'charCard' + (owned ? '' : ' locked') + (lockedPremium ? ' premium' : '') + (state.activeChar === c.id ? ' active' : '');
    let footer;
    if (owned) footer = '<span class="cTag">' + t(state.activeChar === c.id ? 'chars.active' : 'chars.choose') + '</span>';
    else if (lockedPremium) footer = '<span class="cTag cPremium">🔒 ' + t('shop.lockTag') + '</span>';
    else if (!prevOwned) footer = '<span class="cTag">' + t('chars.prevFirst') + '</span>';
    else if (state.points >= c.price) footer = '<button class="cBuy">' + t('chars.buy', { n: c.price }) + '</button>';
    else footer = '<span class="cTag">' + t('chars.need', { price: c.price, left: c.price - state.points }) + '</span>';
    card.innerHTML = '<img src="' + c.img + '" alt="">' +
      '<span class="cName">' + (owned ? charName(c.id) : t('char.' + c.id + '.name')) + '</span>' +
      '<span class="cTitle">' + t('char.' + c.id + '.title') + '</span>' + footer;
    if (owned) card.addEventListener('click', () => { setActiveCharacter(c.id); renderCharacters(); });
    else if (lockedPremium) card.addEventListener('click', () => shop.lockedInfo(c.premium));
    const buy = card.querySelector('.cBuy');
    if (buy) buy.addEventListener('click', (e) => { e.stopPropagation(); buyCharacter(c); });
    grid.appendChild(card);
  });
}

/* ---------- Активація: країна → мова → знайомство ----------
   Країну обирають один раз (state.country), вона визначає мову за
   замовчуванням. Крок вибору мови показується, тільки якщо в країні кілька
   мов або її мовою ще немає перекладу (тоді чесно пишемо "поки English"). */

function flagSrc(code) { return 'img/flags/' + code + '.svg'; }
function countryByCode(code) { return (window.BO_COUNTRIES || []).find(c => c.code === code); }

function detectCountry() {
  const list = navigator.languages || [navigator.language || ''];
  for (const l of list) {
    const parts = String(l).toLowerCase().split('-');
    const region = parts[1];
    if (region && countryByCode(region)) return region; // росії/білорусі в каталозі немає — не знайдеться
    if (parts[0] === 'uk') return 'ua';
  }
  return null;
}

function countryButton(c) {
  const b = document.createElement('button');
  b.className = 'countryBtn';
  b.innerHTML = '<img loading="lazy" src="' + flagSrc(c.code) + '" alt=""><span>' + c.name + '</span>';
  b.addEventListener('click', () => chooseCountry(c));
  return b;
}

function renderCountryList() {
  const host = $('countryList'); host.innerHTML = '';
  const detected = detectCountry();
  if (detected) {
    const top = countryButton(countryByCode(detected));
    top.classList.add('suggested');
    host.appendChild(top);
  }
  ['cis', 'america', 'europe', 'asia', 'oceania'].forEach(g => {
    const h = document.createElement('div');
    h.className = 'countryGroup'; h.textContent = t('start.group.' + g);
    host.appendChild(h);
    window.BO_COUNTRIES.filter(c => c.group === g).forEach(c => host.appendChild(countryButton(c)));
  });
}

// Мови на вибір: мови країни (перша — основна) + англійська + інші вже перекладені.
function langOptionsFor(country) {
  const opts = [...country.langs];
  if (!opts.includes('en')) opts.push('en');
  Object.keys(window.BO_LANG || {}).forEach(code => { if (!opts.includes(code)) opts.push(code); });
  return opts;
}

function renderLangButtons(host, country, current, onPick) {
  host.innerHTML = '';
  langOptionsFor(country).forEach(code => {
    const b = document.createElement('button');
    b.className = 'langOpt' + (code === current ? ' selected' : '');
    b.innerHTML = '<span class="lName">' + (window.BO_LANGUAGES[code] || code) + '</span>' +
      (langReady(code) ? '' : '<span class="lSoon">' + t('start.langSoon') + '</span>');
    b.addEventListener('click', () => onPick(code));
    host.appendChild(b);
  });
}

function showOnly(viewId) {
  ['view-country', 'view-lang', 'view-start'].forEach(id => $(id).classList.toggle('hidden', id !== viewId));
}

function chooseCountry(c) {
  pendingCountry = c.code;
  const needLangStep = c.langs.length > 1 || !langReady(c.langs[0]);
  if (!needLangStep) { pendingLang = c.langs[0]; goToIntro(); return; }
  $('langFlag').src = flagSrc(c.code);
  renderLangButtons($('langList'), c, null, code => { pendingLang = code; goToIntro(); });
  applyI18n();
  showOnly('view-lang');
}

function goToIntro() {
  const c = countryByCode(pendingCountry);
  $('startFlag').src = flagSrc(c.code);
  $('startCountryName').textContent = c.name;
  applyI18n();
  showOnly('view-start');
}

// Зміна мови вже в грі (через прапорець угорі). Країна не змінюється.
function openLangModal() {
  const c = countryByCode(state.country) || countryByCode('ua');
  $('langModalFlag').src = flagSrc(c.code);
  renderLangButtons($('langModalList'), c, state.lang, code => {
    state.lang = code; saveState();
    applyI18n(); render();
    $('langModal').classList.add('hidden');
  });
  $('langModal').classList.remove('hidden');
}

/* ---------- Старт ---------- */

/* Вік гравця (3…20, 21 = «21+»). Зберігається лише на телефоні. Від нього освітні ігри
   (edu.js) беруть складність: зростає до 14 років, далі — рівень 14. */
let selectedAge = null;
function renderAgeStrip() {
  const strip = $('ageStrip'); if (!strip || strip.childElementCount) return;
  for (let a = 3; a <= 21; a++) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ageOpt'; b.dataset.age = a;
    b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
    b.textContent = a === 21 ? '21+' : String(a);
    b.addEventListener('click', () => {
      selectedAge = a;
      strip.querySelectorAll('.ageOpt').forEach(x => { const on = x === b; x.classList.toggle('selected', on); x.setAttribute('aria-checked', on ? 'true' : 'false'); });
      $('agePick').classList.remove('ageNeed');
    });
    strip.appendChild(b);
  }
}
function startGame() {
  if (!selectedAge) {
    // вік обов'язковий: підсвічуємо рядок і не стартуємо
    const p = $('agePick'); p.classList.remove('ageNeed'); void p.offsetWidth; p.classList.add('ageNeed');
    return;
  }
  const typed = $('petNameInput').value.trim();
  state = defaultState(selectedPersona, typed || null, pendingCountry || 'ua', curLang());
  state.age = selectedAge;
  if (!typed) delete state.charNames.gecko; // без свого імені — ім'я з мовного файлу (Сяйко / Sparky ...)
  state.name = charName('gecko');
  updateStreak();
  saveState();
  $('view-start').classList.add('hidden');
  $('view-hatch').classList.remove('hidden');
  beginHatchSequence();
}

function init() {
  applyI18n();
  if (!state) renderCountryList();
  if (state) {
    $('view-country').classList.add('hidden');
    const wokeFromLongAbsence = applyOfflineDecay();
    updateStreak(); saveState();
    if (!state.hatched) {
      // Збереження існує, але яйце ще не розкрито (гру закрили посеред сцени) —
      // показуємо саме її, а не головний екран.
      $('view-start').classList.add('hidden');
      $('view-hatch').classList.remove('hidden');
      beginHatchSequence();
    } else {
      $('view-start').classList.add('hidden');
      $('view-main').classList.remove('hidden');
      render();
      if (wokeFromLongAbsence) showWelcomeBackModal();
      else maybeDailyMama();
    }
  }

  // Сцена з мамою: малюк біжить праворуч, коли дитина тапає підказку, і тільки
  // тоді гра переходить далі — ніякого автоматичного таймера.
  $('mamaTapHint').addEventListener('click', onMamaRunHintTap);
  $('iconEnergy').addEventListener('click', onEnergyTap);
  $('streak').addEventListener('click', onStreakTap);

  // Вибір хлопчик/дівчинка на старті — впливає на статі, займенники і гардероб.
  document.querySelectorAll('.personaOpt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.personaOpt').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedPersona = btn.getAttribute('data-p');
      document.body.className = CONFIG.personas[selectedPersona].theme;
    });
  });
  $('btnReset').addEventListener('click', resetGame);
  $('btnLang').addEventListener('click', openLangModal);
  $('langModalClose').addEventListener('click', () => $('langModal').classList.add('hidden'));
  $('btnLangBack').addEventListener('click', () => showOnly('view-country'));
  $('btnStartCountry').addEventListener('click', () => { renderCountryList(); showOnly('view-country'); });
  $('btnStart').addEventListener('click', startGame);
  renderAgeStrip();
  $('btnFeed').addEventListener('click', feed);
  $('btnWash').addEventListener('click', wash);
  $('btnSleep').addEventListener('click', sleep);
  $('btnHeal').addEventListener('click', heal);
  $('btnPlay').addEventListener('click', playRequest);

  $('btnWardrobe').addEventListener('click', () => {
    renderWardrobe();
    $('view-main').classList.add('hidden');
    $('view-wardrobe').classList.remove('hidden');
  });
  $('btnCharacters').addEventListener('click', () => {
    renderCharacters();
    $('view-main').classList.add('hidden');
    $('view-characters').classList.remove('hidden');
  });
  $('btnCharactersClose').addEventListener('click', () => {
    $('view-characters').classList.add('hidden');
    $('view-main').classList.remove('hidden');
  });
  $('btnGameMenuClose').addEventListener('click', () => {
    $('view-gameMenu').classList.add('hidden');
    $('view-main').classList.remove('hidden');
  });
  $('btnWardrobeClose').addEventListener('click', () => {
    $('view-wardrobe').classList.add('hidden');
    $('view-main').classList.remove('hidden');
  });
  $('eventClose').addEventListener('click', () => { $('eventModal').classList.add('hidden'); render(); saveState(); });
  $('statClose').addEventListener('click', hideStatModal);

  setInterval(tickLoop, 30000); // перевірка стану раз на 30с реального часу
}

document.addEventListener('DOMContentLoaded', init);
