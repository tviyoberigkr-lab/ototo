/* OTOTO — модуль "текст влазить" (fit). CoLaba Production.

   Якщо підпис не влазить у свою кнопку навіть у 2 рядки (довге німецьке /
   польське / казахське слово), модуль трохи зменшує шрифт САМЕ цього
   підпису — до ~78% від початкового. Сусідні кнопки не змінюються.
   Спершу пробуємо вмістити слово цілим (зменшенням шрифту); розрив слова
   посередині (overflow-wrap:anywhere у CSS) — лише крайній випадок.

   Які елементи: FIT_TARGETS нижче + будь-який елемент з класом .fit
   (кількість рядків: data-fit-lines="3"; за замовчуванням 2).
   Коли: після render і зміни мови (BO.on), а також коли змінився текст на
   екрані або розмір екрана (MutationObserver / ResizeObserver) — не частіше
   ніж раз на кадр і лише для елементів, у яких змінився текст чи ширина. */
(function () {
  'use strict';
  const MIN_SCALE = 0.78;
  const STEP = 0.06;
  const FIT_TARGETS = [
    // [selector, maxLines]
    ['.actionBtn > span', 2], ['.navBtn > span', 2],
    ['.gameMenuItem .gLabel', 2], ['.gameMenuItem .gBest', 1],
    ['.wardrobeItem .wLabel', 2],
    ['.charCard .cName', 1], ['.charCard .cTitle', 2], ['.charCard .cTag', 2], ['.charCard .cBuy', 2],
    ['.decorCard .dName', 2], ['.decorCard .dTag', 2], ['.decorCard .dBuy', 2],
    ['.decorTitle', 2], ['.mapTitle', 2], ['.mapProgress', 2],
    ['.personaOpt > span', 2], ['#btnStart', 2], ['.secondaryBtn', 2],
    ['.langOpt .lName', 1], ['.langOpt .lSoon', 2], ['.countryBtn > span', 2], ['.countryChip > span', 1],
    ['#gamePrompt', 2], ['#gameScore', 1], ['#bubble', 3], ['#log', 2],
    ['.statTitle', 2], ['#charPoints', 2], ['#screen > .view > h2', 2], ['.tagline', 2], ['#tapHint', 2],
    ['.fit', 2],
    // однорядкові з "…": спершу трохи менший шрифт (до 85%), потім "…"
    ['#topbar > #petName', 1], ['#topbar > #stageLabel', 1],
  ];
  const ELLIPSIS_MIN_SCALE = 0.85;
  const SELECTOR = FIT_TARGETS.map(x => x[0]).join(',');
  const done = new WeakMap();   // el -> ключ (текст|ширина|мова), для якого вже підібрано

  function maxLinesFor(el) {
    if (el.dataset.fitLines) return +el.dataset.fitLines || 2;
    for (const [s, n] of FIT_TARGETS) if (el.matches(s)) return n;
    return 2;
  }

  // скільки рядків займає текст і чи не вилазить він по ширині
  function measure(el, cs) {
    const r = document.createRange();
    r.selectNodeContents(el);
    const tops = [];
    let right = -Infinity, left = Infinity;
    for (const q of r.getClientRects()) {
      if (q.width < 1 || q.height < 1) continue;
      if (!tops.some(t => Math.abs(t - q.top) < q.height * 0.5)) tops.push(q.top);
      if (q.right > right) right = q.right;
      if (q.left < left) left = q.left;
    }
    const box = el.getBoundingClientRect();
    const padL = parseFloat(cs.paddingLeft) || 0, padR = parseFloat(cs.paddingRight) || 0;
    const tooWide = el.scrollWidth > el.clientWidth + 1 ||
      (tops.length > 0 && (right > box.right - padR + 1 || left < box.left + padL - 1));
    return { lines: tops.length, tooWide };
  }

  function fitOne(el) {
    if (!el.isConnected || !el.getClientRects().length) return;      // не видно — підберемо, коли з'явиться
    const key = el.textContent + '|' + el.clientWidth + '|' + document.documentElement.lang;
    if (done.get(el) === key) return;
    el.style.fontSize = '';                                          // повертаємо початковий розмір
    const cs = getComputedStyle(el);
    const base = parseFloat(cs.fontSize);
    if (cs.textOverflow === 'ellipsis') { fitEllipsis(el, cs, base); return; }
    const maxLines = maxLinesFor(el);
    // міряємо без розриву слів: спершу пробуємо вмістити слово цілим
    el.classList.add('fit-measure');
    let scale = 1, m = measure(el, cs);
    while ((m.lines > maxLines || m.tooWide) && scale - STEP >= MIN_SCALE - 0.001) {
      scale -= STEP;
      el.style.fontSize = (base * scale).toFixed(2) + 'px';
      m = measure(el, cs);
    }
    el.classList.remove('fit-measure');
    if (m.lines > maxLines || m.tooWide) {
      // навіть на 78% не влазить цілим словом — залишаємо 78% і дозволяємо
      // розрив слова (CSS overflow-wrap:anywhere); перевіряємо ще раз
      el.style.fontSize = (base * MIN_SCALE).toFixed(2) + 'px';
      const m2 = measure(el, getComputedStyle(el));
      if (m2.lines <= maxLines && !m2.tooWide) {
        // з розривом влазить — можливо, і більшим шрифтом
        let s = MIN_SCALE;
        while (s + STEP <= 1.0001) {
          el.style.fontSize = (base * (s + STEP)).toFixed(2) + 'px';
          const m3 = measure(el, getComputedStyle(el));
          if (m3.lines > maxLines || m3.tooWide) { el.style.fontSize = (base * s).toFixed(2) + 'px'; break; }
          s += STEP;
        }
      }
      el.classList.add('fit-overflow');       // для налагодження: переклад задовгий навіть для 78%
    } else {
      el.classList.remove('fit-overflow');
    }
    if (el.style.fontSize === base.toFixed(2) + 'px') el.style.fontSize = '';
    done.set(el, el.textContent + '|' + el.clientWidth + '|' + document.documentElement.lang);
  }

  // однорядковий елемент з "…" (ім'я, етап у верхній панелі)
  function fitEllipsis(el, cs, base) {
    const avail = () => el.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    const need = () => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().width; };
    let scale = 1;
    while (need() > avail() + 0.5 && scale - 0.05 >= ELLIPSIS_MIN_SCALE - 0.001) {
      scale -= 0.05;
      el.style.fontSize = (base * scale).toFixed(2) + 'px';
    }
    done.set(el, el.textContent + '|' + el.clientWidth + '|' + document.documentElement.lang);
  }

  let scheduled = false, mo = null;
  let runs = 0;
  function run() {
    scheduled = false; runs++;
    const els = document.querySelectorAll(SELECTOR);
    for (const el of els) fitOne(el);
    if (mo) mo.takeRecords();   // власні зміни (класи fit-*) не запускають новий прохід
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(run);
  }

  // стиль вимірювання: без розриву слів, щоб побачити "слово не влазить"
  const st = document.createElement('style');
  st.textContent = '.fit-measure{overflow-wrap:normal!important;word-break:normal!important;-webkit-hyphens:manual!important;hyphens:manual!important}';
  document.head.appendChild(st);

  if (window.BO) { BO.on('render', schedule); BO.on('lang', schedule); BO.on('init', schedule); }

  const screen = document.getElementById('screen') || document.body;
  // нові екрани/тексти (меню ігор, кімната, мапа, попапи, список країн) і показ прихованих екранів
  mo = new MutationObserver(schedule);
  mo.observe(screen, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
  // поворот екрана / зміна ширини
  if (window.ResizeObserver) new ResizeObserver(schedule).observe(screen);
  window.addEventListener('load', schedule);
  schedule();

  window.BO_FIT = { refresh() { schedule(); }, fitNow: run, get runs() { return runs; } };
})();
