/* OTOTO — модуль «Навчання»: 5 слотів освітніх ігор. CoLaba Production.

   Кнопка 🎓 у #navRow відкриває екран #view-edu з 5 картками-слотами:
     1 математика · 2 малювання · 3 логіка · 4 читання і літери (пілот) · 5 світ навколо (пілот)
   Гра, якої ще немає, показується як «Скоро».

   ── КОНТРАКТ ДЛЯ ГРИ (окремий файл edu_<id>.js, підключається ПІСЛЯ edu.js) ──
   BO.edu.register({
     id: 'math',              // унікальний id, ключі текстів: 'edu.math.*'
     slot: 1,                 // 1…5
     icon: '🔢',              // емодзі на картці
     pilot: false,            // true → на картці мітка «Пілот»
     start(host, ctx) { … },  // намалювати гру в host (порожній div на весь екран гри)
     stop() { … },            // прибрати таймери/слухачі (викликається при виході)
   });

   ctx — що гра отримує від хаба:
     ctx.age        вік гравця 3…21 (21 = «21+»)
     ctx.band       вік для складності: 3…14 (усі старші 14 → 14)
     ctx.progress   об'єкт прогресу цієї гри, зберігається сам: { level, best, streak, solved, medals:[] }
                    гра може писати в нього будь-які свої поля; після змін — ctx.save()
     ctx.save()     зберегти
     ctx.win({ stars, medal })   завдання розв'язано: +stars ⭐ у гаманець (через BO.addPoints),
                    medal — необов'язковий id медалі ('edu.math.m10' тощо): записується в
                    progress.medals і шле подію 'bo:eduMedal' {game, medal}
     ctx.exit()     повернутися до екрана «Навчання»
     ctx.t(key, vars)  = BO.t('edu.<id>.' + key, vars)
     ctx.lang       код мови гравця

   Події для інших модулів (нагороди тощо):
     document 'bo:eduWin'   detail { game, stars, level }
     document 'bo:eduMedal' detail { game, medal }

   Стан: BO.state.edu = { <id>: progress }. Вік: BO.state.age (крок активації в app.js).
   Старі збереження без віку: при першому відкритті «Навчання» гра питає вік. */
