/* OTOTO — модуль «Свята і пори року». CoLaba Production.
   Країна, яку дитина обрала при активації (state.country), визначає, які свята
   вона бачить у грі весь час: святкова прикраса кімнати, привітання від
   улюбленця раз на день, разовий подарунок ⭐ (зароблені бали, НЕ гроші),
   святкові бульбашки-бонуси, святковий одяг і декор.
   Жодних таймерів «купи зараз», жодних штрафів: свято — тільки радість.

   Як додати свято: один запис у HOLIDAYS (нижче) + 'hol.name.<id>' і
   'hol.greet.<id>' у кожній мові. Більше нічого міняти не треба.
   Правило дати (rule):
     '12-25'                      — фіксована дата (місяць-день)
     { m: 5, wd: 0, n: 2 }        — n-й день тижня місяця (wd: 0=нд … 6=сб; n: -1 = останній)
     { easter: 'w'|'o', off: -21 }— від Великодня (w — західний, o — православний), ± днів
     { fn: y => Date }            — особливе правило
   countries: 'all' або масив кодів; except — винятки; rules — свої дати для окремих країн.
   len — скільки днів триває саме свято (привітання/подарунок), pre — скільки днів
   до нього кімната вже прикрашена. Порядок у масиві = пріоритет, якщо свят кілька.
   Ядро (app.js) не правиться: усе через window.BO. */
