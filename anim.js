/* OTOTO — АНІМАЦІЯ ПЕРСОНАЖІВ. CoLaba Production.
   Персонаж розрізаний на шари (голова, тіло, 4–5 лап, хвіст — img/rig/*,
   нарізка: tools/cut_rig.py, координати й суглоби: rig_data.js). Тут —
   маленький "ляльковий" рендер: кожен шар — <img>, що крутиться навколо
   свого суглоба, і кліпи руху (дихання, обійми, поворот, біг, погляд мами).

   Ядро (app.js, style.css) не правиться: сцену з мамою ми лише "підміняємо" —
   ховаємо її картинки класом .animHidden і ставимо на їхнє місце ляльок.
   Стежимо за ядром через MutationObserver:
     #mamaOverlay без .hidden   → сцена відкрилась: малюк тулиться до мами;
     #mamaBabyImg отримав .running → поворот праворуч і біг за край екрана,
                                     мама проводжає його поглядом.
   Ядро закриває сцену через 1150 мс після тапу — поворот+біг вкладено в 1100 мс.
   Для мапи (map.js) віддаємо BOAnim.createRig / BOAnim.runPose, а для решти
   персонажів (гриб, робот, кит, кактус) — BOAnim.rigFor / walkPose / idlePose / walkFx. */