(function () {
  const BO = window.BO;
  const T = (k, v) => BO.t('edu.' + k, v);
  const GAMES = {};
  const SLOTS = [
    { slot: 1, id: 'math',    icon: '🔢' },
    { slot: 2, id: 'draw',    icon: '✏️' },
    { slot: 3, id: 'logic',   icon: '🧩' },
    { slot: 4, id: 'read',    icon: '🔤' },
    { slot: 5, id: 'world',   icon: '🌍' },
  ];
  let view = null, navBtn = null, running = null;

  function S() { return BO.state; }
  function age() { const a = S() && S().age; return (typeof a === 'number' && a >= 3) ? a : null; }
  function band() { const a = age() || 9; return Math.max(3, Math.min(14, a)); }
  function prog(id) {
    const s = S(); s.edu = s.edu || {};
    s.edu[id] = s.edu[id] || { level: 1, best: 0, streak: 0, solved: 0, medals: [] };
    return s.edu[id];
  }

  function register(game) {
    if (!game || !game.id) return;
    GAMES[game.id] = game;
    const sl = SLOTS.find(x => x.slot === game.slot);
    if (sl) { sl.id = game.id; if (game.icon) sl.icon = game.icon; }
    if (view && !view.classList.contains('hidden')) renderHub();
  }

  /* ---------- кнопка в #navRow ---------- */
  function addNav() {
    const row = BO.$('navRow'); if (!row || BO.$('btnEdu')) return;
    navBtn = document.createElement('button');
    navBtn.className = 'navBtn eduNavBtn'; navBtn.id = 'btnEdu'; navBtn.type = 'button';
    navBtn.innerHTML = '🎓<span></span>';
    navBtn.addEventListener('click', openHub);
    row.insertBefore(navBtn, row.firstChild ? row.firstChild.nextSibling : null); // після «Кімнати»
  }
  function updateNav() { if (navBtn) { navBtn.querySelector('span').textContent = T('nav'); navBtn.setAttribute('aria-label', T('title')); } }

  /* ---------- екран ---------- */
  function buildView() {
    if (view) return;
    view = document.createElement('section');
    view.id = 'view-edu'; view.className = 'view hidden';
    view.innerHTML =
      '<div class="eduTop"><button class="secondaryBtn eduBack" type="button"></button><h2 class="eduTitle"></h2></div>' +
      '<p class="eduAgeLine"></p>' +
      '<div class="eduGrid"></div>' +
      '<div class="eduAgeAsk hidden"><p class="eduAgeAskText"></p><div class="ageStrip eduAgeStrip"></div></div>' +
      '<div class="eduPlay hidden"><div class="eduPlayTop"><button class="secondaryBtn eduPlayBack" type="button">←</button><span class="eduPlayTitle"></span><span class="eduPlayStars"></span></div><div class="eduHost"></div></div>';
    BO.$('screen').appendChild(view);
    view.querySelector('.eduBack').addEventListener('click', () => BO.backToMain());
    view.querySelector('.eduPlayBack').addEventListener('click', stopGame);
  }

  function openHub() {
    buildView();
    BO.openView('view-edu');
    if (!age()) return askAge();
    renderHub();
  }

  function askAge() {
    view.querySelector('.eduGrid').classList.add('hidden');
    const box = view.querySelector('.eduAgeAsk'); box.classList.remove('hidden');
    box.querySelector('.eduAgeAskText').textContent = BO.t('start.age');
    const strip = box.querySelector('.eduAgeStrip'); strip.innerHTML = '';
    for (let a = 3; a <= 21; a++) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ageOpt'; b.textContent = a === 21 ? '21+' : String(a);
      b.addEventListener('click', () => { S().age = a; BO.saveState(); box.classList.add('hidden'); renderHub(); });
      strip.appendChild(b);
    }
    renderHead();
  }

  function renderHead() {
    view.querySelector('.eduBack').textContent = BO.t('start.back');
    view.querySelector('.eduTitle').textContent = T('title');
    const a = age();
    view.querySelector('.eduAgeLine').textContent = a ? T('ageLine', { age: a === 21 ? '21+' : a }) : '';
  }

  function renderHub() {
    renderHead();
    view.querySelector('.eduAgeAsk').classList.add('hidden');
    const grid = view.querySelector('.eduGrid'); grid.classList.remove('hidden'); grid.innerHTML = '';
    SLOTS.forEach(sl => {
      const g = GAMES[sl.id];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'eduCard' + (g ? '' : ' eduSoon') + (g && g.pilot ? ' eduPilot' : '');
      const p = g ? prog(sl.id) : null;
      card.innerHTML =
        '<span class="eduIcon">' + sl.icon + '</span>' +
        '<span class="eduName fit"></span>' +
        '<span class="eduSub"></span>' +
        (g && g.pilot ? '<b class="eduTag"></b>' : '');
      card.querySelector('.eduName').textContent = T(sl.id + '.name');
      card.querySelector('.eduSub').textContent = g ? T('level', { n: p.level }) : T('soon');
      if (g && g.pilot) card.querySelector('.eduTag').textContent = T('pilot');
      if (g) card.addEventListener('click', () => startGame(sl.id));
      else card.disabled = true;
      grid.appendChild(card);
    });
  }

  /* ---------- запуск гри ---------- */
  function startGame(id) {
    const g = GAMES[id]; if (!g) return;
    const p = prog(id);
    const play = view.querySelector('.eduPlay');
    view.querySelector('.eduGrid').classList.add('hidden');
    view.querySelector('.eduAgeLine').classList.add('hidden');
    view.querySelector('.eduTop').classList.add('hidden');
    play.classList.remove('hidden');
    play.querySelector('.eduPlayTitle').textContent = T(id + '.name');
    const host = play.querySelector('.eduHost'); host.innerHTML = ''; host.className = 'eduHost eduHost-' + id;
    const starsEl = play.querySelector('.eduPlayStars');
    const showStars = () => { starsEl.textContent = '⭐ ' + (S().points || 0); };
    showStars();
    const ctx = {
      age: age() || 9, band: band(), progress: p, lang: S().lang || 'uk',
      save: () => BO.saveState(),
      t: (k, v) => BO.t('edu.' + id + '.' + k, v),
      exit: stopGame,
      win({ stars = 0, medal = null } = {}) {
        if (!(medal && !stars)) p.solved = (p.solved || 0) + 1; // виклик лише з медаллю — не рахуємо як розв'язане
        if (stars > 0) BO.addPoints(stars);
        document.dispatchEvent(new CustomEvent('bo:eduWin', { detail: { game: id, stars, level: p.level } }));
        if (medal && !p.medals.includes(medal)) {
          p.medals.push(medal);
          document.dispatchEvent(new CustomEvent('bo:eduMedal', { detail: { game: id, medal } }));
        }
        BO.saveState(); showStars();
      },
    };
    running = g;
    try { g.start(host, ctx); } catch (e) { console.error('[edu ' + id + ']', e); stopGame(); }
  }

  function stopGame() {
    if (running) { try { running.stop && running.stop(); } catch (e) { console.error(e); } }
    running = null;
    const play = view.querySelector('.eduPlay');
    play.classList.add('hidden'); play.querySelector('.eduHost').innerHTML = '';
    view.querySelector('.eduTop').classList.remove('hidden');
    view.querySelector('.eduAgeLine').classList.remove('hidden');
    renderHub();
  }

  BO.edu = { register, age, band, progress: prog, slots: SLOTS };

  BO.on('init', () => { buildView(); addNav(); updateNav(); });
  BO.on('render', () => { addNav(); updateNav(); });
  BO.on('lang', () => { updateNav(); if (view && !view.classList.contains('hidden') && !running) renderHub(); });
})();