(function () {
  'use strict';

  /* ================= ДАТИ ================= */
  const DAY = 86400000;
  const mk = (y, m, d) => new Date(y, m - 1, d, 12, 0, 0, 0);       // полудень — без сюрпризів переходу на літній час
  const addDays = (dt, n) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + n, 12, 0, 0, 0);
  const pad = n => (n < 10 ? '0' : '') + n;
  const ymd = dt => dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate());
  const dayNum = dt => Math.round(mk(dt.getFullYear(), dt.getMonth() + 1, dt.getDate()).getTime() / DAY);

  // Західний (григоріанський) Великдень — алгоритм Міуса/Джонса/Батчера.
  function easterWestern(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return mk(y, month, day);
  }
  // Православний Великдень — юліанський алгоритм Міуса + різниця календарів (13 днів у 1900–2099).
  function easterOrthodox(y) {
    const a = y % 4, b = y % 7, c = y % 19;
    const d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
    const month = Math.floor((d + e + 114) / 31), day = ((d + e + 114) % 31) + 1;
    const shift = Math.floor(y / 100) - Math.floor(y / 400) - 2;  // 13 для 1900–2099
    return addDays(mk(y, month, day), shift);
  }
  // n-й день тижня wd у місяці m (n = -1 — останній)
  function nthWeekday(y, m, wd, n) {
    if (n > 0) {
      const first = mk(y, m, 1);
      return mk(y, m, 1 + ((wd - first.getDay() + 7) % 7) + (n - 1) * 7);
    }
    const last = new Date(y, m, 0, 12);
    return addDays(last, -((last.getDay() - wd + 7) % 7));
  }
  function evalRule(r, y) {
    if (!r) return null;
    if (typeof r === 'string') { const [m, d] = r.split('-').map(Number); return mk(y, m, d); }
    if (r.fn) return r.fn(y);
    if (r.easter) return addDays(r.easter === 'o' ? easterOrthodox(y) : easterWestern(y), r.off || 0);
    if (r.wd !== undefined) return nthWeekday(y, r.m, r.wd, r.n);
    return null;
  }

  /* ================= КАЛЕНДАР ================= */
  // Групи країн (коди з countries.js)
  const WEST_EASTER = ['us', 'ca', 'gb', 'ie', 'pl', 'de', 'at', 'ch', 'fr', 'be', 'nl', 'lu', 'it', 'es', 'pt',
    'cz', 'sk', 'hu', 'hr', 'si', 'lt', 'lv', 'ee', 'fi', 'se', 'no', 'dk', 'is', 'mt', 'am', 'al', 'ba'];
  const ORTH_EASTER = ['ua', 'md', 'ge', 'ro', 'bg', 'gr', 'cy', 'rs', 'me', 'mk', 'ba', 'al'];
  const CENTRAL_ASIA_AZ = ['kz', 'uz', 'kg', 'tj', 'tm', 'az'];
  const XMAS_DEC25 = WEST_EASTER.filter(c => c !== 'am').concat(['ua', 'md', 'ro', 'bg', 'gr', 'cy']);
  const SECOND_SUN_MAY = { m: 5, wd: 0, n: 2 };
  const FIRST_SUN_MAY = { m: 5, wd: 0, n: 1 };
  const LAST_SUN_MAY = { m: 5, wd: 0, n: -1 };
  // Франція: остання неділя травня, а якщо це Трійця — перша неділя червня
  const FR_MOTHERS = { fn: y => {
    const d = nthWeekday(y, 5, 0, -1);
    return dayNum(d) === dayNum(addDays(easterWestern(y), 49)) ? addDays(d, 7) : d;
  } };
  // Нідерланди: 27 квітня, а якщо неділя — 26-го
  const NL_KINGS = { fn: y => { const d = mk(y, 4, 27); return d.getDay() === 0 ? mk(y, 4, 26) : d; } };
  // Швеція/Фінляндія: Іванів вечір — п'ятниця між 19 і 25 червня
  const MIDSUMMER_FRI = { fn: y => { const d = mk(y, 6, 19); return addDays(d, (5 - d.getDay() + 7) % 7); } };

  // День країни — святковий «день народження» країни (без військових дат)
  const NATIONAL = {
    ua: '8-24', md: '8-27', kz: '10-25', uz: '9-1', kg: '8-31', tj: '9-9', tm: '9-27', az: '5-28',
    am: '9-21', ge: '5-26', us: '7-4', ca: '7-1', pl: '11-11', de: '10-3', at: '10-26', ch: '8-1',
    fr: '7-14', be: '7-21', lu: '6-23', it: '6-2', pt: '6-10', cz: '10-28', hu: '8-20', ro: '12-1',
    si: '6-25', hr: '5-30', rs: '2-15', me: '7-13', mk: '9-8', al: '11-28', lt: '2-16', lv: '11-18',
    ee: '2-24', fi: '12-6', se: '6-6', no: '5-17', dk: '6-5', is: '6-17', mt: '9-21',
  };

  const HOLIDAYS = [
    { id: 'christmas',   theme: 'christmas', emoji: '🎄', countries: XMAS_DEC25, rule: '12-24', len: 3, pre: 7, gift: 20 },
    { id: 'christmas_o', theme: 'christmas', emoji: '🎄', countries: ['md', 'ge', 'rs', 'me', 'mk', 'ba', 'am'],
      rule: '1-7', rules: { am: '1-6' }, len: 1, pre: 0, gift: 15 },
    { id: 'new_year',    theme: 'newyear',   emoji: '🎆', countries: 'all', rule: '12-31', len: 2, pre: 5, gift: 20 },
    { id: 'st_nicholas', theme: 'nicholas',  emoji: '🎁', countries: ['ua', 'pl', 'de', 'at', 'ch', 'be', 'nl', 'lu', 'cz', 'sk', 'hu', 'hr', 'si', 'ro'],
      rule: '12-6', rules: { nl: '12-5' }, len: 1, pre: 1, gift: 15 },
    { id: 'lucia',       theme: 'lucia',     emoji: '🕯️', countries: ['se'], rule: '12-13', len: 1, pre: 0, gift: 10 },
    { id: 'three_kings', theme: 'kings',     emoji: '👑', countries: ['es'], rule: '1-6', len: 1, pre: 1, gift: 15 },
    { id: 'befana',      theme: 'kings',     emoji: '🧹', countries: ['it'], rule: '1-6', len: 1, pre: 0, gift: 15 },
    { id: 'easter_w',    theme: 'easter',    emoji: '🐣', countries: WEST_EASTER, rule: { easter: 'w' }, len: 2, pre: 3, gift: 15 },
    { id: 'easter_o',    theme: 'easter',    emoji: '🐣', countries: ORTH_EASTER, rule: { easter: 'o' }, len: 2, pre: 3, gift: 15 },
    { id: 'pancake_day', theme: 'pancake',   emoji: '🥞', countries: ['gb', 'ie'], rule: { easter: 'w', off: -47 }, len: 1, pre: 0, gift: 10 },
    { id: 'valentine',   theme: 'valentine', emoji: '💗', countries: 'all', except: ['uz', 'tj', 'tm'], rule: '2-14', len: 1, pre: 1, gift: 10 },
    { id: 'martisor',    theme: 'martisor',  emoji: '🌼', countries: ['ro', 'md', 'bg'], rule: '3-1', len: 1, pre: 0, gift: 10 },
    { id: 'womens_day',  theme: 'moms',      emoji: '💐', countries: ['kz', 'uz', 'kg', 'tj', 'tm', 'az', 'md'], rule: '3-8', len: 1, pre: 0, gift: 10 },
    { id: 'st_patrick',  theme: 'patrick',   emoji: '🍀', countries: ['ie', 'us', 'ca'], rule: '3-17', len: 1, pre: 0, gift: 10 },
    { id: 'nowruz',      theme: 'nowruz',    emoji: '🌷', countries: CENTRAL_ASIA_AZ, rule: '3-21', rules: { az: '3-20' },
      len: 3, pre: 3, gift: 20 },
    { id: 'earth_day',   theme: 'earth',     emoji: '🌍', countries: 'all', rule: '4-22', len: 1, pre: 0, gift: 10 },
    { id: 'kings_day',   theme: 'orange',    emoji: '🧡', countries: ['nl'], rule: NL_KINGS, len: 1, pre: 0, gift: 10 },
    { id: 'mothers_day', theme: 'moms',      emoji: '💐',
      countries: ['us', 'ca', 'ua', 'de', 'at', 'ch', 'be', 'nl', 'it', 'dk', 'fi', 'ee', 'is', 'hr', 'cz', 'sk', 'gr', 'cy', 'lv',
        'gb', 'ie', 'pl', 'fr', 'lu', 'es', 'pt', 'lt', 'hu', 'ro', 'se', 'no', 'ge', 'am', 'si', 'mt'],
      rule: SECOND_SUN_MAY,
      rules: { gb: { easter: 'w', off: -21 }, ie: { easter: 'w', off: -21 }, pl: '5-26', fr: FR_MOTHERS,
        es: FIRST_SUN_MAY, pt: FIRST_SUN_MAY, lt: FIRST_SUN_MAY, hu: FIRST_SUN_MAY, ro: FIRST_SUN_MAY,
        se: LAST_SUN_MAY, no: { m: 2, wd: 0, n: 2 }, ge: '3-3', am: '4-7', si: '3-25', lu: { m: 6, wd: 0, n: 2 } },
      len: 1, pre: 0, gift: 10 },
    { id: 'vyshyvanka',  theme: 'vyshyvanka', emoji: '🌺', countries: ['ua'], rule: { m: 5, wd: 4, n: 3 }, len: 1, pre: 0, gift: 10 },
    { id: 'children_day', theme: 'children', emoji: '🎈',
      countries: ['ua', 'md', 'kz', 'uz', 'kg', 'tj', 'tm', 'az', 'am', 'ge', 'pl', 'cz', 'sk', 'ro', 'bg', 'pt', 'al', 'mk',
        'lt', 'lv', 'si', 'rs', 'ba', 'me', 'hr', 'hu', 'de'],
      rule: '6-1', rules: { hu: LAST_SUN_MAY, de: '9-20' }, len: 1, pre: 0, gift: 20 },
    { id: 'midsummer',   theme: 'midsummer', emoji: '🌼', countries: ['se', 'fi', 'lv', 'ee', 'lt', 'no', 'dk'],
      rule: '6-23', rules: { se: MIDSUMMER_FRI, fi: MIDSUMMER_FRI, lt: '6-24' }, len: 2, pre: 0, gift: 10 },
    { id: 'knowledge_day', theme: 'school',  emoji: '🎒', countries: ['ua', 'md', 'kz', 'kg', 'tj', 'tm', 'am', 'az'], rule: '9-1', len: 1, pre: 0, gift: 10 },
    { id: 'national',    theme: 'national',  emoji: '🎉', countries: Object.keys(NATIONAL), rule: null, rules: NATIONAL, len: 1, pre: 0, gift: 15 },
    { id: 'thanksgiving', theme: 'thanks',   emoji: '🥧', countries: ['us', 'ca'], rule: { m: 11, wd: 4, n: 4 },
      rules: { ca: { m: 10, wd: 1, n: 2 } }, len: 1, pre: 2, gift: 15 },
    { id: 'halloween',   theme: 'halloween', emoji: '🎃', countries: ['us', 'ca', 'ie', 'gb'], rule: '10-31', len: 1, pre: 6, gift: 15 },
  ];

  // Пори року (метеорологічні). Усі країни каталогу — у північній півкулі;
  // для південної півкулі досить додати країну в SOUTH.
  const SOUTH = [];
  const SEASONS_N = [['winter', 12], ['spring', 3], ['summer', 6], ['autumn', 9]];
  const SEASON_EMOJI = { winter: '❄️', spring: '🌸', summer: '☀️', autumn: '🍂' };
  function seasonFor(dt, cc) {
    let m = dt.getMonth() + 1;
    if (SOUTH.includes(cc)) m = ((m + 5) % 12) + 1;
    const id = m === 12 || m <= 2 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'autumn';
    // рік сезону: зима грудня-лютого — за роком грудня
    const y = dt.getFullYear() - (id === 'winter' && m <= 2 ? 1 : 0);
    const startM = SEASONS_N.find(s => s[0] === id)[1];
    const start = SOUTH.includes(cc) ? null : mk(y, startM, 1);
    const end = start ? addDays(new Date(y, startM + 2, 1, 12), -1) : null; // останній день 3-го місяця
    return { id, key: id + '@' + y, emoji: SEASON_EMOJI[id], start, end };
  }

  function holidayAppliesTo(h, cc) {
    if (h.except && h.except.includes(cc)) return false;
    return h.countries === 'all' || h.countries.includes(cc);
  }
  function ruleFor(h, cc) { return (h.rules && h.rules[cc]) || h.rule; }
  function occurrence(h, cc, y) {
    if (!holidayAppliesTo(h, cc)) return null;
    const start = evalRule(ruleFor(h, cc), y);
    if (!start) return null;
    return { h, start, end: addDays(start, (h.len || 1) - 1), year: y };
  }

  // Усе, що діє на дату: свято (у день або в дні підготовки) + пора року.
  function activeFor(date, cc) {
    const dt = date instanceof Date ? date : new Date(date);
    const n = dayNum(dt), y = dt.getFullYear();
    const all = [];
    HOLIDAYS.forEach(h => {
      [y - 1, y, y + 1].forEach(yy => {
        const o = occurrence(h, cc, yy);
        if (!o) return;
        const s = dayNum(o.start), e = dayNum(o.end);
        if (n >= s && n <= e) all.push(Object.assign({ phase: 'day', key: h.id + '@' + yy }, o));
        else if (n < s && n >= s - (h.pre || 0)) all.push(Object.assign({ phase: 'pre', key: h.id + '@' + yy }, o));
      });
    });
    const order = h => HOLIDAYS.indexOf(h);
    all.sort((a, b) => (a.phase === b.phase ? 0 : a.phase === 'day' ? -1 : 1) || order(a.h) - order(b.h));
    return { holiday: all[0] || null, holidays: all, season: seasonFor(dt, cc) };
  }

  function list(cc, year) {
    return HOLIDAYS.map(h => occurrence(h, cc, year)).filter(Boolean)
      .map(o => ({ id: o.h.id, date: ymd(o.start), end: ymd(o.end), len: o.h.len || 1, theme: o.h.theme, emoji: o.h.emoji }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }

  // Вікно для сезонного предмета. Свята з tags, які є в країні дитини, діють
  // разом (гарбуз — і на Гелловін, і на День подяки); 'season:<пора>' — лише
  // запасний варіант, якщо жодного з цих свят у країні немає (точно пора року,
  // без pre/post). Повертає [from, until] (Date) — поточне або найближче наступне.
  function windowFor(tags, pre, post, cc, now) {
    const n = dayNum(now), y = now.getFullYear();
    const pickWin = cands => {
      if (!cands.length) return null;
      cands.sort((a, b) => a[0] - b[0]);
      return cands.find(c => n >= dayNum(c[0]) && n <= dayNum(c[1])) ||
        cands.find(c => dayNum(c[0]) > n) || cands[cands.length - 1];
    };
    const hol = [];
    tags.filter(t => !t.startsWith('season:')).forEach(tag => {
      const h = HOLIDAYS.find(x => x.id === tag);
      if (!h || !holidayAppliesTo(h, cc)) return;
      [y - 1, y, y + 1].forEach(yy => {
        const o = occurrence(h, cc, yy);
        if (o) hol.push([addDays(o.start, -pre), addDays(o.end, post)]);
      });
    });
    if (hol.length) return pickWin(hol);
    const season = tags.find(t => t.startsWith('season:'));
    if (!season) return null;
    const startM = SEASONS_N.find(s => s[0] === season.slice(7))[1];
    return pickWin([y - 1, y, y + 1].map(yy => [mk(yy, startM, 1), addDays(new Date(yy, startM + 2, 1, 12), -1)]));
  }

  // Тестовий/налагоджувальний доступ (працює і в node — без DOM)
  const API = {
    activeFor(date, country) {
      const a = activeFor(date, country);
      const pick = o => o && { id: o.h.id, theme: o.h.theme, emoji: o.h.emoji, phase: o.phase, start: ymd(o.start), end: ymd(o.end) };
      return { holiday: pick(a.holiday), holidays: a.holidays.map(pick), season: { id: a.season.id, emoji: a.season.emoji } };
    },
    list,
    easterWestern: y => ymd(easterWestern(y)),
    easterOrthodox: y => ymd(easterOrthodox(y)),
    dateOf(id, country, year) { const h = HOLIDAYS.find(x => x.id === id); const o = h && occurrence(h, country, year); return o ? ymd(o.start) : null; },
    HOLIDAYS,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window === 'undefined') return;
  window.BO_HOLIDAYS = API;
  if (!window.BO) return;

  /* ================= ГРА ================= */
  const BO = window.BO;
  const T = (k, v) => BO.t('hol.' + k, v);

  // Як виглядає кожна тема в кімнаті. fall — падає згори, rise — піднімається,
  // fly — пролітає, burst — спалахи-феєрверки, floor — стоїть на підлозі,
  // garland — гірлянда вгорі, band — стрічка-орнамент. bonus — що в бульбашках.
  const THEMES = {
    winter:    { fall: ['❄️', '❄', '✻'], n: 12, bonus: ['⭐', '❄️', '⛄', '🧤'] },
    spring:    { fall: ['🌸', '🌼'], n: 7, drift: true, bonus: ['⭐', '🌸', '🌷', '🐝'] },
    summer:    { fly: ['🦋', '🐝'], n: 3, glow: 'sun', bonus: ['⭐', '🍉', '🍦', '🍓'] },
    autumn:    { fall: ['🍂', '🍁'], n: 8, leaf: true, bonus: ['⭐', '🍂', '🍎', '🌰'] },
    newyear:   { fall: ['✨', '❄️'], n: 8, burst: ['🎆', '🎇', '✨'], garland: true, floor: ['🎄', '🎁'], bonus: ['⭐', '🎁', '🍬', '🎉'] },
    christmas: { fall: ['❄️', '❄'], n: 10, garland: true, floor: ['🎄', '🎁'], bonus: ['⭐', '🎁', '🍪', '🔔'] },
    nicholas:  { fall: ['⭐', '❄️'], n: 8, floor: ['🎁', '🍬'], bonus: ['⭐', '🍬', '🍊', '🎁'] },
    lucia:     { fall: ['✨', '❄️'], n: 7, floor: ['🕯️', '🕯️'], bonus: ['⭐', '🕯️', '🍪', '✨'] },
    kings:     { fall: ['⭐', '✨'], n: 8, floor: ['👑', '🎁'], bonus: ['⭐', '👑', '🍬', '🎁'] },
    easter:    { fall: ['🌸'], n: 5, drift: true, floor: ['🥚', '🐣', '🌷'], bonus: ['⭐', '🥚', '🐣', '🌷'] },
    pancake:   { fall: ['✨'], n: 5, floor: ['🥞', '🍯'], bonus: ['⭐', '🥞', '🍓', '🍯'] },
    valentine: { rise: ['💗', '💖', '💕'], n: 9, bonus: ['⭐', '💗', '💌', '🍫'] },
    martisor:  { fall: ['🌼', '🌸'], n: 6, drift: true, band: 'martisor', bonus: ['⭐', '🌼', '🌸', '🎀'] },
    moms:      { rise: ['💐', '🌷', '💗'], n: 7, floor: ['💐'], bonus: ['⭐', '💐', '🌷', '💗'] },
    patrick:   { fall: ['🍀', '☘️'], n: 8, floor: ['🌈'], bonus: ['⭐', '🍀', '🌈', '🪙'] },
    nowruz:    { fall: ['🌸', '🌷'], n: 7, drift: true, floor: ['🌱', '🌷'], bonus: ['⭐', '🌱', '🌷', '🍯'] },
    earth:     { rise: ['🌱', '🍃'], n: 7, floor: ['🌍'], bonus: ['⭐', '🌱', '🌍', '🌳'] },
    orange:    { fall: ['🧡', '🎉'], n: 8, floor: ['👑'], bonus: ['⭐', '🧡', '👑', '🍊'] },
    vyshyvanka: { fall: ['🌺', '🌸'], n: 6, drift: true, band: 'embroidery', bonus: ['⭐', '🌺', '🌻', '🌾'] },
    children:  { rise: ['🎈', '🎈', '🎈'], n: 7, fall: ['🎉'], bonus: ['⭐', '🎈', '🍭', '🧸'] },
    midsummer: { fall: ['🌼', '🌸'], n: 6, drift: true, floor: ['🌿'], bonus: ['⭐', '🌼', '🍓', '🌿'] },
    school:    { fall: ['✨', '🍁'], n: 5, floor: ['📚', '🍎'], bonus: ['⭐', '📚', '✏️', '🍎'] },
    national:  { fall: ['🎉', '✨'], n: 8, burst: ['🎆', '🎇'], bonus: ['⭐', '🎉', '🎈', '🍬'] },
    thanks:    { fall: ['🍂', '🍁'], n: 7, leaf: true, floor: ['🥧', '🌽'], bonus: ['⭐', '🥧', '🌽', '🍎'] },
    halloween: { fly: ['🦇', '👻'], n: 3, fall: ['🍂'], floor: ['🎃', '🎃'], bonus: ['⭐', '🍬', '🎃', '🍭'] },
  };

  // Святковий одяг. tags — свята за порядком: береться перше, яке є в країні
  // дитини ('season:<пора>' — пора року, є всюди). pre/post — днів до/після.
  const WARDROBE = [
    { id: 'hat_santa',     tags: ['christmas', 'christmas_o', 'new_year'], pre: 24, post: 14 }, // уже є в app.js
    { id: 'hat_top',       emoji: '🎩', gender: 'any',  tags: ['new_year'], pre: 10, post: 7, place: { top: -20, right: -2, rotate: 0 } },
    { id: 'scarf_winter',  emoji: '🧣', gender: 'any',  tags: ['season:winter'], pre: 0, post: 0, place: { top: 50, right: 44, rotate: -8 } },
    { id: 'clip_heart',    emoji: '💖', gender: 'any',  tags: ['valentine', 'mothers_day'], pre: 7, post: 3, place: { top: -8, right: 10, rotate: -15 } },
    { id: 'ears_bunny',    emoji: '🐰', gender: 'any',  tags: ['easter_w', 'easter_o', 'nowruz', 'season:spring'], pre: 7, post: 7, place: { top: -22, right: -2, rotate: 0 } },
    { id: 'wreath_flower', emoji: '🌼', gender: 'any',  tags: ['vyshyvanka', 'martisor', 'nowruz', 'midsummer', 'season:spring'], pre: 7, post: 7, place: { top: -10, right: 8, rotate: -10 } },
    { id: 'hat_summer',    emoji: '👒', gender: 'any',  tags: ['season:summer'], pre: 0, post: 0, place: { top: -20, right: -2, rotate: 0 } },
    { id: 'hat_pumpkin',   emoji: '🎃', gender: 'any',  tags: ['halloween', 'season:autumn'], pre: 14, post: 3, place: { top: -20, right: -2, rotate: 0 } },
  ];

  // Святковий декор кімнати (у каталог decor.js через BO.decor.items).
  // Видно в магазині декору тільки у своє вікно; куплене лишається назавжди.
  const DECOR = [
    { id: 'hol_tree',     slot: 'floorL', emoji: '🎄', price: 40, tags: ['christmas', 'christmas_o', 'new_year'], pre: 24, post: 14 },
    { id: 'hol_snowman',  slot: 'floorR', emoji: '☃️', price: 50, tags: ['season:winter'], pre: 0, post: 0 },
    { id: 'hol_winsnow',  slot: 'window', emoji: '❄️', price: 60, tags: ['season:winter'], pre: 0, post: 0, bg: 'linear-gradient(#9fc3e8,#e6f2ff)' },
    { id: 'hol_heart',    slot: 'wall',   emoji: '💝', price: 25, tags: ['valentine', 'mothers_day'], pre: 7, post: 3 },
    { id: 'hol_chick',    slot: 'shelf',  emoji: '🐣', price: 30, tags: ['easter_w', 'easter_o', 'nowruz'], pre: 7, post: 7 },
    { id: 'hol_tulip',    slot: 'shelf',  emoji: '🌷', price: 25, tags: ['season:spring'], pre: 0, post: 0 },
    { id: 'hol_pumpkin',  slot: 'floorR', emoji: '🎃', price: 30, tags: ['halloween', 'thanksgiving', 'season:autumn'], pre: 14, post: 3 },
  ];

  const today = () => new Date();
  const cc = () => (BO.state && BO.state.country) || 'ua';
  const visible = id => { const el = document.getElementById(id); return !!el && !el.classList.contains('hidden'); };
  const localStart = d => ymd(d) + 'T00:00:00';
  const localEnd = d => ymd(d) + 'T23:59:59';

  function hs() {
    const s = BO.state;
    if (!s.hol || typeof s.hol !== 'object') s.hol = { greetDay: null, gifts: [], seasons: [] };
    if (!Array.isArray(s.hol.gifts)) s.hol.gifts = [];
    if (!Array.isArray(s.hol.seasons)) s.hol.seasons = [];
    return s.hol;
  }

  /* ---------- одяг: вікна з календаря країни ---------- */
  const FAR_PAST = { from: '2000-01-01T00:00:00', until: '2000-01-02T00:00:00' };
  function syncWardrobe() {
    const W = BO.CONFIG.wardrobe, now = today();
    WARDROBE.forEach(def => {
      let item = W.find(w => w.id === def.id);
      if (!item) {
        if (!def.emoji) return;
        item = { id: def.id, emoji: def.emoji, gender: def.gender, unlock: { type: 'seasonal' }, place: def.place };
        W.push(item);
      }
      item.holiday = def.tags[0];
      const win = windowFor(def.tags, def.pre, def.post, cc(), now);
      item.unlock = win ? { type: 'seasonal', from: localStart(win[0]), until: localEnd(win[1]) } : Object.assign({ type: 'seasonal' }, FAR_PAST);
    });
  }

  /* ---------- декор: святкові речі в каталозі decor.js ---------- */
  function syncDecor() {
    if (!BO.decor || !Array.isArray(BO.decor.items) || !BO.state) return false;
    const items = BO.decor.items, now = today(), n = dayNum(now);
    const owned = (BO.state.decor && Array.isArray(BO.state.decor.owned)) ? BO.state.decor.owned : [];
    DECOR.forEach(def => {
      const win = windowFor(def.tags, def.pre, def.post, cc(), now);
      const inWin = !!win && n >= dayNum(win[0]) && n <= dayNum(win[1]);
      const idx = items.findIndex(i => i.id === def.id);
      const want = inWin || owned.includes(def.id);
      if (want && idx < 0) {
        const it = { id: def.id, slot: def.slot, emoji: def.emoji, price: def.price, holiday: def.tags[0] };
        if (def.bg) it.bg = def.bg;
        items.push(it);
      } else if (!want && idx >= 0) items.splice(idx, 1);
    });
    return true;
  }
  // Одразу при завантаженні (до init decor.js не встигне — він раніше, тож
  // додаємо вже куплені святкові речі ще до того, як BO викличе init і decor
  // перевірить кімнату на «речі, яких немає в каталозі»).
  try { if (BO.state) syncDecor(); } catch (e) { console.error('[holidays decor]', e); }

  /* ---------- прикраса кімнати ---------- */
  let layer = null, layerKey = null, badge = null;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function ensureLayer() {
    if (layer && layer.isConnected) return layer;
    const stage = document.getElementById('stage');
    if (!stage) return null;
    layer = document.createElement('div');
    layer.id = 'holLayer';
    layer.setAttribute('aria-hidden', 'true');
    const room = document.getElementById('decorRoom');
    stage.insertBefore(layer, room ? room.nextSibling : stage.firstChild);
    layerKey = null;
    return layer;
  }

  function span(cls, txt, vars) {
    const s = document.createElement('span');
    s.className = cls; s.textContent = txt;
    if (vars) Object.keys(vars).forEach(k => s.style.setProperty(k, vars[k]));
    return s;
  }

  function paintLayer(themeId) {
    const L = ensureLayer();
    if (!L) return;
    const key = themeId + '|' + (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'r' : 'm');
    if (layerKey === key) return;
    layerKey = key;
    L.innerHTML = '';
    L.className = 'hol-' + themeId;
    const th = THEMES[themeId];
    if (!th) return;
    const n = th.n || 6;
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    if (th.glow) L.appendChild(span('hol-glow', ''));
    if (th.band) L.appendChild(span('hol-band hol-band-' + th.band, ''));
    if (th.garland) {
      const g = span('hol-garland', '');
      for (let i = 0; i < 11; i++) g.appendChild(span('hol-bulb', '', { '--i': i }));
      L.appendChild(g);
    }
    if (th.fall) {
      const cnt = th.rise || th.fly ? Math.ceil(n / 2) : n;
      for (let i = 0; i < cnt; i++) {
        const cls = 'hol-p ' + (th.leaf ? 'hol-leaf' : th.drift ? 'hol-drift' : 'hol-fall');
        L.appendChild(span(cls, pick(th.fall), {
          '--x': rnd(2, 94).toFixed(1) + '%', '--d': rnd(7, 13).toFixed(1) + 's', '--dl': (-rnd(0, 13)).toFixed(1) + 's',
          '--s': rnd(0.7, 1.15).toFixed(2), '--sw': rnd(-26, 26).toFixed(0) + 'px',
        }));
      }
    }
    if (th.rise) for (let i = 0; i < n; i++) {
      L.appendChild(span('hol-p hol-rise', pick(th.rise), {
        '--x': rnd(4, 92).toFixed(1) + '%', '--d': rnd(7, 12).toFixed(1) + 's', '--dl': (-rnd(0, 12)).toFixed(1) + 's',
        '--s': rnd(0.75, 1.15).toFixed(2), '--sw': rnd(-20, 20).toFixed(0) + 'px',
      }));
    }
    if (th.fly) for (let i = 0; i < n; i++) {
      L.appendChild(span('hol-p hol-fly' + (i % 2 ? ' rtl' : ''), th.fly[i % th.fly.length], {
        '--y': rnd(8, 46).toFixed(0) + '%', '--d': rnd(11, 17).toFixed(1) + 's', '--dl': (-rnd(0, 16)).toFixed(1) + 's',
      }));
    }
    if (th.burst) for (let i = 0; i < 4; i++) {
      L.appendChild(span('hol-p hol-burst', th.burst[i % th.burst.length], {
        '--x': rnd(22, 78).toFixed(0) + '%', '--y': rnd(8, 40).toFixed(0) + '%', '--d': rnd(2.6, 3.8).toFixed(1) + 's', '--dl': (i * 0.9).toFixed(1) + 's',
      }));
    }
    if (th.floor) th.floor.forEach((e, i) => {
      // між килимком і ногами улюбленця, не на слотах декору
      const side = i % 2 ? 'r' : 'l', k = Math.floor(i / 2);
      L.appendChild(span('hol-floor ' + side, e, { '--k': k }));
    });
  }

  function renderBadge(active) {
    const stage = document.getElementById('stage');
    if (!stage) return;
    if (!badge || !badge.isConnected) {
      badge = document.createElement('button');
      badge.type = 'button';
      badge.id = 'holBadge';
      badge.addEventListener('click', e => { e.stopPropagation(); showGreeting(true); });
      stage.appendChild(badge);
    }
    const h = active.holiday;
    if (!h) { badge.classList.add('hidden'); return; }
    badge.classList.remove('hidden');
    badge.classList.toggle('pre', h.phase === 'pre');
    badge.textContent = h.h.emoji + ' ' + holName(h.h);
    badge.setAttribute('aria-label', holName(h.h));
  }

  function countryName() {
    const c = (window.BO_COUNTRIES || []).find(x => x.code === cc());
    return c ? c.name.split(' · ')[0] : '';
  }
  function holName(h) { return T('name.' + h.id, { country: countryName() }); }

  /* ---------- бульбашки-бонуси у святковому вбранні ---------- */
  let bonusOrig = null;
  function syncBonus(themeId) {
    const B = window.BO_BONUS;
    if (!B || !B.CFG || !Array.isArray(B.CFG.items)) return;
    if (!bonusOrig) bonusOrig = B.CFG.items.slice();
    const th = THEMES[themeId];
    B.CFG.items = (th && th.bonus) ? th.bonus.slice() : bonusOrig.slice();
  }

  /* ---------- привітання + подарунок ---------- */
  let pendingHolClass = false;
  function canShowModal() {
    if (!BO.state || !visible('view-main')) return false;
    return !['eventModal', 'statModal', 'langModal', 'mamaOverlay'].some(visible);
  }

  function showGreeting(manual) {
    const st = BO.state;
    if (!st) return false;
    const a = activeFor(today(), cc());
    const h = a.holiday;
    const H = hs(), name = st.name;
    let emoji, text, giftN = 0;
    if (h && h.phase === 'day') {
      emoji = h.h.emoji;
      text = T('greet.' + h.h.id, { name, country: countryName() });
      if (!H.gifts.includes(h.key)) { giftN = h.h.gift || 10; H.gifts.push(h.key); }
      H.greetDay = ymd(today());
    } else if (h && manual) {
      emoji = h.h.emoji;
      text = T('soon', { name, holiday: holName(h.h) });
    } else if (!manual && !H.seasons.includes(a.season.key)) {
      emoji = a.season.emoji;
      text = T('season.' + a.season.id + '.greet', { name });
      giftN = 10;
      H.seasons.push(a.season.key);
      H.greetDay = ymd(today());
    } else return false;
    // список подарованих тримаємо коротким
    if (H.gifts.length > 40) H.gifts = H.gifts.slice(-40);
    if (H.seasons.length > 12) H.seasons = H.seasons.slice(-12);
    if (giftN) { BO.addPoints(giftN); text += '\n' + T(h && h.phase === 'day' ? 'gift' : 'giftSeason', { n: giftN }); }
    BO.showEventModal(emoji, text);
    const card = document.getElementById('eventCard');
    const txt = document.getElementById('eventText');
    if (card) { card.classList.add('holCard'); card.dataset.holTheme = h ? h.h.theme : a.season.id; }
    if (txt) txt.classList.add('holText');
    pendingHolClass = true;
    BO.saveState();
    BO.render();
    return true;
  }

  function maybeGreet() {
    const st = BO.state;
    if (!st || !st.hatched || !canShowModal()) return;
    const H = hs();
    if (H.greetDay === ymd(today())) return;
    showGreeting(false);
  }

  function clearHolCard() {
    if (!pendingHolClass) return;
    pendingHolClass = false;
    const card = document.getElementById('eventCard');
    const txt = document.getElementById('eventText');
    if (card) { card.classList.remove('holCard'); delete card.dataset.holTheme; }
    if (txt) txt.classList.remove('holText');
  }

  /* ---------- головний цикл ---------- */
  let lastDay = null;
  function refresh() {
    if (!BO.state) return;
    const d = ymd(today());
    const a = activeFor(today(), cc());
    const theme = a.holiday ? a.holiday.h.theme : a.season.id;
    paintLayer(theme);
    renderBadge(a);
    syncBonus(theme);
    if (d !== lastDay) { lastDay = d; syncWardrobe(); syncDecor(); }
  }

  BO.on('init', () => {
    hs();
    refresh();
    BO.saveState();
    // привітання — щойно на головному екрані немає інших вікон (мама, події…)
    setInterval(() => { try { maybeGreet(); } catch (e) { console.error('[holidays]', e); } }, 1500);
    setTimeout(maybeGreet, 600);
    const close = document.getElementById('eventClose');
    if (close) close.addEventListener('click', clearHolCard);
  });
  BO.on('render', refresh);
  BO.on('tick', refresh);
  BO.on('lang', () => { if (BO.state) renderBadge(activeFor(today(), cc())); });

  // Гардероб потрібен ще до першого render (дитина може відкрити його одразу)
  try { syncWardrobe(); } catch (e) { console.error('[holidays wardrobe]', e); }
})();
