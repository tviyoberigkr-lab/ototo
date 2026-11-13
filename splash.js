/* OTOTO — заставка при запуску гри. CoLaba Production.
   Сценарій (≈4 с, тап — пропустити):
   1) з'являються літери o t o t o (малі, Times New Roman); у 2-й і 3-й «o» — очі Сяйка;
   2) очі двічі кліпають;
   3) напис відходить на другий план, з'являється мордочка Сяйка й кліпає;
   4) заставка розчиняється — запускається гра.
   Назва гри для заставки — одне місце: BRAND нижче (eye: true — у літері око). */
(function () {
  const BRAND = [
    { ch: 'o' }, { ch: 't' }, { ch: 'o', eye: true }, { ch: 't' }, { ch: 'o', eye: true, mirror: true },
  ];
  const TOTAL_MS = 4100;

  const el = document.createElement('div');
  el.id = 'splash';
  el.innerHTML =
    '<div class="spWord">' +
      BRAND.map(L => '<span class="spLetter' + (L.eye ? ' spO' : '') + (L.mirror ? ' spMirror' : '') + '"><span class="spGlyph">' + L.ch + '</span>' +
        (L.eye ? '<span class="spEye"><img src="img/brand/eye.png" alt=""></span>' : '') + '</span>').join('') +
    '</div>' +
    '<img class="spFace" src="img/brand/face.png" alt="">' +
    '<div class="spSparkles"></div>';
  // показуємо одразу, до появи будь-якого екрана гри
  (document.body || document.documentElement).appendChild(el);

  const sp = el.querySelector('.spSparkles');
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('i');
    s.style.left = (8 + Math.random() * 84) + '%';
    s.style.top = (12 + Math.random() * 76) + '%';
    s.style.animationDelay = (Math.random() * 2.4).toFixed(2) + 's';
    sp.appendChild(s);
  }

  let done = false;
  function finish() {
    if (done) return; done = true;
    el.classList.add('spOut');
    setTimeout(() => el.remove(), 520);
  }
  el.addEventListener('click', finish);
  // фази керуються CSS-анімаціями; класи лише перемикають етапи
  requestAnimationFrame(() => el.classList.add('spGo'));
  setTimeout(() => el.classList.add('spFaceIn'), 2400);
  setTimeout(finish, TOTAL_MS);
})();
