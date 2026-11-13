/* OTOTO — освітня гра, слот 5 «Світ навколо» (ПІЛОТ). CoLaba Production.

   Підключається ПІСЛЯ edu.js; реєструється в хабі «Навчання» через BO.edu.register.
   Без картинок і мережі: емодзі, CSS-кружечки (планети) і наявні прапори img/flags/*.svg.

   ── ЯК УСЕ ВЛАШТОВАНО ──
   DATA   — довідники (тварини, кольори, пори року, країни, планети, факти…).
            Назви НЕ тут, а в мовних файлах: ключ 'edu.world.<група>.<id>'
            (a.cow, h.forest, c.ua, cap.ua, p.mars, f.sun …).
   TOPICS — «теми-генератори» питань: { id, cat, min, max, gen(o) }.
            min…max — вік (ctx.band) для теми; cat — для медалей (animals/geo/sky);
            gen(o) повертає питання, o = { n: кількість варіантів, g: кількість карток у сортуванні }.
   Питання (те, що повертає gen):
     { type:'choice', key, prompt, say?, vis?, opts:[{id, e?, flag?, planet?, label?}], ans }
     { type:'tf',     key, prompt, vis:{fact}, ans:true|false }
     { type:'group',  key, prompt, groups:[{id, e, label}], items:[{e, g}] }
   vis (картинка над питанням): { e, cap } | { flag, cap } | { swatch, cap } | { chain:[…] } | { fact }

   ── ЯК ДОДАТИ ──
   • Нова тварина: рядок у DATA.animals + ключ 'edu.world.a.<id>' в i18n_edu_world.json.
   • Нова країна/столиця: рядок у DATA.countries + 'c.<код>' і 'cap.<код>' (прапор img/flags/<код>.svg уже має бути).
   • Новий факт «правда/неправда»: рядок у DATA.facts + 'f.<id>'.
   • Нова тема: об'єкт у TOPICS (gen повертає питання у форматі вище) + її тексти.
   Після правок текстів: python3 tools/edu_world_i18n.py (переносить JSON у lang/*.js),
   потім python3 tools/build_precache.py.

   ── НАГОРОДИ ──
   1 ⭐ за правильну відповідь з першої спроби (сортування без помилок — 2 ⭐, з помилками — 1 ⭐).
   Рівень = 1 + (правильні з першої спроби) / 6, без кінця; новий рівень +2 ⭐.
   Медалі: edu.world.compass (25 раундів), .paw (20 про тварин), .globe (20 про країни), .rocket (15 про небо і науку).
   Адаптивність: менше варіантів, якщо останні відповіді часто хибні; теми з помилками випадають частіше;
   без повторів того самого питання (останні 10) і тієї самої теми двічі поспіль. */
