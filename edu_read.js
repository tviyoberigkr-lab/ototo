/* OTOTO — освітня гра, слот 4: «Читання і літери» (ПІЛОТ). CoLaba Production.

   Підключається ПІСЛЯ edu.js; реєструється через BO.edu.register (контракт — у шапці edu.js).
   Без мережі, без картинок: лише емодзі + CSS. Голос — Web Speech API (speechSynthesis),
   якщо на пристрої є голос мови дитини; інакше тихо, без помилок (кнопка 🔊 ховається).

   ЗАВДАННЯ ЗА ВІКОМ (ctx.band):
     3–5   find   — «Знайди літеру»: великі літери, тапнути показану
           first  — «З якої літери починається слово?»: 🍎 → А / A
     6–8   build  — «Склади слово»: картинка + перемішані літери, тапати по порядку
           miss   — «Якої літери не вистачає?»: к_т → і
     9–14  scram  — «Розплутай слово»: довші слова, з рівня 3 — зайва літера-пастка
           spell  — «Яке слово написано правильно?» (помилкові варіанти генеруються самі)
           sent   — «Прочитай і вибери малюнок» (лише мови з полем sentences)
   Рівні нескінченні: 5 правильних відповідей = новий рівень (складність росте з рівнем).
   Нагорода: +1 ⭐ за кожне розв'язане завдання, +1 ⭐ за новий рівень. 4 медалі (MEDALS).

   ── ЯК ДОДАТИ / РОЗШИРИТИ МОВУ (для носія мови) ──
   Один об'єкт на мову в READ_DATA нижче:
     speech:    код голосу для озвучки ('uk-UA')
     alphabet:  усі літери ВЕЛИКИМИ, в порядку абетки (масив рядків)
     vowels:    голосні ВЕЛИКИМИ (рядок) — для генерації помилок у «правильно написаному слові»
     words:     [[слово, емодзі], …] — прості іменники, які легко намалювати одним емодзі.
                Слово пишеться як у словнику (німецькі іменники — з великої), без апострофів,
                дефісів і пробілів. Перша літера (без наголосу/діакритики) має бути в alphabet.
     sentences: (необов'язково) [[речення, правильне емодзі, хибне, хибне], …] — для віку 9–14.
   Код гри при цьому не міняється. Повні дані зараз: uk, en; решта — абетка + стартові слова. */