(function () {
  'use strict';
  const RIG = window.BO_RIG;
  if (!RIG) return;

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeInOut = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

  /* ---------- Лялька ---------- */
  // Позиціюється по "якорю" — центр фігури по X, низ лап по Y.
  function createRig(name, cls) {
    const R = RIG[name];
    const el = document.createElement('div');
    el.className = 'boRig ' + (cls || '');
    const inner = document.createElement('div');
    inner.className = 'rigBody';
    inner.style.width = R.w + 'px';
    inner.style.height = R.h + 'px';
    el.appendChild(inner);
    const parts = {};
    R.parts.forEach(p => {
      const img = document.createElement('img');
      img.className = 'rigPart';
      img.alt = '';
      img.draggable = false;
      img.src = p.src;
      img.style.cssText = 'left:' + p.x + 'px;top:' + p.y + 'px;width:' + p.w + 'px;height:' + p.h +
        'px;z-index:' + p.z + ';transform-origin:' + (p.px - p.x) + 'px ' + (p.py - p.y) + 'px';
      inner.appendChild(img);
      parts[p.id] = img;
    });
    const fig = R.fig;
    const rig = {
      el, R, parts,
      ax: (fig[0] + fig[2]) / 2, ay: fig[3],
      figW: fig[2] - fig[0], figH: fig[3] - fig[1],
      s: 1,
      last: {},
      // масштаб, щоб фігура мала задану висоту / ширину в px
      sizeByHeight(h) { rig.s = h / rig.figH; },
      sizeByWidth(w) { rig.s = w / rig.figW; },
      // p: { x, y — якір у px контейнера; rot (°); sx, sy; face: 1 = як намальовано, -1 = дзеркально;
      //      parts: { id: { r, tx, ty } } }
      apply(p) {
        const s = rig.s, face = p.face === undefined ? 1 : p.face;
        inner.style.transform = 'translate(' + p.x.toFixed(2) + 'px,' + p.y.toFixed(2) + 'px) rotate(' + (p.rot || 0).toFixed(2) +
          'deg) scale(' + (face * (p.sx || 1) * s).toFixed(4) + ',' + ((p.sy || 1) * s).toFixed(4) + ') translate(' + (-rig.ax) + 'px,' + (-rig.ay) + 'px)';
        const pp = p.parts || {};
        for (const id in parts) {
          const q = pp[id];
          const v = q ? 'translate(' + (q.tx || 0).toFixed(2) + 'px,' + (q.ty || 0).toFixed(2) + 'px) rotate(' + (q.r || 0).toFixed(2) + 'deg)' +
            (q.sx !== undefined || q.sy !== undefined ? ' scale(' + (q.sx || 1).toFixed(3) + ',' + (q.sy || 1).toFixed(3) + ')' : '') : '';
          if (rig.last[id] !== v) { parts[id].style.transform = v; rig.last[id] = v; }
        }
        rig.pose = p;
      },
      // точка шару (у px рига) → px контейнера, з урахуванням поточної пози (без повороту шару)
      toScene(rx, ry) {
        const p = rig.pose || { x: 0, y: 0 };
        const s = rig.s, face = p.face === undefined ? 1 : p.face;
        let dx = (rx - rig.ax) * face * (p.sx || 1) * s, dy = (ry - rig.ay) * (p.sy || 1) * s;
        const a = (p.rot || 0) * Math.PI / 180;
        return { x: p.x + dx * Math.cos(a) - dy * Math.sin(a), y: p.y + dx * Math.sin(a) + dy * Math.cos(a) };
      },
    };
    rig.apply({ x: 0, y: 0 });
    return rig;
  }

  /* ---------- Кліпи малюка-гекона ---------- */
  // t — секунди. Кожен кліп повертає позу без x/y (їх ставить режисер).
  function babyIdle(t) {
    const b = Math.sin(TAU * t / 1.6);
    return { sx: 1 - .008 * b, sy: 1 + .016 * b, rot: 0, parts: {
      head: { r: 1.5 * Math.sin(TAU * t / 1.6 + .6) },
      tail: { r: 3 * Math.sin(TAU * t / 2.2) },
    } };
  }
  // тулиться до мами (мама ліворуч, малюк дивиться ліворуч — як намальовано)
  function babyHug(t) {
    const k = .5 - .5 * Math.cos(TAU * t / 1.7);        // 0..1..0 — притулився/відхилився
    const b = Math.sin(TAU * t / 1.7);
    // тягнеться до мами: передні лапки від землі, мордочка вгору — "цьом"
    return { sx: 1 - .02 * k, sy: 1 + .04 * k, rot: 9 * k, dx: -7 * k, dy: -2 * k, parts: {
      head: { r: 9 * k + 1.5 * b },
      tail: { r: 7 * Math.sin(TAU * t / .8) },             // радісно махає хвостиком
      legFL: { r: -14 * k }, legFR: { r: -10 * k }, legFF: { r: -10 * k }, legBN: { r: 6 * k }, legBF: { r: 6 * k },
    } };
  }
  // поворот праворуч: присів (антиципація) → стрибок-розворот → приземлився
  function babyTurn(u) {
    u = clamp(u, 0, 1);
    let sx = 1, sy = 1, dy = 0, face = 1;
    if (u < .35) { const k = easeInOut(u / .35); sx = 1 + .12 * k; sy = 1 - .16 * k; }
    else if (u < .78) {
      const k = (u - .35) / .43;
      face = Math.cos(Math.PI * easeInOut(k));
      sy = lerp(.84, 1.1, Math.sin(Math.PI * k)) ; sx = 1.04;
      dy = -9 * Math.sin(Math.PI * k);
    } else { const k = (u - .78) / .22; face = -1; sy = lerp(.92, 1, easeInOut(k)); sx = lerp(1.08, 1, easeInOut(k)); }
    if (u >= .35 && u < .78 && Math.abs(face) < .06) face = face < 0 ? -.06 : .06; // без "нульової" ширини
    return { sx, sy, dy, face, rot: 0, parts: {
      head: { r: -4 * Math.sin(Math.PI * u) },
      tail: { r: 10 * Math.sin(Math.PI * u) },
      legFL: { r: -10 * Math.sin(Math.PI * u) }, legFR: { r: 10 * Math.sin(Math.PI * u) },
    } };
  }
  // біговий цикл: діагональні пари лап, підскок тіла, хвіст метеляє, голова кивається
  function runPose(t, opt) {
    opt = opt || {};
    const amp = opt.amp === undefined ? 25 : opt.amp, period = opt.period || .26;
    const ph = TAU * t / period, sn = Math.sin(ph);
    const face = opt.face === undefined ? -1 : opt.face;
    return {
      face, sx: 1 + .03 * Math.abs(Math.cos(ph)), sy: 1 - .04 * Math.abs(Math.cos(ph)),
      dy: -(opt.bob === undefined ? 5 : opt.bob) * Math.abs(sn),
      rot: -face * (opt.lean === undefined ? 4 : opt.lean),   // нахил уперед, куди біжить
      parts: {
        legFL: { r: amp * sn }, legBN: { r: amp * sn },
        legFR: { r: -amp * sn }, legBF: { r: -amp * sn }, legFF: { r: -amp * .8 * sn },
        tail: { r: 9 * Math.sin(ph + Math.PI / 2) },
        head: { r: 3 * Math.sin(2 * ph + .8) },
      },
    };
  }
  /* ---------- Інші 4 персонажі: хода + дихання ----------
     Шари — tools/cut_rig.py chars. Усі пози — у системі "як намальовано";
     opt.face (напрям руху): 1 — ліворуч, -1 — праворуч. Кита (намальований боком)
     дзеркалимо, фронтальних (гриб, робот, кактус) — ні, вони лише нахиляються.
     Немає шарів у rig_data.js → rigFor() дає null, і map.js показує звичайну картинку.
     Обертання кінцівки: + = за годинниковою стрілкою (права рука вниз-усередину,
     ліва — вгору-назовні). Повертають { face, sx, sy, dy, rot, parts }. */
  const CHAR_RIG = { gecko: 'baby', mushroom: 'mushroom', robot: 'robot', whale: 'whale', cactus: 'cactus' };
  function rigFor(charId) { const n = CHAR_RIG[charId]; return n && RIG[n] ? n : null; }
  const pos = v => Math.max(0, v);
  // "механічний" синус: швидкий перехід і пауза в крайніх точках (для робота)
  const tick3 = v => Math.sign(v) * Math.min(1, Math.abs(v) * 1.7);

  // Період кроку (с): один повний цикл ходи (дві ступні / один помах хвоста)
  const WALK_P = { mushroom: .5, robot: .56, whale: .9, cactus: .42 };
  // dir: 1 — іде ліворуч, -1 — праворуч (дробове під час розвороту). dy — у px мапи при ширині 58.
  const WALKS = {
    // гриб: перевалюється з ніжки на ніжку, ступні по черзі відриваються від землі,
    // шапка запізнюється й пружинить, ручки махають навхрест
    mushroom(t, dir) {
      const ph = TAU * t / WALK_P.mushroom, s = Math.sin(ph), c = Math.cos(ph), up = Math.abs(s), land = 1 - up;
      return { sx: 1 + .04 * land, sy: 1 - .05 * land, dy: -3.5 * up, rot: 6 * s - dir * 3, parts: {
        cap: { r: -4 * Math.sin(ph - .9), ty: 6 * land - 2, sx: 1 + .03 * land, sy: 1 - .04 * land },
        footL: { r: -12 * pos(s), ty: -10 * pos(s) },
        footR: { r: 12 * pos(-s), ty: -10 * pos(-s) },
        armR: { r: -16 * s },
        armL: { r: -16 * s },
      } };
    },
    // робот: чіткий марш — ноги піднімаються по черзі з паузами, руки качають навхрест, голова цокає
    robot(t, dir) {
      const ph = TAU * t / WALK_P.robot, s = Math.sin(ph), q = tick3(s);
      return { sy: 1 - .02 * (1 - Math.abs(q)), dy: -2.5 * Math.abs(q), rot: 3 * q - dir * 2, parts: {
        legL: { r: 8 * q, ty: -14 * pos(q) },
        legR: { r: 8 * q, ty: -14 * pos(-q) },
        armL: { r: 24 * q },
        armR: { r: 24 * q },
        head: { r: -3 * tick3(Math.sin(ph - .5)), ty: 3 * (1 - Math.abs(q)) },
      } };
    },
    // кит: пливе над стежкою — тіло хвилею (ніс угору/вниз), хвіст б'є з запізненням,
    // плавці гребуть; висота плавання росте з нуля і спадає до нуля в кінці (opt.left, с)
    whale(t, dir, left) {
      const ph = TAU * t / WALK_P.whale, s = Math.sin(ph), c = Math.cos(ph);
      const lift = clamp(Math.min(t, left) / .25, 0, 1);      // плавно злітає і сідає
      return { face: dir, sx: 1 + .025 * s, sy: 1 - .03 * s, dy: -lift * (5 + 4 * s), rot: dir * 6 * c, parts: {
        tail: { r: 9 * Math.sin(ph - 1.3) },
        finN: { r: 20 * Math.sin(ph + .4) },
        finF: { r: -16 * Math.sin(ph + 1) },
      } };
    },
    // кактус: пружні дрібні кроки-підскоки, ступні по черзі, ручки махають навхрест
    cactus(t, dir) {
      const ph = TAU * t / WALK_P.cactus, s = Math.sin(ph), up = Math.abs(s), land = 1 - up;
      return { sx: 1 + .05 * land - .015 * up, sy: 1 - .065 * land + .025 * up, dy: -4 * up, rot: 5 * s - dir * 2, parts: {
        footL: { r: -10 * pos(s), ty: -10 * pos(s) },
        footR: { r: 10 * pos(-s), ty: -10 * pos(-s) },
        armR: { r: -20 * s },
        armL: { r: -16 * s },
      } };
    },
  };
  const IDLES = {
    mushroom(t) {
      const b = Math.sin(TAU * t / 2);
      return { sx: 1 - .012 * b, sy: 1 + .02 * b, parts: {
        cap: { r: 2 * Math.sin(TAU * t / 3.2), ty: -2 * b },
        armR: { r: -3 * Math.sin(TAU * t / 2 + .5) }, armL: { r: 3 * Math.sin(TAU * t / 2 + .5) },
      } };
    },
    robot(t) {
      const b = Math.sin(TAU * t / 2.4);
      return { sx: 1, sy: 1 + .012 * b, parts: {
        head: { r: 2.5 * tick3(Math.sin(TAU * t / 3.6)), ty: -1.5 * b },
        armL: { r: 3 * b }, armR: { r: -3 * b },
      } };
    },
    whale(t) {
      const b = Math.sin(TAU * t / 2.2);
      return { sx: 1 - .01 * b, sy: 1 + .02 * b, dy: -4 * b, rot: 2 * Math.sin(TAU * t / 2.2 + 1), parts: {
        tail: { r: 7 * Math.sin(TAU * t / 1.6) },
        finN: { r: 7 * Math.sin(TAU * t / 1.6 + 1) }, finF: { r: -6 * Math.sin(TAU * t / 1.6 + 1.6) },
      } };
    },
    cactus(t) {
      const b = Math.sin(TAU * t / 1.9);
      return { sx: 1 - .014 * b, sy: 1 + .022 * b, parts: {
        armR: { r: -4 * Math.sin(TAU * t / 1.9 + .6) }, armL: { r: 4 * Math.sin(TAU * t / 1.9 + .6) },
      } };
    },
  };
  function walkPose(name, t, opt) {
    opt = opt || {};
    const face = opt.face === undefined ? 1 : opt.face;
    if (name === 'baby') return runPose(t, Object.assign({}, opt, { face }));
    if (!WALKS[name]) return null;
    // фронтальні персонажі (гриб, робот, кактус) не дзеркалимо — лише нахил у бік руху;
    // кит намальований боком — він розвертається (face)
    const p = WALKS[name](t, face, opt.left === undefined ? 1e9 : opt.left);
    if (p.face === undefined) p.face = 1;
    return p;
  }
  function walkPeriod(name) { return name === 'baby' ? .3 : WALK_P[name] || .5; }
  function idlePose(name, t) {
    if (name === 'baby') return babyIdle(t);
    return IDLES[name] ? IDLES[name](t) : null;
  }
  // ефекти ходи: робот пихкає парою з димаря на кожен крок, інші — пил при приземленні.
  // st — будь-який об'єкт для стану (map.js передає свій walk). x, y — точка "ноги" у px host.
  function walkFx(name, st, rig, host, t, x, y, face) {
    const step = Math.floor(t / (walkPeriod(name) / 2));
    if (st.fxStep === step) return;
    st.fxStep = step;
    if (name === 'robot') {
      if (step % 2) return;
      const top = rig.toScene(rig.R.chimney ? rig.R.chimney[0] : 160, rig.R.chimney ? rig.R.chimney[1] : 6);
      puff(host, top.x, top.y, rig.s);
    } else if (name !== 'whale') {          // кит пливе — пилу нема
      dust(host, x + face * rig.figW * rig.s * .25, y - 2, face > 0 ? 1 : -1);
    }
  }
  function puff(host, x, y, s) {
    const d = document.createElement('div');
    d.className = 'rigPuff';
    const k = clamp(s * 3.2, .5, 2);
    d.style.left = x + 'px'; d.style.top = y + 'px';
    d.style.width = d.style.height = (14 * k).toFixed(1) + 'px';
    d.style.setProperty('--dx', ((Math.random() - .5) * 10 * k).toFixed(1) + 'px');
    d.style.setProperty('--dy', (-22 * k).toFixed(1) + 'px');
    host.appendChild(d);
    setTimeout(() => d.remove(), 900);
  }

  function addPose(base, d) {           // зсуви кліпу (dx/dy) → у координати
    return Object.assign({}, d, { x: base.x + (d.dx || 0), y: base.y + (d.dy || 0) });
  }

  function dust(host, x, y, dir) {
    const d = document.createElement('div');
    d.className = 'rigDust';
    d.style.left = x + 'px'; d.style.top = y + 'px';
    d.style.setProperty('--dx', (dir * (10 + Math.random() * 8)).toFixed(1) + 'px');
    host.appendChild(d);
    setTimeout(() => d.remove(), 600);
  }

  /* ---------- Сцена з мамою ---------- */
  const $ = id => document.getElementById(id);
  const scene = { on: false, raf: 0, phase: 'off', t0: 0, tRun: 0, mama: null, baby: null, lastDust: 0, headR: 6 };
  const TURN_MS = 350, RUN_MS = 1100;  // разом 1450 мс < 1500 мс, що дає ядро (app.js, onMamaRunHintTap)

  function isGecko() {
    const st = window.BO && window.BO.state;
    const img = $('mamaBabyImg');
    return !!(st && st.activeChar === 'gecko') || (!st && img && /gecko\.png/.test(img.getAttribute('src') || ''));
  }

  function choreo() {   // амплітуда/темп мами з поточної хореографії ядра (CSS-змінні #mamaBox)
    const box = $('mamaBox'), cs = box ? getComputedStyle(box) : null;
    const tilt = cs ? parseFloat(cs.getPropertyValue('--mamaTilt')) : NaN;
    const bounce = cs ? parseFloat(cs.getPropertyValue('--mamaBounce')) : NaN;
    const dur = parseFloat(($('mamaSvg') && $('mamaSvg').style.animationDuration) || '') || 2.6;
    return { tilt: isNaN(tilt) ? 5 : tilt, bounce: isNaN(bounce) ? 8 : bounce, dur: clamp(dur, 1.6, 4) };
  }

  function openScene() {
    const host = $('mamaScene'), mImg = $('mamaSvg'), bImg = $('mamaBabyImg');
    if (!host || !mImg || !bImg) return;
    if (!scene.mama) { scene.mama = createRig('mama', 'mamaRig'); host.insertBefore(scene.mama.el, mImg.nextSibling); }
    scene.mama.el.style.display = '';
    mImg.classList.add('animHidden');
    // мама — на місці її картинки (картинка = фігура на всю ширину)
    const mw = mImg.offsetWidth || 205;
    const mh = mImg.offsetHeight || mw * 483 / 640;
    scene.mama.sizeByWidth(mw);
    scene.mamaBase = { x: mImg.offsetLeft + mw / 2, y: mImg.offsetTop + mh };
    scene.ch = choreo();

    scene.useBaby = isGecko();
    if (scene.useBaby) {
      if (!scene.baby) { scene.baby = createRig('baby', 'shadowed'); host.insertBefore(scene.baby.el, bImg.nextSibling); }
      scene.baby.el.style.display = '';
      bImg.classList.add('animHidden');
      // gecko.png 320×320: фігура займає x 9..320, y 38..293
      const w = bImg.offsetWidth || 62, h = w;
      const left = bImg.offsetLeft, top = bImg.offsetTop;
      scene.baby.sizeByHeight(h * 255 / 320);
      scene.babyBase = { x: left + w * (164.5 / 320), y: top + h * 293 / 320 };
    } else {
      bImg.classList.remove('animHidden');
      if (scene.baby) scene.baby.el.style.display = 'none';
    }
    scene.phase = 'hug';
    scene.t0 = performance.now();
    scene.headR = 9;
    if (!scene.on) { scene.on = true; scene.raf = requestAnimationFrame(tick); }
  }

  function closeScene() {
    scene.on = false; scene.phase = 'off';
    cancelAnimationFrame(scene.raf);
    ['mamaSvg', 'mamaBabyImg'].forEach(id => $(id) && $(id).classList.remove('animHidden'));
    if (scene.mama) scene.mama.el.style.display = 'none';
    if (scene.baby) scene.baby.el.style.display = 'none';
  }

  function startRun() {
    if (!scene.on || !scene.useBaby || scene.phase === 'turn' || scene.phase === 'run') return;
    scene.phase = 'turn';
    scene.tRun = performance.now();
    // фініш — за правим краєм екрана (сцена вужча за екран)
    const host = $('mamaScene'), r = host.getBoundingClientRect();
    const screenRight = (document.getElementById('app') || document.body).getBoundingClientRect().right || window.innerWidth;
    const babyW = scene.baby.figW * scene.baby.s;
    scene.runFrom = scene.babyPos ? scene.babyPos.x : scene.babyBase.x;
    scene.runTo = (Math.min(screenRight, window.innerWidth) - r.left) + babyW * .6;
  }

  function tick(now) {
    if (!scene.on) return;
    const t = (now - scene.t0) / 1000;
    const ch = scene.ch;
    let babyPose = null, babyFocus = null;

    if (scene.useBaby && scene.baby) {
      const B = scene.baby, base = scene.babyBase;
      if (scene.phase === 'hug') {
        babyPose = addPose(base, babyHug(t));
      } else if (scene.phase === 'turn' || scene.phase === 'run') {
        const ms = now - scene.tRun;
        if (ms < TURN_MS) {
          babyPose = addPose({ x: scene.runFrom, y: base.y }, babyTurn(ms / TURN_MS));
        } else {
          scene.phase = 'run';
          const u = clamp((ms - TURN_MS) / RUN_MS, 0, 1);
          const k = u * u * .45 + u * .55;                       // розгін
          const x = lerp(scene.runFrom, scene.runTo, k);
          const rp = runPose((ms - TURN_MS) / 1000, { face: -1 });
          babyPose = addPose({ x, y: base.y }, rp);
          if (now - scene.lastDust > 85 && u < .97) {
            scene.lastDust = now;
            dust(B.el.parentNode, x - B.figW * B.s * .3, base.y - 2, -1);
          }
          if (u >= 1) scene.phase = 'gone';
        }
      } else if (scene.phase === 'gone') {
        babyPose = addPose({ x: scene.runTo + 400, y: base.y }, babyIdle(t));
      }
      if (babyPose) {
        B.apply(babyPose);
        scene.babyPos = { x: babyPose.x - (babyPose.dx || 0), y: base.y };
        babyFocus = { x: babyPose.x, y: babyPose.y - B.figH * B.s * .55 };
      }
    }

    // мама: дихання + ніжний нахил голови; стежить поглядом за малюком
    if (scene.mama) {
      const M = scene.mama, base = scene.mamaBase;
      const b = Math.sin(TAU * t / ch.dur);
      let target;
      if (babyFocus && scene.phase !== 'gone') {
        const eye = M.toScene(535, 73);
        const a = Math.atan2(babyFocus.y - eye.y, babyFocus.x - eye.x) * 180 / Math.PI;
        target = clamp((a - 8) * .6, -9, 13);
        if (scene.phase === 'hug') target += 3 * (.5 - .5 * Math.cos(TAU * t / 1.7)); // кивок назустріч малому
      } else if (scene.phase === 'gone') {
        target = -3 + 2 * Math.sin(TAU * t / 3);   // усміхнено дивиться вслід, ледь хитає головою
      } else {
        target = 6 + 3 * Math.sin(TAU * t / ch.dur + 1);
      }
      const follow = scene.phase === 'run' || scene.phase === 'turn' ? .2 : .08;
      scene.headR = lerp(scene.headR, target, follow);
      const lean = clamp(ch.tilt, 0, 12) * .25;
      const hugLean = scene.phase === 'hug' && babyFocus ? 2.5 * (.5 - .5 * Math.cos(TAU * t / 1.7)) : 0; // нахиляється до малого
      M.apply({
        x: base.x, y: base.y - clamp(ch.bounce, 0, 20) * .18 * (.5 + .5 * b),
        sx: 1 - .006 * b, sy: 1 + .012 * b, rot: lean * Math.sin(TAU * t / ch.dur + .4) + hugLean,
        parts: {
          head: { r: scene.headR + 1.2 * b },
          tail: { r: 2.2 * Math.sin(TAU * t / 3.4) },
        },
      });
    }
    scene.raf = requestAnimationFrame(tick);
  }

  function hookScene() {
    const ov = $('mamaOverlay'), bImg = $('mamaBabyImg');
    if (!ov || !bImg || hookScene.done) return;
    hookScene.done = true;
    new MutationObserver(() => {
      const open = !ov.classList.contains('hidden');
      if (open && scene.phase === 'off') openScene();
      else if (!open && scene.phase !== 'off') closeScene();
    }).observe(ov, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(() => {
      if (bImg.classList.contains('running')) startRun();
      else if (scene.on && scene.phase !== 'hug' && !ov.classList.contains('hidden')) openScene(); // нова сцена
    }).observe(bImg, { attributes: true, attributeFilter: ['class'] });
    if (!ov.classList.contains('hidden')) openScene();
  }

  // Скрипт підключено в кінці <body> — DOM уже є. Ще й на init, про всяк випадок.
  hookScene();
  if (window.BO) window.BO.on('init', hookScene);

  window.BOAnim = { createRig, runPose, babyIdle, babyTurn, dust, puff, RIG, rigFor, walkPose, walkPeriod, idlePose, walkFx };
})();
