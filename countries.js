/* OTOTO — КАТАЛОГ КРАЇН. CoLaba Production.
   Країна обирається один раз при активації гри і зберігається назавжди
   (state.country). Від неї залежить мова за замовчуванням; надалі сюди ж
   можна додавати інше, що залежить від країни (свята, сезонні предмети тощо),
   як нові поля запису — без зміни коду вибору.

   Як додати країну: один рядок у потрібну групу.
     code  — 2 літери (ISO), за ним береться прапор img/flags/<code>.svg
     name  — назва МОВОЮ САМОЇ КРАЇНИ (дитина впізнає свою)
     langs — мови країни, перша = за замовчуванням
   росії і білорусі в каталозі немає і не буде. Російської мови теж немає. */

window.BO_LANGUAGES = {
  // назва мови її ж мовою; ready = чи вже є файл перекладу lang/<код>.js
  uk: 'Українська', en: 'English', pl: 'Polski', de: 'Deutsch', fr: 'Français',
  it: 'Italiano', es: 'Español', pt: 'Português', nl: 'Nederlands', cs: 'Čeština',
  sk: 'Slovenčina', hu: 'Magyar', ro: 'Română', bg: 'Български', el: 'Ελληνικά',
  hr: 'Hrvatski', sl: 'Slovenščina', sr: 'Српски', bs: 'Bosanski', mk: 'Македонски',
  sq: 'Shqip', lt: 'Lietuvių', lv: 'Latviešu', et: 'Eesti', fi: 'Suomi',
  sv: 'Svenska', nb: 'Norsk', da: 'Dansk', is: 'Íslenska', mt: 'Malti',
  kk: 'Қазақша', uz: 'Oʻzbekcha', ky: 'Кыргызча', tg: 'Тоҷикӣ', tk: 'Türkmençe',
  az: 'Azərbaycanca', hy: 'Հայերեն', ka: 'ქართული',
};

window.BO_COUNTRIES = [
  // ---- СНД (без росії і білорусі) ----
  { code: 'ua', group: 'cis', name: 'Україна',          langs: ['uk'] },
  { code: 'md', group: 'cis', name: 'Moldova',          langs: ['ro'] },
  { code: 'kz', group: 'cis', name: 'Қазақстан',        langs: ['kk'] },
  { code: 'uz', group: 'cis', name: 'Oʻzbekiston',      langs: ['uz'] },
  { code: 'kg', group: 'cis', name: 'Кыргызстан',       langs: ['ky'] },
  { code: 'tj', group: 'cis', name: 'Тоҷикистон',       langs: ['tg'] },
  { code: 'tm', group: 'cis', name: 'Türkmenistan',     langs: ['tk'] },
  { code: 'az', group: 'cis', name: 'Azərbaycan',       langs: ['az'] },
  { code: 'am', group: 'cis', name: 'Հայաստան',         langs: ['hy'] },
  { code: 'ge', group: 'cis', name: 'საქართველო',       langs: ['ka'] },

  // ---- Америка ----
  { code: 'us', group: 'america', name: 'United States', langs: ['en', 'es'] },
  { code: 'ca', group: 'america', name: 'Canada',        langs: ['en', 'fr'] },

  // ---- Європа ----
  { code: 'gb', group: 'europe', name: 'United Kingdom', langs: ['en'] },
  { code: 'ie', group: 'europe', name: 'Ireland',        langs: ['en'] },
  { code: 'pl', group: 'europe', name: 'Polska',         langs: ['pl'] },
  { code: 'de', group: 'europe', name: 'Deutschland',    langs: ['de'] },
  { code: 'at', group: 'europe', name: 'Österreich',     langs: ['de'] },
  { code: 'ch', group: 'europe', name: 'Schweiz · Suisse · Svizzera', langs: ['de', 'fr', 'it'] },
  { code: 'fr', group: 'europe', name: 'France',         langs: ['fr'] },
  { code: 'be', group: 'europe', name: 'België · Belgique', langs: ['nl', 'fr', 'de'] },
  { code: 'nl', group: 'europe', name: 'Nederland',      langs: ['nl'] },
  { code: 'lu', group: 'europe', name: 'Luxembourg',     langs: ['fr', 'de'] },
  { code: 'it', group: 'europe', name: 'Italia',         langs: ['it'] },
  { code: 'es', group: 'europe', name: 'España',         langs: ['es'] },
  { code: 'pt', group: 'europe', name: 'Portugal',       langs: ['pt'] },
  { code: 'cz', group: 'europe', name: 'Česko',          langs: ['cs'] },
  { code: 'sk', group: 'europe', name: 'Slovensko',      langs: ['sk'] },
  { code: 'hu', group: 'europe', name: 'Magyarország',   langs: ['hu'] },
  { code: 'ro', group: 'europe', name: 'România',        langs: ['ro'] },
  { code: 'bg', group: 'europe', name: 'България',       langs: ['bg'] },
  { code: 'gr', group: 'europe', name: 'Ελλάδα',         langs: ['el'] },
  { code: 'cy', group: 'europe', name: 'Κύπρος',         langs: ['el'] },
  { code: 'hr', group: 'europe', name: 'Hrvatska',       langs: ['hr'] },
  { code: 'si', group: 'europe', name: 'Slovenija',      langs: ['sl'] },
  { code: 'rs', group: 'europe', name: 'Србија',         langs: ['sr'] },
  { code: 'ba', group: 'europe', name: 'Bosna i Hercegovina', langs: ['bs', 'hr', 'sr'] },
  { code: 'me', group: 'europe', name: 'Crna Gora',      langs: ['sr'] },
  { code: 'mk', group: 'europe', name: 'Северна Македонија', langs: ['mk'] },
  { code: 'al', group: 'europe', name: 'Shqipëria',      langs: ['sq'] },
  { code: 'lt', group: 'europe', name: 'Lietuva',        langs: ['lt'] },
  { code: 'lv', group: 'europe', name: 'Latvija',        langs: ['lv'] },
  { code: 'ee', group: 'europe', name: 'Eesti',          langs: ['et'] },
  { code: 'fi', group: 'europe', name: 'Suomi',          langs: ['fi', 'sv'] },
  { code: 'se', group: 'europe', name: 'Sverige',        langs: ['sv'] },
  { code: 'no', group: 'europe', name: 'Norge',          langs: ['nb'] },
  { code: 'dk', group: 'europe', name: 'Danmark',        langs: ['da'] },
  { code: 'is', group: 'europe', name: 'Ísland',         langs: ['is'] },
  { code: 'mt', group: 'europe', name: 'Malta',          langs: ['mt', 'en'] },
];