(function () {
  'use strict';
  const BO = window.BO;
  if (!BO || !BO.edu) return;

  /* ===================== ДАНІ МОВ ===================== */
  const READ_DATA = {
    uk: {
      speech: 'uk-UA',
      alphabet: ['А','Б','В','Г','Ґ','Д','Е','Є','Ж','З','И','І','Ї','Й','К','Л','М','Н','О','П','Р','С','Т','У','Ф','Х','Ц','Ч','Ш','Щ','Ь','Ю','Я'],
      vowels: 'АЕЄИІЇОУЮЯ',
      words: [
        ['кіт','🐱'],['пес','🐶'],['лев','🦁'],['сир','🧀'],['дім','🏠'],['ніс','👃'],['око','👁️'],['жук','🪲'],
        ['торт','🎂'],['слон','🐘'],['вовк','🐺'],['гриб','🍄'],['хліб','🍞'],['сова','🦉'],['риба','🐟'],['жаба','🐸'],
        ['рука','✋'],['нога','🦵'],['чай','🍵'],['сніг','❄️'],['дощ','🌧️'],['тигр','🐯'],['лимон','🍋'],['банан','🍌'],
        ['груша','🍐'],['вишня','🍒'],['кавун','🍉'],['качка','🦆'],['мавпа','🐒'],['свиня','🐷'],['курка','🐔'],['зірка','⭐'],
        ['сонце','☀️'],['книга','📖'],['ключ','🔑'],['лампа','💡'],['квітка','🌸'],['хмара','☁️'],['їжак','🦔'],['єнот','🦝'],
        ['індик','🦃'],['акула','🦈'],['ананас','🍍'],['яблуко','🍎'],['морква','🥕'],['огірок','🥒'],['цибуля','🧅'],['корова','🐄'],
        ['бджола','🐝'],['дерево','🌳'],['ялинка','🎄'],['ракета','🚀'],['машина','🚗'],['місяць','🌙'],['равлик','🐌'],['шоколад','🍫'],
        ['черепаха','🐢'],['олівець','✏️'],['фламінго','🦩'],['ведмідь','🐻'],['метелик','🦋'],['парасолька','☂️'],['годинник','⏰'],
      ],
      sentences: [
        ['Воно жовте, кисле і росте на дереві.','🍋','🍌','🍎'],
        ['Він живе в морі, плаває і має плавці.','🐟','🐦','🐸'],
        ['Вночі вона сяє високо в небі.','🌙','☀️','☁️'],
        ['Цей звір має довгий хобот.','🐘','🦁','🐒'],
        ['Вона повзе повільно і носить хатку на спині.','🐌','🐝','🐸'],
        ['Узимку з неба падає біле і холодне.','❄️','🌧️','🌸'],
        ['Ним відмикають двері.','🔑','📖','💡'],
        ['Вона літає над квітами і робить мед.','🐝','🦋','🦉'],
        ['Він рудий, хитрий і має пухнастий хвіст.','🦊','🐺','🐻'],
        ['Нею пишуть і малюють у зошиті.','✏️','🔑','☂️'],
        ['Вона летить до зірок у космос.','🚀','🚗','⛵'],
        ['Цей птах не спить уночі і має великі очі.','🦉','🦆','🐔'],
        ['Він колючий і живе в лісі під листям.','🦔','🐰','🐢'],
        ['Її відкривають, коли йде дощ.','☂️','📖','⏰'],
      ],
    },
    en: {
      speech: 'en-GB',
      alphabet: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'],
      vowels: 'AEIOU',
      words: [
        ['cat','🐱'],['dog','🐶'],['sun','☀️'],['hat','🎩'],['bus','🚌'],['bee','🐝'],['egg','🥚'],['fox','🦊'],
        ['pig','🐷'],['cow','🐄'],['owl','🦉'],['ant','🐜'],['bed','🛏️'],['box','📦'],['car','🚗'],['ice','🧊'],
        ['fish','🐟'],['frog','🐸'],['duck','🦆'],['lion','🦁'],['bear','🐻'],['milk','🥛'],['cake','🎂'],['tree','🌳'],
        ['star','⭐'],['moon','🌙'],['rain','🌧️'],['kite','🪁'],['nose','👃'],['goat','🐐'],['yarn','🧶'],['apple','🍎'],
        ['lemon','🍋'],['pear','🍐'],['grapes','🍇'],['juice','🧃'],['house','🏠'],['horse','🐴'],['mouse','🐭'],['snake','🐍'],
        ['tiger','🐯'],['zebra','🦓'],['whale','🐳'],['queen','👸'],['banana','🍌'],['carrot','🥕'],['rocket','🚀'],['pencil','✏️'],
        ['turtle','🐢'],['rabbit','🐰'],['monkey','🐒'],['violin','🎻'],['octopus','🐙'],['umbrella','☂️'],['elephant','🐘'],['butterfly','🦋'],
      ],
      sentences: [
        ['It is yellow, sour and grows on a tree.','🍋','🍌','🍎'],
        ['It lives in the sea and swims with fins.','🐟','🐦','🐸'],
        ['At night it shines high in the sky.','🌙','☀️','☁️'],
        ['This animal has a very long trunk.','🐘','🦁','🐒'],
        ['It moves slowly and carries its house on its back.','🐌','🐝','🐸'],
        ['In winter it falls from the sky, white and cold.','❄️','🌧️','🌸'],
        ['You use it to open a door.','🔑','📖','💡'],
        ['It flies over flowers and makes honey.','🐝','🦋','🦉'],
        ['It is orange, clever and has a fluffy tail.','🦊','🐺','🐻'],
        ['You write and draw with it.','✏️','🔑','☂️'],
        ['It flies up to the stars.','🚀','🚗','⛵'],
        ['This bird stays awake at night and has big eyes.','🦉','🦆','🐔'],
        ['It is spiky and hides under leaves in the forest.','🦔','🐰','🐢'],
        ['You open it when it rains.','☂️','📖','⏰'],
      ],
    },
    // ---- стартові дані: абетка + ~15 слів (носіям — розширити words, додати sentences) ----
    pl: {
      speech: 'pl-PL',
      alphabet: ['A','Ą','B','C','Ć','D','E','Ę','F','G','H','I','J','K','L','Ł','M','N','Ń','O','Ó','P','R','S','Ś','T','U','W','Y','Z','Ź','Ż'],
      vowels: 'AĄEĘIOÓUY',
      words: [
        ['kot','🐱'],['pies','🐶'],['dom','🏠'],['ser','🧀'],['lis','🦊'],['koń','🐴'],['ryba','🐟'],['sowa','🦉'],
        ['żaba','🐸'],['tort','🎂'],['auto','🚗'],['krowa','🐄'],['banan','🍌'],['jabłko','🍎'],['słońce','☀️'],['drzewo','🌳'],
        ['gwiazda','⭐'],
      ],
    },
    de: {
      speech: 'de-DE',
      // ß — лише мала літера, тому в абетці (великі) її немає
      alphabet: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','Ä','Ö','Ü'],
      vowels: 'AEIOUÄÖÜ',
      words: [
        ['Hund','🐶'],['Maus','🐭'],['Haus','🏠'],['Mond','🌙'],['Baum','🌳'],['Ente','🦆'],['Eule','🦉'],['Igel','🦔'],
        ['Auto','🚗'],['Ball','⚽'],['Bär','🐻'],['Käse','🧀'],['Katze','🐱'],['Fisch','🐟'],['Sonne','☀️'],['Stern','⭐'],
        ['Apfel','🍎'],['Birne','🍐'],['Banane','🍌'],['Kuchen','🍰'],
      ],
    },
    ro: {
      speech: 'ro-RO',
      alphabet: ['A','Ă','Â','B','C','D','E','F','G','H','I','Î','J','K','L','M','N','O','P','Q','R','S','Ș','T','Ț','U','V','W','X','Y','Z'],
      vowels: 'AĂÂEIÎOU',
      words: [
        ['urs','🐻'],['măr','🍎'],['casă','🏠'],['lună','🌙'],['stea','⭐'],['pară','🍐'],['rață','🦆'],['tort','🎂'],
        ['soare','☀️'],['copac','🌳'],['minge','⚽'],['lapte','🥛'],['pește','🐟'],['câine','🐶'],['pisică','🐱'],['floare','🌸'],
        ['banană','🍌'],['mașină','🚗'],['bufniță','🦉'],
      ],
    },
    kk: {
      speech: 'kk-KZ',
      alphabet: ['А','Ә','Б','В','Г','Ғ','Д','Е','Ё','Ж','З','И','Й','К','Қ','Л','М','Н','Ң','О','Ө','П','Р','С','Т','У','Ұ','Ү','Ф','Х','Һ','Ц','Ч','Ш','Щ','Ъ','Ы','І','Ь','Э','Ю','Я'],
      vowels: 'АӘЕЁИІОӨҰҮЫЭЮЯУ',
      words: [
        ['ит','🐶'],['үй','🏠'],['күн','☀️'],['ай','🌙'],['аю','🐻'],['нан','🍞'],['сүт','🥛'],['гүл','🌸'],
        ['алма','🍎'],['ағаш','🌳'],['сиыр','🐄'],['қоян','🐰'],['мысық','🐱'],['балық','🐟'],['банан','🍌'],['үйрек','🦆'],
        ['жылқы','🐴'],['алмұрт','🍐'],['жұлдыз','⭐'],['тышқан','🐭'],
      ],
    },
    fr: {
      speech: 'fr-FR',
      alphabet: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'],
      vowels: 'AEIOUY',
      words: [
        ['chat','🐱'],['ours','🐻'],['lune','🌙'],['lait','🥛'],['chien','🐶'],['pomme','🍎'],['poire','🍐'],['arbre','🌳'],
        ['fleur','🌸'],['hibou','🦉'],['maison','🏠'],['soleil','☀️'],['étoile','⭐'],['canard','🦆'],['banane','🍌'],['gâteau','🎂'],
        ['poisson','🐟'],['voiture','🚗'],
      ],
    },
    es: {
      speech: 'es-ES',
      alphabet: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','Ñ','O','P','Q','R','S','T','U','V','W','X','Y','Z'],
      vowels: 'AEIOU',
      words: [
        ['sol','☀️'],['pez','🐟'],['oso','🐻'],['flor','🌸'],['gato','🐱'],['casa','🏠'],['luna','🌙'],['pera','🍐'],
        ['pato','🦆'],['búho','🦉'],['perro','🐶'],['árbol','🌳'],['coche','🚗'],['leche','🥛'],['ratón','🐭'],['pastel','🎂'],
        ['manzana','🍎'],['plátano','🍌'],['estrella','⭐'],
      ],
    },
  };

  const MEDALS = [   // id = ключ тексту назви медалі
    { id: 'edu.read.mFirst',   test: p => p.solved >= 1 },
    { id: 'edu.read.mStreak',  test: p => (p.best || 0) >= 10 },
    { id: 'edu.read.mLevel5',  test: p => p.level >= 5 },
    { id: 'edu.read.mSolved',  test: p => p.solved >= 50 },
  ];
  const PER_LEVEL = 5;

  /* ===================== УТИЛІТИ ===================== */
  const rnd = n => Math.floor(Math.random() * n);
  const pick = a => a[rnd(a.length)];
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function sample(a, n, not) { return shuffle(a.filter(x => !(not || []).includes(x))).slice(0, n); }

  /* ===================== ГОЛОС (Web Speech API) ===================== */
  const Speech = {
    ok() { try { return 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function'; } catch (e) { return false; } },
    voice(code) {
      if (!this.ok()) return null;
      try {
        const vs = window.speechSynthesis.getVoices() || [];
        const base = code.slice(0, 2).toLowerCase();
        return vs.find(v => (v.lang || '').toLowerCase().replace('_', '-') === code.toLowerCase()) ||
               vs.find(v => (v.lang || '').toLowerCase().slice(0, 2) === base) || null;
      } catch (e) { return null; }
    },
    say(text, code) {
      const v = this.voice(code); if (!v || !text) return false;
      try {
        window.speechSynthesis.cancel();
        const u = new window.SpeechSynthesisUtterance(text);
        u.voice = v; u.lang = v.lang; u.rate = 0.85; u.pitch = 1.1;
        window.speechSynthesis.speak(u);
        return true;
      } catch (e) { return false; }
    },
    stop() { try { if (this.ok()) window.speechSynthesis.cancel(); } catch (e) {} },
  };

  /* ===================== ГРА ===================== */
  let host = null, ctx = null, D = null, task = null, timers = [], onVoices = null, pendingMedals = [];

  function later(fn, ms) { const id = setTimeout(fn, ms); timers.push(id); return id; }
  function muted() { const s = BO.state; return !!(s && s.sound && s.sound.muted); }
  function up(s) { return s.toLocaleUpperCase(ctx.lang); }
  function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  function dataFor(lang) { return READ_DATA[lang] || READ_DATA.en; }
  // перша літера слова як літера абетки (É → E, Á → A); Й, Ї, Ё лишаються, бо вони є в абетці
  function firstLetter(w) {
    let L = up(w.charAt(0));
    if (!D.alphabet.includes(L)) L = L.normalize('NFD').charAt(0);
    return L;
  }
  function wordsBy(min, max) {
    let ws = D.words.filter(x => x[0].length >= min && x[0].length <= max);
    if (ws.length < 3) ws = D.words.slice();
    return ws;
  }

  function lvl() { return ctx.progress.level || 1; }

  // які типи завдань доступні для віку
  function taskTypes() {
    const b = ctx.band;
    if (b <= 5) return ['find', 'find', 'first'];
    if (b <= 8) return ['build', 'miss'];
    return D.sentences && D.sentences.length ? ['scram', 'spell', 'sent'] : ['scram', 'spell'];
  }

  /* ---------- генератори завдань ---------- */
  const GEN = {
    find() {
      const n = Math.min(6, 3 + Math.floor((lvl() - 1) / 2));
      const pool = D.alphabet.filter(x => x !== 'Ь' && x !== 'Ъ');
      const target = pick(pool);
      return { type: 'find', prompt: ctx.t('task.find'), big: target, say: target.toLocaleLowerCase(ctx.lang),
               opts: shuffle([target].concat(sample(pool, n - 1, [target]))), answer: target, cls: 'rdOptsLetters' };
    },
    first() {
      const n = Math.min(4, 3 + Math.floor((lvl() - 1) / 3));
      const w = pick(D.words.filter(x => D.alphabet.includes(firstLetter(x[0]))));
      const L = firstLetter(w[0]);
      const firsts = [...new Set(D.words.map(x => firstLetter(x[0])))].filter(x => x !== L);
      const extra = sample(firsts.length >= n - 1 ? firsts : D.alphabet, n - 1, [L]);
      return { type: 'first', prompt: ctx.t('task.first'), big: w[1], bigCls: 'rdEmoji', say: w[0],
               opts: shuffle([L].concat(extra)), answer: L, cls: 'rdOptsLetters' };
    },
    build() {
      const max = Math.min(6, 3 + Math.floor((lvl() - 1) / 2));
      const w = pick(wordsBy(3, max));
      const letters = [...up(w[0])];
      return { type: 'build', prompt: ctx.t('task.build'), big: w[1], bigCls: 'rdEmoji', say: w[0],
               word: letters, tiles: shuffleNotSame(letters) };
    },
    miss() {
      const max = Math.min(7, 4 + Math.floor((lvl() - 1) / 2));
      const w = pick(wordsBy(3, max));
      const letters = [...up(w[0])];
      const i = rnd(letters.length);
      const L = letters[i];
      const isV = D.vowels.includes(L);
      const pool = D.alphabet.filter(x => x !== L && (D.vowels.includes(x) === isV));
      // жодна пастка не має утворювати інше слово зі списку
      const others = new Set(D.words.map(x => up(x[0])));
      const n = lvl() >= 4 ? 4 : 3;
      const extra = sample(pool.filter(x => { const t = letters.slice(); t[i] = x; return !others.has(t.join('')); }), n - 1);
      const shown = letters.map((c, k) => k === i ? '_' : c).join('');
      return { type: 'miss', prompt: ctx.t('task.miss'), big: w[1], bigCls: 'rdEmoji', say: w[0], word2: shown,
               opts: shuffle([L].concat(extra)), answer: L, cls: 'rdOptsLetters' };
    },
    scram() {
      const min = Math.min(7, 4 + Math.floor((lvl() - 1) / 3));
      let ws = D.words.filter(x => x[0].length >= min);
      if (ws.length < 3) ws = D.words.filter(x => x[0].length >= 4);
      if (!ws.length) ws = D.words;
      const w = pick(ws);
      const letters = [...up(w[0])];
      const tiles = shuffleNotSame(letters);
      if (lvl() >= 3) tiles.splice(rnd(tiles.length + 1), 0, pick(D.alphabet.filter(x => !letters.includes(x))));
      return { type: 'scram', prompt: ctx.t('task.scram'), big: w[1], bigCls: 'rdEmoji', say: w[0], word: letters, tiles };
    },
    spell() {
      const w = pick(D.words.filter(x => x[0].length >= 4).length >= 3 ? D.words.filter(x => x[0].length >= 4) : D.words);
      const wrong = misspell(w[0], 2);
      return { type: 'spell', prompt: ctx.t('task.spell'), big: w[1], bigCls: 'rdEmoji', say: null,
               opts: shuffle([w[0]].concat(wrong)), answer: w[0], cls: 'rdOptsWords' };
    },
    sent() {
      const s = pick(D.sentences);
      return { type: 'sent', prompt: ctx.t('task.sent'), sentence: s[0], say: s[0],
               opts: shuffle(s.slice(1, 4)), answer: s[1], cls: 'rdOptsEmoji' };
    },
  };

  function shuffleNotSame(letters) {
    let t = letters;
    for (let k = 0; k < 8 && t.join('') === letters.join(''); k++) t = shuffle(letters);
    return t;
  }

  // помилкові варіанти слова: переставити сусідні літери / замінити голосну / подвоїти / пропустити літеру.
  // Першу й останню літеру не чіпаємо: заміна закінчення дає справжню форму слова (зірка → зірку).
  function misspell(word, n) {
    const out = new Set(), all = new Set(D.words.map(x => x[0]));
    const lowV = [...D.vowels].map(v => v.toLocaleLowerCase(ctx.lang));
    const ops = [
      w => { const i = w.length > 2 ? 1 + rnd(w.length - 2) : 0; const a = [...w]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a.join(''); },
      w => { const a = [...w]; const idx = a.map((c, i) => i > 0 && i < a.length - 1 && lowV.includes(c.toLocaleLowerCase(ctx.lang)) ? i : -1).filter(i => i >= 0);
             if (!idx.length) return w; const i = pick(idx); const isCap = a[i] !== a[i].toLocaleLowerCase(ctx.lang);
             let v = pick(lowV.filter(x => x !== a[i].toLocaleLowerCase(ctx.lang))); a[i] = isCap ? up(v) : v; return a.join(''); },
      w => { const i = 1 + rnd(Math.max(1, w.length - 2)); return w.slice(0, i) + w.charAt(i) + w.slice(i); },
      w => { if (w.length < 4) return w; const i = 1 + rnd(w.length - 2); return w.slice(0, i) + w.slice(i + 1); },
    ];
    for (let k = 0; k < 60 && out.size < n; k++) {
      const v = pick(ops)(word);
      if (v && v !== word && !all.has(v) && v.length >= 2) out.add(v);
    }
    let pad = 0;
    while (out.size < n) out.add(word + word.charAt(word.length - 1).repeat(++pad)); // запасний варіант (дуже короткі слова)
    return [...out];
  }

  /* ---------- малювання ---------- */
  function render() {
    host.innerHTML = '';
    const root = el('div', 'rdRoot');
    const top = el('div', 'rdTop');
    top.appendChild(el('span', 'rdLevel', BO.t('edu.level', { n: lvl() })));
    const dots = el('span', 'rdDots');
    const done = (ctx.progress.inLevel || 0);
    for (let i = 0; i < PER_LEVEL; i++) dots.appendChild(el('i', i < done ? 'on' : ''));
    top.appendChild(dots);
    const sp = el('button', 'rdSpeak', '🔊'); sp.type = 'button';
    sp.setAttribute('aria-label', ctx.t('listen'));
    sp.addEventListener('click', () => speak(true));
    top.appendChild(sp);
    root.appendChild(top);

    root.appendChild(el('p', 'rdPrompt fit', task.prompt));
    if (task.big) root.appendChild(el('div', 'rdBig ' + (task.bigCls || 'rdLetterBig'), task.big));
    if (task.word2) root.appendChild(el('div', 'rdWord', task.word2));
    if (task.sentence) root.appendChild(el('p', 'rdSentence', task.sentence));

    if (task.word) {   // скласти слово з плиток
      if (task.tiles.length > 7) root.classList.add('rdLong');
      const slots = el('div', 'rdSlots');
      task.word.forEach(() => slots.appendChild(el('span', 'rdSlot')));
      root.appendChild(slots);
      const tiles = el('div', 'rdTiles');
      task.tiles.forEach(c => { const b = el('button', 'rdTile', c); b.type = 'button'; b.addEventListener('click', () => tapTile(b, c)); tiles.appendChild(b); });
      root.appendChild(tiles);
      task.pos = 0;
    } else {
      const opts = el('div', 'rdOpts ' + task.cls);
      task.opts.forEach(o => { const b = el('button', 'rdOpt', o); b.type = 'button'; b.dataset.v = o; b.addEventListener('click', () => tapOpt(b, o)); opts.appendChild(b); });
      root.appendChild(opts);
    }
    root.appendChild(el('div', 'rdFeedback'));
    host.appendChild(root);
    updateSpeakBtn();
  }

  function updateSpeakBtn() {
    const b = host && host.querySelector('.rdSpeak'); if (!b) return;
    b.classList.toggle('rdHide', !task || !task.say || !Speech.voice(D.speech));
  }
  function speak(force) {
    if (!task || !task.say || (!force && muted())) return;
    Speech.say(task.say, D.speech);
  }

  function feedback(txt, cls) {
    const f = host.querySelector('.rdFeedback'); if (!f) return;
    f.textContent = txt; f.className = 'rdFeedback ' + (cls || '');
  }

  function wrong(btn) {
    task.mistakes = (task.mistakes || 0) + 1;
    ctx.progress.streak = 0;
    btn.classList.remove('rdShake'); void btn.offsetWidth; btn.classList.add('rdShake', 'rdBad');
    later(() => btn.classList.remove('rdBad'), 600);
    feedback(ctx.t('tryAgain'), 'bad');
  }

  function tapOpt(btn, v) {
    if (task.solved) return;
    if (v === task.answer) { btn.classList.add('rdGood'); solved(); } else wrong(btn);
  }

  function tapTile(btn, c) {
    if (task.solved || btn.disabled) return;
    if (c !== task.word[task.pos]) return wrong(btn);
    const slot = host.querySelectorAll('.rdSlot')[task.pos];
    slot.textContent = c; slot.classList.add('on');
    btn.disabled = true; btn.classList.add('rdUsed');
    task.pos++;
    if (task.pos >= task.word.length) solved();
  }

  function solved() {
    task.solved = true;
    const p = ctx.progress;
    p.streak = task.mistakes ? 0 : (p.streak || 0) + 1; // серія — лише завдання без помилки
    p.best = Math.max(p.best || 0, p.streak);
    p.inLevel = (p.inLevel || 0) + 1;
    let stars = 1, levelUp = false;
    if (p.inLevel >= PER_LEVEL) { p.inLevel = 0; p.level = (p.level || 1) + 1; stars += 1; levelUp = true; }
    // медалі: перевіряємо з урахуванням цього розв'язку (solved ще не збільшено хабом)
    const probe = Object.assign({}, p, { solved: (p.solved || 0) + 1 });
    MEDALS.forEach(m => { if (!p.medals.includes(m.id) && !pendingMedals.includes(m.id) && m.test(probe)) pendingMedals.push(m.id); });
    const medal = pendingMedals.shift() || null;   // хаб приймає одну медаль за раз; решта — з наступними перемогами
    ctx.win({ stars, medal });
    ctx.save();
    const praise = ctx.t(pick(['good1', 'good2', 'good3']));
    feedback(levelUp ? ctx.t('levelUp', { n: p.level }) : praise + ' +' + stars + ' ⭐', 'good');
    if (task.type === 'build' || task.type === 'scram' || task.type === 'miss' || task.type === 'first') speak(false);
    if (medal) showMedal(medal);
    host.querySelectorAll('.rdDots i').forEach((d, i) => d.classList.toggle('on', levelUp || i < p.inLevel));
    later(next, medal ? 2200 : 1300);
  }

  function showMedal(id) {
    const m = el('div', 'rdMedal');
    m.appendChild(el('b', '', '🏅'));
    m.appendChild(el('span', '', ctx.t('medal', { name: BO.t(id) })));
    host.appendChild(m);
  }

  function next() {
    const types = taskTypes();
    let tp = pick(types);
    if (task && types.length > 1 && tp === task.type && Math.random() < 0.6) tp = pick(types.filter(x => x !== task.type));
    task = GEN[tp]();
    render();
    if (task.type === 'find' || task.type === 'sent') speak(false);
  }

  BO.edu.register({
    id: 'read', slot: 4, icon: '🔤', pilot: true,
    start(h, c) {
      host = h; ctx = c; D = dataFor(c.lang); task = null; timers = []; pendingMedals = [];
      const p = ctx.progress;
      if (!Array.isArray(p.medals)) p.medals = [];
      if (typeof p.inLevel !== 'number') p.inLevel = 0;
      if (Speech.ok()) {
        onVoices = () => updateSpeakBtn();
        try { window.speechSynthesis.addEventListener('voiceschanged', onVoices); window.speechSynthesis.getVoices(); } catch (e) { onVoices = null; }
      }
      next();
    },
    stop() {
      timers.forEach(clearTimeout); timers = [];
      Speech.stop();
      if (onVoices) { try { window.speechSynthesis.removeEventListener('voiceschanged', onVoices); } catch (e) {} onVoices = null; }
      if (host) host.innerHTML = '';
      host = null; task = null;
    },
  });

  // для тестів і для носіїв мов (перевірити свої дані в консолі)
  BO.eduRead = { data: READ_DATA, medals: MEDALS.map(m => m.id), current: () => task };
})();