(function () {
  'use strict';
  const BO = window.BO;
  if (!BO || !BO.edu) return;

  /* =====================================================================
     DATA
     ===================================================================== */
  const DATA = {
    // home — де живе (3–5 років): farm/home/forest/sea; hab — середовище (6–9); cont — континент (10–14);
    // snd — є звук-слово 'snd.<id>'; kid — знайома малятам (для «Знайди»)
    animals: {
      cow: { e: '🐄', home: 'farm', snd: 1 }, pig: { e: '🐖', home: 'farm', snd: 1 }, sheep: { e: '🐑', home: 'farm', snd: 1 },
      horse: { e: '🐎', home: 'farm' }, rooster: { e: '🐓', home: 'farm', snd: 1 }, goat: { e: '🐐', home: 'farm' },
      dog: { e: '🐕', home: 'home', snd: 1 }, cat: { e: '🐈', home: 'home', snd: 1 }, hamster: { e: '🐹', home: 'home' },
      bear: { e: '🐻', home: 'forest', hab: 'forest' }, fox: { e: '🦊', home: 'forest', hab: 'forest' },
      hedgehog: { e: '🦔', home: 'forest', hab: 'forest' }, squirrel: { e: '🐿️', home: 'forest', hab: 'forest' },
      owl: { e: '🦉', home: 'forest', hab: 'forest' }, wolf: { e: '🐺', home: 'forest', hab: 'forest' }, deer: { e: '🦌', home: 'forest', hab: 'forest' },
      fish: { e: '🐟', home: 'sea' }, octopus: { e: '🐙', home: 'sea', hab: 'sea' }, dolphin: { e: '🐬', home: 'sea', hab: 'sea' },
      whale: { e: '🐳', home: 'sea', hab: 'sea' }, shark: { e: '🦈', home: 'sea', hab: 'sea' }, crab: { e: '🦀', home: 'sea', hab: 'sea' },
      lion: { e: '🦁', hab: 'savanna', kid: 1 }, giraffe: { e: '🦒', hab: 'savanna', cont: 'africa', kid: 1 }, zebra: { e: '🦓', hab: 'savanna', cont: 'africa', kid: 1 },
      camel: { e: '🐪', hab: 'desert' }, scorpion: { e: '🦂', hab: 'desert' },
      penguin: { e: '🐧', hab: 'polar', kid: 1 }, polarbear: { e: '🐻‍❄️', hab: 'polar' },
      monkey: { e: '🐒', hab: 'jungle', kid: 1 }, parrot: { e: '🦜', hab: 'jungle' }, sloth: { e: '🦥', hab: 'jungle' },
      kangaroo: { e: '🦘', cont: 'australia' }, koala: { e: '🐨', cont: 'australia' }, panda: { e: '🐼', cont: 'asia' }, llama: { e: '🦙', cont: 'samerica' },
      rabbit: { e: '🐇', kid: 1 }, caterpillar: { e: '🐛' }, bird: { e: '🐦' }, mouse: { e: '🐁', kid: 1 },
      grass: { e: '🌿' }, leaves: { e: '🍃' }, grain: { e: '🌾' },
    },
    homes: { farm: '🚜', home: '🏠', forest: '🌲', sea: '🌊' },
    habitats: { forest: '🌲', sea: '🌊', savanna: '🌾', desert: '🏜️', polar: '🧊', jungle: '🌴' },
    // пари, які не показуємо разом як варіанти (дитина могла б чесно сплутати)
    habConflict: { forest: ['jungle'], jungle: ['forest'], sea: ['polar'], polar: ['sea'] },
    colors: {
      red: { c: '#e53935', items: ['🍎', '🍓', '🍒', '🚒', '🐞'] },
      yellow: { c: '#fdd835', items: ['🍌', '🌻', '🐥', '🍋', '🧀'] },
      green: { c: '#43a047', items: ['🥦', '🐸', '🍀', '🥒', '🐢'] },
      blue: { c: '#1e88e5', items: ['🐳', '💧', '🧢', '🚙'] },
      orange: { c: '#fb8c00', items: ['🍊', '🥕', '🎃', '🦊', '🏀'] },
      purple: { c: '#8e24aa', items: ['🍇', '🍆'] },
    },
    fv: { fruit: { e: '🧺', items: ['🍎', '🍌', '🍐', '🍊', '🍇', '🍓', '🍒', '🍑', '🍉', '🍋'] },
          veg: { e: '🥗', items: ['🥕', '🥦', '🥒', '🧅', '🥔', '🧄', '🥬', '🍆'] } },
    seasons: { winter: { e: '❄️', items: ['⛄', '🎄', '🛷', '⛸️', '🧤'] }, spring: { e: '🌱', items: ['🌷', '🌸', '🐣'] },
               summer: { e: '☀️', items: ['🏖️', '🍉', '🍦', '🏊'] }, autumn: { e: '🍁', items: ['🍂', '🍄', '🎃', '🌰'] } },
    body: { eye: '👁️', ear: '👂', nose: '👃', tongue: '👅', hand: '✋', foot: '🦶' },
    materials: { wood: ['🪑', '🛶', '🪃'], paper: ['📚', '📰', '✉️'], metal: ['🔑', '🥄', '⚓', '🔔'], fabric: ['🧦', '👕', '🧣'], glass: ['🪟', '🧪'] },
    daynight: { day: { e: '☀️', items: ['🌈', '🐓', '🏫', '🕶️', '🌻', '🏖️'] }, night: { e: '🌙', items: ['⭐', '🦉', '🦇', '🛌', '🌃', '🌠'] } },
    // країни гри (лише ті, що є в countries.js і мають прапор); cont — континент (null = на межі частин світу, не питаємо)
    countries: [
      ['ua', 'europe'], ['pl', 'europe'], ['de', 'europe'], ['fr', 'europe'], ['es', 'europe'], ['it', 'europe'],
      ['gb', 'europe'], ['us', 'namerica'], ['ca', 'namerica'], ['kz', null], ['ro', 'europe'], ['md', 'europe'],
      ['at', 'europe'], ['gr', 'europe'], ['pt', 'europe'], ['nl', 'europe'], ['se', 'europe'], ['no', 'europe'],
      ['fi', 'europe'], ['cz', 'europe'], ['ge', null], ['ie', 'europe'], ['hu', 'europe'], ['lt', 'europe'],
    ],
    continents: ['europe', 'asia', 'africa', 'namerica', 'samerica', 'australia', 'antarctica'],
    // за порядком від Сонця; s — розмір кружечка (px, не в масштабі), c — колір
    planets: [
      { id: 'mercury', c: '#a8a29a', s: 20 }, { id: 'venus', c: '#e6c27a', s: 28 }, { id: 'earth', c: '#3d8fe0', s: 29 },
      { id: 'mars', c: '#d2562e', s: 24 }, { id: 'jupiter', c: '#d9a066', s: 46 }, { id: 'saturn', c: '#e3c988', s: 38 },
      { id: 'uranus', c: '#8fd8e0', s: 34 }, { id: 'neptune', c: '#3f62d6', s: 33 },
    ],
    planetQ: { closest: 'mercury', largest: 'jupiter', smallest: 'mercury', red: 'mars', home: 'earth',
               hottest: 'venus', farthest: 'neptune', rings: 'saturn', side: 'uranus' },
    // true = правда
    facts: { sun: true, spider: false, whale: true, moon: false, plants: true, sound: false, bat: false, ice: true, year: true,
             bones: true, penguin: false, heart: true, gills: true, magnet: false, diamond: true, boil: true, sunEarth: false, insect: false },
    // ланцюжки живлення: [рослина, той, хто її їсть, хижак]
    chains: [['grass', 'rabbit', 'fox'], ['leaves', 'caterpillar', 'bird'], ['grain', 'mouse', 'owl'], ['grass', 'zebra', 'lion'], ['grass', 'deer', 'wolf']],
  };

  /* =====================================================================
     helpers
     ===================================================================== */
  let C = null;                       // ctx поточної гри
  const T = (k, v) => C.t(k, v);
  const rnd = n => Math.floor(Math.random() * n);
  const pick = a => a[rnd(a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sample = (a, k) => shuffle(a).slice(0, Math.max(0, k));
  const keys = o => Object.keys(o);
  const A = DATA.animals;
  const aName = id => T('a.' + id);
  const animalsWhere = f => keys(A).filter(id => f(A[id]));
  const countries = () => {
    const ok = new Set((window.BO_COUNTRIES || []).map(c => c.code));
    return DATA.countries.filter(([c]) => ok.has(c) && c !== 'ru' && c !== 'by');
  };
  // відповідь + (n-1) інших, перемішано
  const withDistractors = (ans, pool, n) => shuffle([ans].concat(sample(pool.filter(x => x !== ans), n - 1)));
  let lastAns = {};                   // topic -> остання відповідь (щоб не повторювати поспіль)
  function pickFresh(topic, pool) {
    const rest = pool.filter(x => x !== lastAns[topic]);
    const v = pick(rest.length ? rest : pool); lastAns[topic] = v; return v;
  }

  /* =====================================================================
     TOPICS
     ===================================================================== */
  const TOPICS = [
    // ---------- 3–5 ----------
    { id: 'find', cat: 'animals', min: 3, max: 5, gen(o) {
      const pool = animalsWhere(a => a.home || a.kid);
      const ans = pickFresh('find', pool);
      const p = T('q.find', { x: aName(ans) });
      return { type: 'choice', key: 'find:' + ans, prompt: p, say: p, ans,
        opts: withDistractors(ans, pool, o.n).map(id => ({ id, e: A[id].e })) };
    } },
    { id: 'says', cat: 'animals', min: 3, max: 6, gen(o) {
      const ans = pickFresh('says', animalsWhere(a => a.snd));
      const pool = animalsWhere(a => a.home === 'farm' || a.home === 'home');
      const p = T('q.says', { x: T('snd.' + ans) });
      return { type: 'choice', key: 'says:' + ans, prompt: p, say: p, ans, vis: { e: '🔊' },
        opts: withDistractors(ans, pool, o.n).map(id => ({ id, e: A[id].e })) };
    } },
    { id: 'home', cat: 'animals', min: 3, max: 6, gen(o) {
      const id = pickFresh('home', animalsWhere(a => a.home));
      const ans = A[id].home;
      return { type: 'choice', key: 'home:' + id, prompt: T('q.home'), say: aName(id) + '. ' + T('q.home'), ans,
        vis: { e: A[id].e, cap: aName(id) },
        opts: withDistractors(ans, keys(DATA.homes), Math.min(4, Math.max(o.n, 3))).map(h => ({ id: h, e: DATA.homes[h], label: T('h.' + h) })) };
    } },
    { id: 'homesSort', cat: 'animals', min: 3, max: 6, gen(o) {
      const bins = sample(keys(DATA.homes), 2);
      return groupQ('homesSort', T('q.homes'), bins.map(h => ({ id: h, e: DATA.homes[h], label: T('h.' + h) })),
        bins.map(h => animalsWhere(a => a.home === h).map(id => ({ e: A[id].e, g: h }))), o.g);
    } },
    { id: 'color', cat: '', min: 3, max: 5, gen(o) {
      const col = pickFresh('color', keys(DATA.colors));
      const ans = pick(DATA.colors[col].items);
      const others = sample(keys(DATA.colors).filter(c => c !== col), o.n - 1).map(c => pick(DATA.colors[c].items));
      const name = T('col.' + col);
      return { type: 'choice', key: 'color:' + col, prompt: T('q.color'), say: name + '. ' + T('q.color'), ans,
        vis: { swatch: DATA.colors[col].c, cap: name }, opts: shuffle([ans].concat(others)).map(e => ({ id: e, e })) };
    } },
    { id: 'fvSort', cat: '', min: 3, max: 7, gen(o) {
      const bins = ['fruit', 'veg'];
      return groupQ('fvSort', T('q.fv'), bins.map(b => ({ id: b, e: DATA.fv[b].e, label: T('fv.' + b) })),
        bins.map(b => DATA.fv[b].items.map(e => ({ e, g: b }))), o.g);
    } },
    { id: 'who', cat: 'animals', min: 5, max: 7, gen(o) {
      const pool = animalsWhere(a => a.home || a.kid);
      const ans = pickFresh('who', pool);
      return { type: 'choice', key: 'who:' + ans, prompt: T('q.who'), say: T('q.who'), ans, vis: { e: A[ans].e },
        opts: withDistractors(ans, pool, o.n).map(id => ({ id, label: aName(id) })) };
    } },
    // ---------- 6–9 ----------
    { id: 'habitat', cat: 'animals', min: 6, max: 9, gen(o) {
      const id = pickFresh('habitat', animalsWhere(a => a.hab));
      const ans = A[id].hab, bad = DATA.habConflict[ans] || [];
      const pool = keys(DATA.habitats).filter(h => !bad.includes(h));
      return { type: 'choice', key: 'hab:' + id, prompt: T('q.home'), say: aName(id) + '. ' + T('q.home'), ans,
        vis: { e: A[id].e, cap: aName(id) },
        opts: withDistractors(ans, pool, o.n).map(h => ({ id: h, e: DATA.habitats[h], label: T('h.' + h) })) };
    } },
    { id: 'habitatSort', cat: 'animals', min: 6, max: 9, gen(o) {
      const all = keys(DATA.habitats).filter(h => animalsWhere(a => a.hab === h).length >= 2);
      const first = pick(all);
      const second = pick(all.filter(h => h !== first && !(DATA.habConflict[first] || []).includes(h)));
      const bins = [first, second];
      return groupQ('habitatSort', T('q.homes'), bins.map(h => ({ id: h, e: DATA.habitats[h], label: T('h.' + h) })),
        bins.map(h => animalsWhere(a => a.hab === h).map(id => ({ e: A[id].e, g: h }))), o.g);
    } },
    { id: 'season', cat: 'sky', min: 6, max: 9, gen() {
      const s = pickFresh('season', keys(DATA.seasons)), item = pick(DATA.seasons[s].items);
      return { type: 'choice', key: 'season:' + item, prompt: T('q.season'), say: T('q.season'), ans: s, vis: { e: item },
        opts: keys(DATA.seasons).map(id => ({ id, e: DATA.seasons[id].e, label: T('s.' + id) })) };
    } },
    { id: 'body', cat: '', min: 6, max: 8, gen(o) {
      const ans = pickFresh('body', keys(DATA.body));
      const p = T('b.q.' + ans);
      return { type: 'choice', key: 'body:' + ans, prompt: p, say: p, ans,
        opts: withDistractors(ans, keys(DATA.body), o.n).map(id => ({ id, e: DATA.body[id], label: T('b.' + id) })) };
    } },
    { id: 'made', cat: '', min: 6, max: 9, gen(o) {
      const m = pickFresh('made', keys(DATA.materials)), item = pick(DATA.materials[m]);
      return { type: 'choice', key: 'made:' + item, prompt: T('q.made'), say: T('q.made'), ans: m, vis: { e: item },
        opts: withDistractors(m, keys(DATA.materials), o.n).map(id => ({ id, label: T('m.' + id) })) };
    } },
    { id: 'dayNight', cat: 'sky', min: 6, max: 8, gen(o) {
      const bins = ['day', 'night'];
      return groupQ('dayNight', T('q.dn'), bins.map(b => ({ id: b, e: DATA.daynight[b].e, label: T('dn.' + b) })),
        bins.map(b => DATA.daynight[b].items.map(e => ({ e, g: b }))), o.g);
    } },
    { id: 'flag', cat: 'geo', min: 7, max: 14, gen(o) {
      const list = countries().map(c => c[0]);
      const ans = pickFresh('flag', list);
      return { type: 'choice', key: 'flag:' + ans, prompt: T('q.flag'), ans, vis: { flag: ans },
        opts: withDistractors(ans, list, o.n).map(id => ({ id, label: T('c.' + id) })) };
    } },
    // ---------- 10–14 ----------
    { id: 'capital', cat: 'geo', min: 10, max: 14, gen(o) {
      const list = countries().map(c => c[0]);
      const ans = pickFresh('capital', list);
      return { type: 'choice', key: 'cap:' + ans, prompt: T('q.capital'), ans, vis: { flag: ans, cap: T('c.' + ans) },
        opts: withDistractors(ans, list, o.n).map(id => ({ id, label: T('cap.' + id) })) };
    } },
    { id: 'continent', cat: 'geo', min: 10, max: 14, gen(o) {
      const items = animalsWhere(a => a.cont).map(id => ({ k: 'a:' + id, ans: A[id].cont, vis: { e: A[id].e, cap: aName(id) }, p: 'q.contA' }))
        .concat(countries().filter(c => c[1]).map(([c, ct]) => ({ k: 'c:' + c, ans: ct, vis: { flag: c, cap: T('c.' + c) }, p: 'q.contC' })));
      // тварини і країни — порівну, інакше Європа траплялася б надто часто
      const it = pickFresh('continent', Math.random() < 0.5 ? items.filter(x => x.k[0] === 'a') : items.filter(x => x.k[0] === 'c'));
      return { type: 'choice', key: 'cont:' + it.k, prompt: T(it.p), ans: it.ans, vis: it.vis,
        opts: withDistractors(it.ans, DATA.continents, o.n).map(id => ({ id, label: T('ct.' + id) })) };
    } },
    { id: 'planet', cat: 'sky', min: 9, max: 14, gen(o) {
      const q = pickFresh('planet', keys(DATA.planetQ)), ans = DATA.planetQ[q];
      return { type: 'choice', key: 'planet:' + q, prompt: T('q.p.' + q), ans, vis: { e: '🔭' },
        opts: withDistractors(ans, DATA.planets.map(p => p.id), o.n).map(id => ({ id, planet: id, label: T('p.' + id) })) };
    } },
    { id: 'planetOrder', cat: 'sky', min: 10, max: 14, gen(o) {
      const i = pickFresh('planetOrder', [0, 1, 2, 3, 4, 5, 6, 7]), ans = DATA.planets[i].id;
      return { type: 'choice', key: 'porder:' + i, prompt: T('q.p.order', { n: i + 1 }), ans, vis: { e: '☀️' },
        opts: withDistractors(ans, DATA.planets.map(p => p.id), o.n).map(id => ({ id, planet: id, label: T('p.' + id) })) };
    } },
    { id: 'fact', cat: 'sky', min: 10, max: 14, gen() {
      const f = pickFresh('fact', keys(DATA.facts));
      return { type: 'tf', key: 'fact:' + f, prompt: T('q.tf'), ans: DATA.facts[f], vis: { fact: T('f.' + f) } };
    } },
    { id: 'chain', cat: 'animals', min: 10, max: 14, gen(o) {
      const ci = pickFresh('chain', DATA.chains.map((_, i) => i)), ch = DATA.chains[ci];
      const miss = rnd(3), ans = ch[miss];
      // підставні — лише з ІНШИХ ланок інших ланцюжків: так жоден не підходить на місце «?»
      const pool = [...new Set(DATA.chains.flatMap(c => c.filter((_, j) => j !== miss)))].filter(x => !ch.includes(x));
      return { type: 'choice', key: 'chain:' + ci + ':' + miss, prompt: T('q.chain'), ans,
        vis: { chain: ch.map((id, j) => j === miss ? null : id) },
        opts: withDistractors(ans, pool, o.n).map(id => ({ id, e: A[id].e, label: aName(id) })) };
    } },
  ];

  // сортування: groups — кошики, lists — по списку карток на кошик; беремо порівну, всього ≈ total
  function groupQ(topic, prompt, groups, lists, total) {
    const per = Math.max(2, Math.floor(total / groups.length));
    const items = shuffle(lists.flatMap(l => sample(l, per)));
    return { type: 'group', key: topic + ':' + groups.map(g => g.id).join('+'), prompt, groups, items };
  }

  /* =====================================================================
     гра
     ===================================================================== */
  let host = null, root = null, q = null, locked = false, firstTry = true, mistakes = 0, sel = null, timers = [];
  let voice = null, onVoices = null;
  const MEDALS = [
    { id: 'edu.world.compass', e: '🧭', cat: 'all', need: 25 },
    { id: 'edu.world.paw', e: '🐾', cat: 'animals', need: 20 },
    { id: 'edu.world.globe', e: '🌐', cat: 'geo', need: 20 },
    { id: 'edu.world.rocket', e: '🚀', cat: 'sky', need: 15 },
  ];
  const LOCALE = { uk: 'uk-UA', en: 'en-GB', pl: 'pl-PL', de: 'de-DE', ro: 'ro-RO', kk: 'kk-KZ', fr: 'fr-FR', es: 'es-ES' };

  const later = (fn, ms) => { const id = setTimeout(() => { timers = timers.filter(x => x !== id); fn(); }, ms); timers.push(id); };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const P = () => {
    const p = C.progress;
    p.w = p.w || { ok: 0, cats: { all: 0, animals: 0, geo: 0, sky: 0 }, miss: {}, recent: [], hist: [] };
    return p.w;
  };
  const sound = name => { try { window.BO_SOUND && window.BO_SOUND.play(name); } catch (e) { /* без звуку */ } };

  /* ---------- озвучка (лише якщо в телефоні є голос цієї мови) ---------- */
  function findVoice() {
    voice = null;
    try {
      const want = C.lang;
      voice = (window.speechSynthesis && speechSynthesis.getVoices() || []).find(v => (v.lang || '').toLowerCase().replace('_', '-').split('-')[0] === want) || null;
    } catch (e) { voice = null; }
    if (root) root.querySelector('.wwSay').classList.toggle('hidden', !voice);
  }
  function speak(text) {
    if (!voice || !text || (window.BO_SOUND && window.BO_SOUND.muted)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice; u.lang = voice.lang || LOCALE[C.lang]; u.rate = 0.9;
      speechSynthesis.speak(u);
    } catch (e) { /* без озвучки */ }
  }

  /* ---------- вибір наступного питання ---------- */
  function opts() {
    const w = P(), band = C.band, lvl = C.progress.level || 1;
    let n = band <= 4 ? 3 : band === 5 ? (lvl >= 3 ? 4 : 3) : 4;
    let g = band <= 4 ? 4 : band <= 6 ? (lvl >= 3 ? 6 : 4) : 6;
    const h = w.hist.slice(-6);
    if (h.length >= 4 && h.filter(Boolean).length / h.length < 0.5) { n = Math.max(band <= 4 ? 2 : 3, n - 1); g = 4; }
    return { n, g };
  }
  function nextQuestion(forceTopic) {
    const w = P(), band = C.band;
    let pool = TOPICS.filter(t => band >= t.min && band <= t.max);
    if (!pool.length) pool = TOPICS.filter(t => t.max >= 14);
    let topic = forceTopic ? TOPICS.find(t => t.id === forceTopic) : null;
    if (!topic) {
      const cand = pool.length > 1 ? pool.filter(t => t.id !== w.lastTopic) : pool;
      const weights = cand.map(t => 1 + Math.min(3, (w.miss[t.id] || 0)) * 0.7);
      let r = Math.random() * weights.reduce((a, b) => a + b, 0);
      topic = cand[cand.length - 1];
      for (let i = 0; i < cand.length; i++) { r -= weights[i]; if (r <= 0) { topic = cand[i]; break; } }
    }
    let nq = null;
    for (let i = 0; i < 8; i++) { nq = topic.gen(opts()); if (!w.recent.includes(nq.key)) break; }
    nq.topic = topic.id; nq.cat = topic.cat;
    w.lastTopic = topic.id;
    show(nq);
  }

  /* ---------- малювання ---------- */
  function build() {
    root = el('div', 'ww');
    root.innerHTML =
      '<div class="wwTop"><span class="wwLvl"></span><span class="wwMedals"></span><button type="button" class="wwSay hidden">🔊</button></div>' +
      '<div class="wwVis"></div><p class="wwPrompt"></p><div class="wwBody"></div><p class="wwMsg" aria-live="polite"></p>';
    host.appendChild(root);
    root.querySelector('.wwSay').addEventListener('click', () => speak(q && (q.say || q.prompt + (q.vis && q.vis.fact ? ' ' + q.vis.fact : ''))));
  }
  function renderTop() {
    root.querySelector('.wwLvl').textContent = T('lvl', { n: C.progress.level || 1 });
    const m = root.querySelector('.wwMedals'); m.innerHTML = '';
    MEDALS.forEach(md => {
      const s = el('span', 'wwMedal' + (C.progress.medals.includes(md.id) ? ' got' : ''), md.e);
      s.title = T(md.id.replace('edu.world.', '')); m.appendChild(s);
    });
  }
  function visual(v) {
    const box = el('div', 'wwVisIn');
    if (!v) return box;
    if (v.e) box.appendChild(el('div', 'wwBig', v.e));
    if (v.swatch) { const s = el('div', 'wwSwatch'); s.style.background = v.swatch; box.appendChild(s); }
    if (v.flag) { const i = el('img', 'wwFlagBig'); i.src = 'img/flags/' + v.flag + '.svg'; i.alt = ''; box.appendChild(i); }
    if (v.fact) box.appendChild(el('div', 'wwFact', v.fact));
    if (v.chain) {
      const row = el('div', 'wwChain');
      v.chain.forEach((id, j) => {
        if (j) row.appendChild(el('span', 'wwArr', '→'));
        const c = el('span', 'wwCh' + (id ? '' : ' wwMiss'));
        c.appendChild(el('b', '', id ? A[id].e : '?'));
        c.appendChild(el('i', '', id ? aName(id) : ' '));
        row.appendChild(c);
      });
      box.appendChild(row);
      box.appendChild(el('div', 'wwHint', T('chainHint')));
    }
    if (v.cap) box.appendChild(el('div', 'wwCap', v.cap));
    return box;
  }
  function planetDot(id) {
    const p = DATA.planets.find(x => x.id === id);
    const d = el('span', 'wwPl wwPl-' + id);
    d.style.setProperty('--pc', p.c); d.style.setProperty('--ps', p.s + 'px');
    return d;
  }
  function show(nq) {
    q = nq; locked = false; firstTry = true; mistakes = 0; sel = null;
    renderTop();
    const vis = root.querySelector('.wwVis'); vis.innerHTML = ''; vis.appendChild(visual(q.vis));
    root.querySelector('.wwPrompt').textContent = q.prompt;
    const msg = root.querySelector('.wwMsg'); msg.textContent = ''; msg.className = 'wwMsg';
    const body = root.querySelector('.wwBody'); body.innerHTML = '';
    root.dataset.type = q.type; root.dataset.topic = q.topic;
    if (q.type === 'group') renderGroup(body, msg);
    else renderChoice(body);
    if (C.band <= 5) later(() => speak(q.say), 250);
  }
  function renderChoice(body) {
    const list = q.type === 'tf' ? [{ id: true, label: T('true'), e: '👍' }, { id: false, label: T('false'), e: '👎' }] : q.opts;
    const grid = el('div', 'wwOpts n' + list.length + (list.every(o => !o.label) ? ' pics' : '') + (list.every(o => !o.e && !o.flag && !o.planet) ? ' words' : ''));
    list.forEach(o => {
      const b = el('button', 'wwOpt'); b.type = 'button'; b.dataset.id = String(o.id);
      if (o.planet) b.appendChild(planetDot(o.planet));
      if (o.e) b.appendChild(el('span', 'wwE', o.e));
      if (o.label) b.appendChild(el('span', 'wwL', o.label));
      if (!o.label) b.setAttribute('aria-label', o.e);
      b.addEventListener('click', () => answer(o.id, b));
      grid.appendChild(b);
    });
    body.appendChild(grid);
  }
  function renderGroup(body, msg) {
    msg.textContent = T('groupHint');
    const pool = el('div', 'wwPool');
    q.items.forEach((it, i) => {
      const b = el('button', 'wwTok', it.e); b.type = 'button'; b.dataset.g = it.g; b.dataset.i = i;
      b.addEventListener('click', () => {
        if (locked || b.classList.contains('placed')) return;
        pool.querySelectorAll('.wwTok.sel').forEach(x => x !== b && x.classList.remove('sel'));
        b.classList.toggle('sel'); sel = b.classList.contains('sel') ? b : null;
      });
      pool.appendChild(b);
    });
    const bins = el('div', 'wwBins n' + q.groups.length);
    q.groups.forEach(g => {
      const b = el('button', 'wwBin'); b.type = 'button'; b.dataset.g = g.id;
      const head = el('span', 'wwBinHead'); head.appendChild(el('span', 'wwE', g.e)); head.appendChild(el('span', 'wwL', g.label));
      b.appendChild(head); b.appendChild(el('span', 'wwBinIn'));
      b.addEventListener('click', () => drop(b));
      bins.appendChild(b);
    });
    body.appendChild(pool); body.appendChild(bins);
  }

  /* ---------- відповіді ---------- */
  function shake(b) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
  function answer(id, btn) {
    if (locked) return;
    const msg = root.querySelector('.wwMsg');
    if (id === q.ans) {
      btn.classList.add('ok'); locked = true;
      finish(firstTry);
      return;
    }
    firstTry = false; mistakes++;
    btn.classList.add('bad'); btn.disabled = true; shake(btn); sound('nope');
    msg.textContent = T('wrong'); msg.className = 'wwMsg bad';
    const left = [...root.querySelectorAll('.wwOpt:not(:disabled)')];
    if (q.type === 'tf' || left.length <= 1) {      // підказуємо правильну і йдемо далі
      locked = true;
      const right = root.querySelector('.wwOpt[data-id="' + String(q.ans) + '"]');
      if (right) right.classList.add('ok');
      const label = right ? (right.querySelector('.wwL') || right.querySelector('.wwE') || right).textContent : '';
      msg.textContent = T('answerWas', { x: label });
      finish(false, 1700, true);
    }
  }
  function drop(bin) {
    if (locked) return;
    if (!sel) { shake(bin); return; }
    if (sel.dataset.g === bin.dataset.g) {
      sel.classList.remove('sel'); sel.classList.add('placed'); sel.disabled = true;
      bin.querySelector('.wwBinIn').appendChild(el('span', 'wwMini', sel.textContent));
      sel = null; sound('place');
      if (!root.querySelector('.wwTok:not(.placed)')) { locked = true; finish(mistakes === 0); }
    } else {
      mistakes++; shake(bin); shake(sel); sound('nope');
      const msg = root.querySelector('.wwMsg'); msg.textContent = T('wrong'); msg.className = 'wwMsg bad';
    }
  }
  function finish(clean, delay, revealed) {
    const w = P(), p = C.progress;
    let stars = q.type === 'group' ? (mistakes === 0 ? 2 : 1) : (clean ? 1 : 0);
    w.hist.push(clean ? 1 : 0); if (w.hist.length > 12) w.hist.shift();
    w.recent.push(q.key); if (w.recent.length > 10) w.recent.shift();
    if (clean) { w.cats.all++; if (q.cat) w.cats[q.cat] = (w.cats[q.cat] || 0) + 1; } // медалі — за правильні відповіді з першої спроби
    if (clean) { w.ok++; p.streak = (p.streak || 0) + 1; p.best = Math.max(p.best || 0, p.streak); w.miss[q.topic] = Math.max(0, (w.miss[q.topic] || 0) - 1); }
    else { p.streak = 0; w.miss[q.topic] = (w.miss[q.topic] || 0) + 1; }
    const parts = [];
    if (!revealed) parts.push(T('right'));
    const lvl = 1 + Math.floor(w.ok / 6);
    if (lvl > (p.level || 1)) { p.level = lvl; stars += 2; parts.push(T('levelUp', { n: lvl })); }
    const md = MEDALS.find(m => !p.medals.includes(m.id) && (w.cats[m.cat] || 0) >= m.need);
    if (md) parts.push(T('medalGot', { name: md.e + ' ' + T(md.id.replace('edu.world.', '')) }));
    if (stars > 0) parts.push('+' + stars + ' ⭐');
    C.win({ stars, medal: md ? md.id : null });
    renderTop();
    const msg = root.querySelector('.wwMsg');
    if (parts.length) { msg.textContent = (revealed ? msg.textContent + ' ' : '') + parts.join(' '); msg.className = 'wwMsg ' + (revealed ? 'bad' : 'ok'); }
    root.dataset.done = '1';
    later(() => { root.dataset.done = ''; nextQuestion(); }, delay || (md || parts.length > 2 ? 1800 : 1100));
  }

  /* =====================================================================
     реєстрація в хабі
     ===================================================================== */
  BO.edu.register({
    id: 'world', slot: 5, icon: '🌍', pilot: true,
    start(h, ctx) {
      C = ctx; host = h; lastAns = {};
      P();
      build();
      findVoice();
      if (window.speechSynthesis && speechSynthesis.addEventListener) {
        onVoices = () => findVoice();
        speechSynthesis.addEventListener('voiceschanged', onVoices);
      }
      nextQuestion();
    },
    stop() {
      timers.forEach(clearTimeout); timers = [];
      try { if (onVoices) speechSynthesis.removeEventListener('voiceschanged', onVoices); if (voice) speechSynthesis.cancel(); } catch (e) { /* ок */ }
      onVoices = null; voice = null;
      if (root && root.parentNode) root.parentNode.removeChild(root);
      root = null; host = null; q = null; C = null;
    },
  });

  // для автотестів і розширення
  BO.eduWorld = { DATA, TOPICS, MEDALS, current: () => q, next: id => { if (root) nextQuestion(id); } };
})();
