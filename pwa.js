/* OTOTO — підключення роботи без інтернету (service worker). CoLaba Production.
   Тихо нічого не робить, якщо браузер цього не вміє або гру відкрито з файлу (file://).
   Жодних підказок «встановіть застосунок» дітям не показуємо — вистачає меню браузера. */
(function () {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () { /* без інтернет-режиму гра працює як звичайно */ });
  });
})();
