/* OTOTO — перемикач мови сторінки «Про гру» (uk / en). CoLaba Production.
   Без cookie і без мережі: вибір зберігається лише в localStorage цього браузера
   (ключ 'ototo_site_lang'); якщо сховище недоступне — просто не запам'ятовуємо.
   Початкову мову ставить маленький скрипт у <head> (щоб не блимало). */
(function () {
  'use strict';
  var KEY = 'ototo_site_lang';
  var root = document.documentElement;
  var TITLES = {
    uk: 'ototo — гра-улюбленець для дітей і дорослих',
    en: 'ototo — a virtual pet game for kids and grown-ups'
  };
  var DESCS = {
    uk: 'ototo — безкоштовна гра: віртуальний улюбленець, 5 навчальних ігор, мапа пригод, 18 мов. Без реклами, без збору даних, працює без інтернету.',
    en: 'ototo is a free game: a virtual pet, 5 learning games, an adventure map and 18 languages. No ads, no data collection, works offline.'
  };

  function apply(lang) {
    if (lang !== 'uk' && lang !== 'en') lang = 'en';
    root.lang = lang;
    document.title = TITLES[lang];
    var d = document.querySelector('meta[name="description"]');
    if (d) d.setAttribute('content', DESCS[lang]);
    var btns = document.querySelectorAll('.langSwitch button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-lang') === lang ? 'true' : 'false');
    }
  }

  apply(root.lang);
  var btns = document.querySelectorAll('.langSwitch button');
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function () {
      var lang = this.getAttribute('data-lang');
      apply(lang);
      try { localStorage.setItem(KEY, lang); } catch (e) { /* приватний режим тощо — не запам'ятовуємо */ }
    });
  }
})();
