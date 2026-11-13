/* OTOTO — модуль «Звук + вібрація». CoLaba Production.
   Усі звуки синтезуються Web Audio API (осцилятори, обвідні, фільтрований шум). Тихо, м'яко, коротко.
   Виняток — 15 радісних реакцій персонажа: це короткі голосові вигуки без слів
   (reactions/react_01..15.mp3, ~80 КБ разом, ліцензії — reactions/LICENSES.txt);
   якщо файл не завантажився — грає синтезована заглушка.
   Вібрація — navigator.vibrate (Android); де її немає (iOS Safari) — тихо пропускаємо.
   Кнопка 🔊/🔇 у #navRow вимикає і звук, і вібрацію (BO.state.sound.muted).
   Ядро (app.js) та інші модулі не правляться: тільки BO.on(...), делеговані
   кліки на document (фаза capture, нічого не зупиняємо) і MutationObserver. */
(function () {
  'use strict';
  if (!window.BO) return;
  const BO = window.BO;

  const MASTER = 0.22;          // загальна гучність (низька: телефон біля вуха дитини)
  const mem = { muted: false, reactionIndex: 0 }; // до першої активації (екран країни) збереження ще немає

  /* ---------- стан ---------- */
  function snd() {
    const s = BO.state;
    if (!s) return mem;
    if (!s.sound || typeof s.sound !== 'object') return mem; // до 'init' (сцена яйця) — пам'ять
    return s.sound;
  }
  const isMuted = () => !!snd().muted;

  /* ---------- синтез: кожен звук = fn(ctx, out, t0) ---------- */
  // детермінований "рандом", щоб звук завжди був однаковий (і WAV збігався з грою)
  function prng(seed) { let x = seed >>> 0 || 1; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); }

  function tone(ctx, out, t, f, dur, o) {
    o = o || {};
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.slide || dur));
    if (o.vib) { // м'яке вібрато
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = o.vib; lg.gain.value = f * 0.012;
      l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.05);
    }
    const v = o.vol == null ? 0.5 : o.vol, a = o.a || 0.006;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (o.lp) { const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.lp; osc.connect(f2); node = f2; }
    node.connect(g); g.connect(out);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  let noiseBuf = null;
  function noise(ctx, out, t, dur, o) {
    o = o || {};
    if (!noiseBuf || noiseBuf.sampleRate !== ctx.sampleRate || noiseBuf._ctx !== ctx) {
      const len = Math.floor(ctx.sampleRate * 0.7), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0), r = prng(7);
      for (let i = 0; i < len; i++) d[i] = r() * 2 - 1;
      noiseBuf = b; noiseBuf._ctx = ctx;
    }
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const flt = ctx.createBiquadFilter(); flt.type = o.ft || 'bandpass'; flt.Q.value = o.q || 1;
    flt.frequency.setValueAtTime(o.f || 1000, t);
    if (o.to) flt.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const g = ctx.createGain(), v = o.vol == null ? 0.4 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (o.a || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(out);
    src.start(t, (o.off || 0) % 0.5); src.stop(t + dur + 0.02);
  }

  const N = { C4: 261.63, E4: 329.63, G4: 392, A4: 440, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880,
              B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98, A6: 1760, C7: 2093 };

  function sparkle(ctx, out, t, notes, step, vol) {
    notes.forEach((f, i) => tone(ctx, out, t + i * step, f, 0.22, { type: 'sine', vol: vol || 0.22 }));
  }

  const SOUNDS = {
    // звичайний тап по кнопці — коротке м'яке "тюк"
    tap: (c, o, t) => tone(c, o, t, 820, 0.07, { type: 'triangle', to: 1050, vol: 0.45 }),
    // назад/закрити — те саме, але вниз
    back: (c, o, t) => tone(c, o, t, 900, 0.08, { type: 'triangle', to: 640, vol: 0.28 }),
    // відкрити меню/екран — два кроки вгору "блуп-ліп"
    open: (c, o, t) => { tone(c, o, t, 600, 0.09, { to: 760, vol: 0.4 }); tone(c, o, t + 0.07, 900, 0.14, { to: 1150, vol: 0.34 }); },
    // їжа — три "ням" (фільтрований шум + м'який низький удар)
    feed: (c, o, t) => { for (let i = 0; i < 3; i++) { const s = t + i * 0.12;
      noise(c, o, s, 0.07, { ft: 'lowpass', f: 1300, to: 500, vol: 0.38, off: i * 0.11 });
      tone(c, o, s, 230 - i * 15, 0.08, { to: 150, vol: 0.38 }); } },
    // миття — бульбашки, що злітають угору
    wash: (c, o, t) => { const r = prng(11); for (let i = 0; i < 7; i++) {
      const f = 480 + r() * 650; tone(c, o, t + i * 0.055 + r() * 0.02, f, 0.06, { to: f * 1.9, vol: 0.26 }); } },
    // заснув — колискове "дінь-дінь-дінь" униз
    sleep: (c, o, t) => [N.G5, N.E5, N.C5].forEach((f, i) => tone(c, o, t + i * 0.16, f, 0.3, { vol: 0.3, vib: 5, a: 0.02 })),
    // прокинувся — бадьоро вгору
    wake: (c, o, t) => [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(c, o, t + i * 0.08, f, 0.16, { type: 'triangle', vol: 0.3 })),
    // лікування — іскристі дзвіночки
    heal: (c, o, t) => { sparkle(c, o, t, [N.C6, N.E6, N.G6, N.C7, N.G6, N.C7], 0.055, 0.2);
      noise(c, o, t, 0.4, { ft: 'highpass', f: 6000, vol: 0.05, a: 0.05 }); },
    // бал у міні-грі (висота росте з рахунком — див. play('point', n))
    point: (c, o, t, n) => { const f = N.D5 * Math.pow(2, Math.min(Math.max((n || 1) - 1, 0), 14) / 12);
      tone(c, o, t, f, 0.1, { type: 'triangle', vol: 0.5 }); tone(c, o, t + 0.035, f * 1.5, 0.09, { vol: 0.22 }); },
    // тап у міні-грі без бала — ледь чутне "тік"
    tick: (c, o, t) => tone(c, o, t, 420, 0.04, { type: 'triangle', to: 360, vol: 0.14 }),
    // кінець міні-гри — коротка мелодія
    gameEnd: (c, o, t) => { [N.C5, N.E5, N.G5].forEach((f, i) => tone(c, o, t + i * 0.1, f, 0.13, { type: 'triangle', vol: 0.3 }));
      tone(c, o, t + 0.3, N.C6, 0.3, { type: 'triangle', vol: 0.3 }); tone(c, o, t + 0.3, N.E5, 0.3, { vol: 0.14 }); },
    // нараховано бали — "дзинь" монетки
    coin: (c, o, t) => { tone(c, o, t, N.B5, 0.07, { type: 'square', vol: 0.2, lp: 3200 }); tone(c, o, t + 0.065, N.E6, 0.3, { type: 'square', vol: 0.2, lp: 4000 }); tone(c, o, t + 0.065, N.E6 * 2, 0.18, { vol: 0.08 }); },
    // новий рекорд — урочисто вгору + іскри
    record: (c, o, t) => { [N.G5, N.C6, N.E6].forEach((f, i) => tone(c, o, t + i * 0.09, f, 0.14, { type: 'triangle', vol: 0.3 }));
      [N.C6, N.E6, N.G6].forEach(f => tone(c, o, t + 0.27, f, 0.33, { type: 'triangle', vol: 0.16 }));
      sparkle(c, o, t + 0.3, [N.C7, N.G6, N.C7], 0.06, 0.1); },
    // тап по яйцю: рівень 0..6 — що далі, то гучніший і вищий "тук", з 5-го — тріщинка
    egg: (c, o, t, lvl) => { lvl = Math.max(0, Math.min(6, lvl || 0));
      tone(c, o, t, 170 + lvl * 28, 0.09 + lvl * 0.01, { to: 110, vol: 0.3 + lvl * 0.04 });
      noise(c, o, t, 0.05, { ft: 'bandpass', f: 1400 + lvl * 250, q: 2, vol: 0.18 + lvl * 0.03, off: lvl * 0.07 });
      if (lvl >= 5) noise(c, o, t + 0.03, 0.06, { ft: 'highpass', f: 3500, vol: 0.12 + (lvl - 5) * 0.06, off: 0.3 });
      if (lvl >= 3) tone(c, o, t + 0.02, 1200 + lvl * 120, 0.12, { vol: 0.05 + lvl * 0.012 }); },
    // яйце розкрилось — чарівне арпеджіо
    hatch: (c, o, t) => { noise(c, o, t, 0.08, { ft: 'highpass', f: 2500, vol: 0.2 });
      [N.C5, N.E5, N.G5, N.C6, N.E6, N.G6, N.C7].forEach((f, i) => tone(c, o, t + 0.04 + i * 0.05, f, 0.26, { vol: 0.2 }));
      [N.C5, N.G5, N.E6].forEach(f => tone(c, o, t + 0.36, f, 0.24, { type: 'triangle', vol: 0.1, a: 0.02 })); },
    // мама — теплий м'який акорд
    mama: (c, o, t) => [N.C4, N.E4, N.G4, N.C5].forEach((f, i) => tone(c, o, t + i * 0.035, f, 0.58, { vol: 0.17, a: 0.09, vib: 4.5, lp: 1800 })),
    // малюк біжить (тап по підказці в сцені мами) — "фюх"
    run: (c, o, t) => noise(c, o, t, 0.28, { ft: 'bandpass', f: 500, to: 2500, q: 1.2, vol: 0.5, a: 0.05 }),
    // бульбашка-бонус лопнула
    bubble: (c, o, t) => { tone(c, o, t, 950, 0.06, { to: 260, slide: 0.05, vol: 0.4 });
      noise(c, o, t, 0.03, { ft: 'highpass', f: 3000, vol: 0.12 }); tone(c, o, t + 0.07, N.E6, 0.15, { vol: 0.12 }); },
    // золота бульбашка — лопнула + золоті іскри
    gold: (c, o, t) => { SOUNDS.bubble(c, o, t);
      sparkle(c, o, t + 0.08, [N.E6, N.G6, N.C7, N.E6 * 2, N.C7], 0.06, 0.15); },
    // нагорода рівня на мапі — фанфара
    fanfare: (c, o, t) => { [N.C5, N.E5, N.G5].forEach((f, i) => tone(c, o, t + i * 0.09, f, 0.12, { type: 'triangle', vol: 0.28 }));
      [N.C5, N.E5, N.G5, N.C6].forEach(f => tone(c, o, t + 0.29, f, 0.31, { type: 'triangle', vol: 0.14, vib: 6 }));
      sparkle(c, o, t + 0.32, [N.E6, N.G6, N.C7], 0.05, 0.08); },
    // куплено (декор, друг) — "дзинь-дзинь" + поставили
    buy: (c, o, t) => { tone(c, o, t, N.A5, 0.12, { type: 'triangle', vol: 0.26 }); tone(c, o, t + 0.08, N.D6, 0.2, { type: 'triangle', vol: 0.26 });
      SOUNDS.place(c, o, t + 0.22); },
    // поставити/зняти предмет, вдягнути річ — м'яке "плоп"
    place: (c, o, t) => tone(c, o, t, 300, 0.11, { to: 560, slide: 0.06, vol: 0.36 }),
    // не вистачає балів / не можна — м'яке "у-у" вниз, зовсім не страшне
    nope: (c, o, t) => { tone(c, o, t, 392, 0.11, { type: 'triangle', vol: 0.26, lp: 1200 }); tone(c, o, t + 0.12, 311, 0.16, { type: 'triangle', vol: 0.24, lp: 1000 }); },
    // подія/повідомлення (модалка без кліку) — дзвіночок
    event: (c, o, t) => { tone(c, o, t, N.C6, 0.3, { vol: 0.22 }); tone(c, o, t + 0.09, N.G6, 0.35, { vol: 0.16 }); },
  };

  /* ---------- 15 радісних реакцій-заглушок ("Уа!", "Вау!", "Юху!" …) ----------
     Голосоподібний синтез: пилка з контуром висоти → 3 смугові фільтри-форманти,
     що "ковзають" між голосними (так утворюється "у-а-у" = "вау"). Кожна реакція
     відрізняється висотою, ритмом, голосними й довжиною; у кінці — дзвіночки.
     Справжні записи голосу замінюють їх без змін коду — див. README.txt. */
  const VOW = { // форманти F1, F2, F3 (дитячий/мультяшний голос)
    a: [1000, 1450, 3100], e: [620, 2250, 3200], i: [380, 2850, 3550], o: [620, 1050, 2950],
    u: [420, 920, 2850], y: [360, 2700, 3400], ae: [900, 1950, 3050],
  };
  function syl(ctx, out, t, o) {
    const d = o.dur, src = ctx.createOscillator(); src.type = 'sawtooth';
    const f = o.f0; src.frequency.setValueAtTime(f[0], t);
    f.slice(1).forEach((x, i) => src.frequency.linearRampToValueAtTime(x, t + d * (i + 1) / (f.length - 1)));
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = o.vibHz || 6; vg.gain.value = f[0] * (o.vib || 0.015);
    vib.connect(vg); vg.connect(src.frequency);
    const soft = ctx.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 4200; src.connect(soft);
    const env = ctx.createGain(), v = (o.vol || 1) * 0.55;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(v, t + Math.min(0.035, d * 0.25));
    env.gain.setValueAtTime(v, t + d * 0.7);
    env.gain.exponentialRampToValueAtTime(0.0001, t + d);
    [1, 0.55, 0.22].forEach((gn, k) => {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = [5, 9, 12][k];
      const vs = o.v; bp.frequency.setValueAtTime(VOW[vs[0]][k], t);
      vs.slice(1).forEach((name, i) => bp.frequency.linearRampToValueAtTime(VOW[name][k], t + d * 0.15 + (d * 0.7) * (i + 1) / (vs.length - 1)));
      const g = ctx.createGain(); g.gain.value = gn * 3.2;
      soft.connect(bp); bp.connect(g); g.connect(env);
    });
    env.connect(out);
    src.start(t); src.stop(t + d + 0.03); vib.start(t); vib.stop(t + d + 0.03);
    if (o.h) noise(ctx, out, t - 0.045, 0.06, { ft: 'bandpass', f: o.h === 'y' ? 3000 : 1600, q: 1.5, vol: 0.12, a: 0.01 });
  }
  // [f0-контур, голосні, тривалість, початок, "придих"] для кожного складу + хвіст-дзвіночки
  const REACT = [
    /* 1 Уа!    */ { s: [{ f0: [380, 540, 470], v: ['u', 'a', 'a'], dur: 0.36 }], tail: [N.G6, N.C7] },
    /* 2 Вау!   */ { s: [{ f0: [330, 560, 430], v: ['u', 'a', 'a', 'u'], dur: 0.46 }], tail: [N.E6, N.G6] },
    /* 3 Юху!   */ { s: [{ f0: [440, 520], v: ['y', 'u'], dur: 0.16 }, { at: 0.2, f0: [560, 660, 600], v: ['u', 'u'], dur: 0.26, h: 'h' }], tail: [N.C7] },
    /* 4 Ура!   */ { s: [{ f0: [380, 400], v: ['u'], dur: 0.1 }, { at: 0.12, f0: [430, 680, 620], v: ['e', 'a', 'a'], dur: 0.34 }], tail: [N.C6, N.E6, N.G6] },
    /* 5 Йей!   */ { s: [{ f0: [500, 720, 690], v: ['y', 'e', 'i'], dur: 0.3, h: 'y' }], tail: [N.A6] },
    /* 6 Оу-у!  */ { s: [{ f0: [520, 400, 480, 620], v: ['o', 'u', 'u'], dur: 0.52, vib: 0.03 }], tail: [N.E6, N.C7] },
    /* 7 Ого!   */ { s: [{ f0: [420, 450], v: ['o'], dur: 0.12 }, { at: 0.17, f0: [560, 640, 600], v: ['o', 'o'], dur: 0.24, h: 'h' }], tail: [N.G6] },
    /* 8 Ееей!  */ { s: [{ f0: [420, 560, 740], v: ['e', 'e', 'i'], dur: 0.55, vib: 0.025 }], tail: [N.C7, N.E6 * 2] },
    /* 9 Ха-ха! */ { s: [{ f0: [500, 520], v: ['a'], dur: 0.12, h: 'h' }, { at: 0.17, f0: [560, 600], v: ['a'], dur: 0.15, h: 'h' }], tail: [N.E6] },
    /* 10 Ві-і! */ { s: [{ f0: [560, 900, 860], v: ['u', 'i', 'i'], dur: 0.4 }], tail: [N.G6, N.C7, N.G6] },
    /* 11 Су-пер*/ { s: [{ f0: [450, 470], v: ['u'], dur: 0.12, h: 'y' }, { at: 0.16, f0: [520, 640, 600], v: ['e', 'ae'], dur: 0.24 }], tail: [N.D6, N.A6] },
    /* 12 Та-да!*/ { s: [{ f0: [440, 450], v: ['a'], dur: 0.1 }, { at: 0.14, f0: [600, 660, 640], v: ['a', 'a'], dur: 0.32 }], tail: [N.C6, N.G6, N.C7] },
    /* 13 Ей-ей!*/ { s: [{ f0: [480, 560], v: ['e', 'i'], dur: 0.14 }, { at: 0.19, f0: [600, 720], v: ['e', 'i'], dur: 0.2 }], tail: [N.A6] },
    /* 14 Ю-ху-у*/ { s: [{ f0: [430, 480], v: ['y', 'u'], dur: 0.12 }, { at: 0.15, f0: [520, 560], v: ['u'], dur: 0.12, h: 'h' }, { at: 0.3, f0: [600, 760, 700], v: ['u', 'u'], dur: 0.28 }], tail: [N.C7] },
    /* 15 Ваа-у!*/ { s: [{ f0: [300, 520, 700, 520], v: ['u', 'a', 'a', 'a', 'u'], dur: 0.62, vib: 0.03, vibHz: 7 }], tail: [N.E6, N.G6, N.C7] },
  ];
  const REACT_GAIN = [0.452, 0.398, 0.7, 0.484, 0.437, 0.232, 0.211, 0.279, 0.525, 0.933, 0.38, 0.617, 0.398, 0.716, 0.412]; // однакова гучність усіх 15 (виміряно RMS)
  REACT.forEach((r, i) => {
    SOUNDS['react' + (i + 1)] = (c, o, t) => {
      if (r.s[0].h) t += 0.05;
      const o2 = c.createGain(); o2.gain.value = REACT_GAIN[i]; o2.connect(o); o = o2; // вирівнювання гучності // місце для придиху перед першим складом
      let end = 0;
      r.s.forEach(x => { syl(c, o, t + (x.at || 0), x); end = Math.max(end, (x.at || 0) + x.dur); });
      sparkle(c, o, t + end - 0.04, r.tail, 0.06, 0.09);
    };
  });

  const VIBE = {
    tap: 10, back: 10, open: 15, feed: [15, 60, 15, 60, 15], wash: 20, sleep: 20, wake: 20, heal: [15, 40, 15],
    point: 12, tick: 0, gameEnd: [20, 40, 30], coin: 12, record: [20, 40, 20, 40, 40],
    egg: 12, hatch: [30, 40, 30, 40, 60], mama: 25, run: 15, bubble: 15, gold: [20, 30, 20, 30, 30],
    fanfare: [25, 50, 25, 50, 40], buy: [20, 40, 20], place: 15, nope: [15, 40, 15], event: 15,
  };

  /* ---------- аудіо-контекст, розблокування на мобільних ---------- */
  let ctx = null, out = null;
  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    const comp = ctx.createDynamicsCompressor(); // запобіжник від перевантаження
    comp.threshold.value = -10; comp.knee.value = 6; comp.ratio.value = 6;
    out = ctx.createGain(); out.gain.value = MASTER;
    out.connect(comp); comp.connect(ctx.destination);
    return ctx;
  }
  let unlocked = false;
  function unlock() {
    const c = ensureCtx();
    if (!c) return;
    if (c.state === 'suspended' && document.visibilityState !== 'hidden') c.resume().catch(() => {});
    if (!unlocked) { // iOS: тихий буфер у межах жесту "відмикає" звук
      unlocked = true;
      try { const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) {}
    }
  }
  ['pointerdown', 'touchend', 'mousedown', 'keydown', 'click'].forEach(ev =>
    document.addEventListener(ev, unlock, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.visibilityState === 'hidden') ctx.suspend().catch(() => {});
    else if (unlocked) ctx.resume().catch(() => {});
  });

  /* ---------- відтворення ---------- */
  const lastAt = {};
  // звуки, що самі є "нагородою": комбо "дзінь + Уа!" чекає, поки вони дозвучать (мс)
  const REWARD_MS = { gameEnd: 560, record: 620, bubble: 220, gold: 480, fanfare: 640, hatch: 620, buy: 360 };
  let rewardEnd = 0;
  function vibrate(name, arg) {
    let p = VIBE[name];
    if (name === 'egg') p = 8 + Math.max(0, Math.min(6, arg || 0)) * 4;
    if (/^react/.test(name)) p = 20;
    if (!p || !navigator.vibrate) return;
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; // до першого тапу браузер блокує й пише помилку в консоль
    try { navigator.vibrate(p); } catch (e) {}
  }
  function ready() {
    const c = ensureCtx();
    return c && (c.state === 'running' || unlocked) ? c : null; // до першого жесту — мовчимо
  }
  function play(name, arg) {
    const fn = SOUNDS[name];
    if (!fn || isMuted() || document.visibilityState === 'hidden') return false;
    const now = performance.now();
    if (lastAt[name] && now - lastAt[name] < 40) return false; // подвійний тригер
    lastAt[name] = now;
    if (REWARD_MS[name]) rewardEnd = Math.max(rewardEnd, now + REWARD_MS[name]);
    vibrate(name, arg);
    const c = ready();
    if (!c) return false;
    try { fn(c, out, c.currentTime + 0.01, arg); } catch (e) { return false; }
    if (window.BO_SOUND && BO_SOUND.onplay) { try { BO_SOUND.onplay(name, arg); } catch (e) {} }
    return true;
  }

  /* ---------- "Успіх": дзінь монетки + радісна реакція (15 по колу) ---------- */
  const REACT_COUNT = 15, THROTTLE = 1200;
  const REACT_DIR = 'reactions/', REACT_EXT = ['mp3', 'ogg', 'wav'];
  const files = {}; // індекс → { buf } (Web Audio) або { el } (HTMLAudio, запасний шлях для file://)
  let lastSuccess = -1e9, pendingSuccess = null;

  function nextReaction() {
    const st = snd();
    const last = +st.reactionIndex || 0;          // 0 = ще жодної; 1..15 = остання зіграна
    return (last % REACT_COUNT) + 1;
  }
  // Голос персонажа: той самий запис, але «як плівка» — повільніше = нижче (кит, грибочок),
  // швидше = вище (кактус); робот — ще й металевий відтінок (кільцева модуляція).
  // Хлопчик (bo) трохи нижче, дівчинка (mimi) трохи вище.
  const VOICE_RATE = { gecko: 1, mushroom: 0.9, robot: 0.97, whale: 0.82, cactus: 1.08 };
  const PERSONA_RATE = { bo: 0.97, mimi: 1.03 };
  function voiceRate() {
    const s = BO.state || {};
    return (VOICE_RATE[s.activeChar] || 1) * (PERSONA_RATE[s.persona] || 1);
  }
  const isRobot = () => (BO.state || {}).activeChar === 'robot';
  function playReaction(i) {
    if (isMuted() || document.visibilityState === 'hidden') return;
    const f = files[i], c = ready();
    if (f && f.buf && c) {
      const src = c.createBufferSource(), g = c.createGain();
      src.buffer = f.buf; src.playbackRate.value = voiceRate();
      g.gain.value = REACT_FILE_GAIN; g.connect(out || c.destination);
      if (isRobot()) { // робот: 50 % чистого голосу + 50 % голосу × синус 70 Гц
        const dry = c.createGain(), ring = c.createGain(), osc = c.createOscillator(), t0 = c.currentTime;
        dry.gain.value = 0.55; ring.gain.value = 0; osc.frequency.value = 70;
        g.gain.value = REACT_FILE_GAIN * 1.3; // модуляція «з'їдає» ~2,5 дБ — компенсуємо (виміряно)
        const depth = c.createGain(); depth.gain.value = 0.75; osc.connect(depth); depth.connect(ring.gain);
        src.connect(dry); src.connect(ring); dry.connect(g); ring.connect(g);
        osc.start(t0); osc.stop(t0 + f.buf.duration / src.playbackRate.value + 0.05);
      } else src.connect(g);
      src.start();
      vibrate('react'); if (BO_SOUND.onplay) BO_SOUND.onplay('reactFile', i);
      return;
    }
    if (f && f.el) {
      try {
        f.el.preservesPitch = false; f.el.webkitPreservesPitch = false; f.el.mozPreservesPitch = false;
        f.el.playbackRate = voiceRate();
        f.el.currentTime = 0; const pr = f.el.play(); if (pr && pr.catch) pr.catch(() => {});
      } catch (e) {}
      vibrate('react'); if (BO_SOUND.onplay) BO_SOUND.onplay('reactFile', i);
      return;
    }
    play('react' + i);
  }
  function playSuccess() {
    pendingSuccess = null;
    if (isMuted() || document.visibilityState === 'hidden') return;
    const wait = rewardEnd - performance.now();
    if (wait > 20) { pendingSuccess = setTimeout(playSuccess, wait); return; } // спершу дозвучить фанфара/джингл
    if (!play('coin')) return;                    // нема звуку (ще не було жесту) — черга не рухається
    const i = nextReaction();
    snd().reactionIndex = i;
    if (BO.state && BO.state.sound) BO.saveState();
    setTimeout(() => playReaction(i), 190);
  }
  // викликається на кожне нарахування балів; кілька подій за 1,2 с — одне комбо
  function successSoon() {
    if (isMuted()) return;
    const now = performance.now();
    if (now - lastSuccess < THROTTLE) return;
    lastSuccess = now;
    clearTimeout(pendingSuccess);
    pendingSuccess = setTimeout(playSuccess, 170);
  }

  // Справжні записи: reactions/react_01.mp3 … react_15.mp3 (або .ogg / .wav — усі в одному форматі).
  // Шукаємо один раз: спершу react_01 у трьох форматах; знайшли — решту тільки в цьому форматі.
  // Немає react_01 — далі не шукаємо (у консолі максимум 3 "not found", гравець їх не бачить).
  // Відсутній номер (напр. записали лише 1–6) — для нього грає синтезована заглушка.
  let filesProbed = false;
  // Поки справжніх записів немає — нічого не шукаємо (інакше в консолі помилки "файл не знайдено").
  // Коли записи покладено в reactions/, тут пишеться їхній формат: 'mp3', 'ogg' або 'wav'.
  const REACT_FILES_EXT = 'mp3'; // 15 голосових вигуків без слів (tools/voice/make_reactions.py), однакові для всіх мов
  // Записи нормалізовані до ≈ −16 LUFS; грають через той самий вихід, що й синтез (MASTER + компресор),
  // множник підібрано вимірюванням (OfflineAudioContext + EBU R128): синтезовані заглушки ≈ −31,5 LUFS,
  // записи з множником 0,65 ≈ −29,8 LUFS — голос-нагорода на ~2 дБ виразніший, але не гучніший за гру.
  // (Раніше тут було 0,9 повз MASTER — це було б на ~14 дБ гучніше за решту звуків.)
  const REACT_FILE_GAIN = 0.65;
  const REACT_EL_VOLUME = 0.21; // запасний шлях file:// (HTMLAudio повз Web Audio) — той самий рівень ≈ −29,8 LUFS
  function probeFiles() {
    if (filesProbed) return; filesProbed = true;
    if (!REACT_FILES_EXT) return;
    if (REACT_EXT.indexOf(REACT_FILES_EXT) > 0) { REACT_EXT.splice(REACT_EXT.indexOf(REACT_FILES_EXT), 1); REACT_EXT.unshift(REACT_FILES_EXT); }
    const first = k => {
      if (k >= REACT_EXT.length) return;
      loadOne(1, REACT_EXT[k], () => { for (let i = 2; i <= REACT_COUNT; i++) loadOne(i, REACT_EXT[k]); }, () => first(k + 1));
    };
    first(0);
  }
  function loadOne(i, ext, ok, fail) {
    ok = ok || (() => {}); fail = fail || (() => {});
    const url = REACT_DIR + 'react_' + String(i).padStart(2, '0') + '.' + ext;
    if (location.protocol === 'file:' || !window.fetch) { // file:// і старі WebView: fetch не працює
      const el = new Audio();
      el.preload = 'auto'; el.volume = REACT_EL_VOLUME;
      el.addEventListener('canplaythrough', () => { if (!files[i]) { files[i] = { el, url }; ok(); } }, { once: true });
      el.addEventListener('error', fail, { once: true });
      el.src = url;
      return;
    }
    fetch(url).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); })
      .then(ab => { const c = ensureCtx(); if (!c) throw 0; return new Promise((res, rej) => c.decodeAudioData(ab, res, rej)); })
      .then(buf => { files[i] = { buf, url }; ok(); })
      .catch(fail);
  }


  /* ---------- зручності для DOM ---------- */
  const $ = id => document.getElementById(id);
  const shown = id => { const el = $(id); return !!el && !el.classList.contains('hidden'); };
  const S = () => BO.state || {};
  const after = fn => setTimeout(fn, 0); // після того, як гра обробила клік
  let lastClickAt = 0;

  const OPEN_IDS = ['btnWardrobe', 'btnCharacters', 'btnDecor', 'btnMap', 'btnLang', 'streak', 'iconEnergy', 'btnStart'];
  const BACK_IDS = ['btnCharactersClose', 'btnGameMenuClose', 'btnWardrobeClose', 'eventClose', 'statClose', 'langModalClose', 'btnLangBack'];

  document.addEventListener('click', e => {
    lastClickAt = performance.now();
    const tg = e.target;
    if (!tg || !tg.closest) return;
    if (tg.closest('#btnSound') || tg.closest('.bonusBubble')) return; // свої / бульбашка — через observer
    const s = S();

    // яйце
    if (tg.closest('#eggAura')) {
      const egg = $('eggAura');
      if (!shown('view-hatch') || egg.classList.contains('hatched')) return;
      after(() => {
        const cl = egg.classList;
        if (cl.contains('hatched')) return play('hatch');
        const lvl = cl.contains('crack2') ? 6 : cl.contains('crack1') ? 5 : cl.contains('tier4') ? 4 :
          cl.contains('tier3') ? 3 : cl.contains('tier2') ? 2 : cl.contains('tier1') ? 1 : 0;
        play('egg', lvl);
      });
      return;
    }
    if (tg.closest('#mamaTapHint')) { if (!$('mamaTapHint').classList.contains('hidden-hint')) play('run'); return; }

    // міні-гра: бал озвучує observer #gameScore; без бала — легке "тік"
    if (tg.closest('#gameArea')) {
      const before = $('gameScore').textContent;
      after(() => { if ($('gameScore').textContent === before) play('tick'); });
      return;
    }

    const btn = tg.closest('button, .decorCard, .charCard, .wardrobeItem, .mapNode, .tapStat, [role="button"]');
    if (!btn) return;
    const id = btn.id;

    if (id === 'btnFeed' || id === 'btnWash') { const asleep = !!s.sleeping; play(asleep ? 'nope' : id === 'btnFeed' ? 'feed' : 'wash'); return; }
    if (id === 'btnSleep') { after(() => play(S().sleeping ? 'sleep' : 'wake')); return; }
    if (id === 'btnHeal') { play(s.sick ? 'heal' : 'nope'); return; }
    if (id === 'btnPlay') { after(() => play(shown('view-gameMenu') ? 'open' : 'nope')); return; }
    if (OPEN_IDS.includes(id)) { play('open'); return; }
    if (BACK_IDS.includes(id) || btn.matches('.decorBack, .decorBackBottom, .mapBack')) { play('back'); return; }
    if (btn.matches('.gameMenuItem')) { play('open'); return; }

    // покупки: порівнюємо стан до і після обробки кліку грою
    if (btn.matches('.dBuy')) {
      const n0 = ((s.decor || {}).owned || []).length;
      after(() => play((((S().decor || {}).owned || []).length > n0) ? 'buy' : 'nope'));
      return;
    }
    if (btn.matches('.cBuy')) {
      const n0 = (s.ownedChars || []).length;
      after(() => play(((S().ownedChars || []).length > n0) ? 'buy' : 'nope'));
      return;
    }
    if (btn.matches('.decorCard')) { play(btn.classList.contains('owned') ? 'place' : btn.classList.contains('locked') ? 'nope' : 'tap'); return; }
    if (btn.matches('.charCard')) { play(btn.classList.contains('locked') ? 'nope' : 'place'); return; }
    if (btn.matches('.wardrobeItem')) { play(btn.classList.contains('locked') ? 'nope' : 'place'); return; }
    if (btn.matches('.mapNode')) {
      const c0 = (s.map || {}).claimed || 0;
      const locked = btn.classList.contains('locked');
      after(() => {
        if (((S().map || {}).claimed || 0) > c0) { play('fanfare'); successSoon(); }
        else play(locked ? 'nope' : 'tap');
      });
      return;
    }
    if (id === 'statAction') { // заповнити енергію / захист стрику за бали
      const p0 = s.points || 0;
      after(() => play((S().points || 0) < p0 ? 'buy' : 'nope'));
      return;
    }
    play('tap');
  }, true);

  /* ---------- спостерігачі ---------- */
  function watchClass(el, fn) { if (el) new MutationObserver(fn).observe(el, { attributes: true, attributeFilter: ['class'] }); }

  // мама з'являється
  let mamaWas = false;
  watchClass($('mamaOverlay'), () => { const v = shown('mamaOverlay'); if (v && !mamaWas) play('mama'); mamaWas = v; });

  // модалка подій (випадкові події тамагочі) — дзвіночок, якщо її не відкрив щойно клік
  let eventWas = false;
  watchClass($('eventModal'), () => {
    const v = shown('eventModal');
    if (v && !eventWas && performance.now() - lastClickAt > 400) play('event');
    eventWas = v;
  });

  // міні-гра: рахунок, кінець, рекорд
  let lastScore = 0, gameWas = false, bestBefore = {};
  const scoreEl = $('gameScore');
  if (scoreEl) new MutationObserver(() => {
    const m = scoreEl.textContent.match(/\d+/g);
    const n = m ? +m[m.length - 1] : 0;
    if (n > lastScore && shown('view-game')) play('point', n);
    lastScore = n;
  }).observe(scoreEl, { childList: true, characterData: true, subtree: true });
  watchClass($('view-game'), () => {
    const v = shown('view-game');
    if (v && !gameWas) { lastScore = 0; bestBefore = Object.assign({}, S().bestScores || {}); }
    if (!v && gameWas) {
      const now = S().bestScores || {};
      const rec = Object.keys(now).some(k => (bestBefore[k] || 0) > 0 && now[k] > bestBefore[k]);
      play(rec ? 'record' : 'gameEnd');
    }
    gameWas = v;
  });

  // бульбашки-бонуси: клас 'popping' на .bonusFloat
  const stageEl = $('stage');
  if (stageEl) new MutationObserver(muts => {
    for (const m of muts) {
      const el = m.target;
      if (el.classList && el.classList.contains('bonusFloat') && el.classList.contains('popping') &&
          !(m.oldValue || '').includes('popping')) {
        play(el.querySelector('.bonusBubble.gold') ? 'gold' : 'bubble');
      }
    }
  }).observe(stageEl, { attributes: true, attributeFilter: ['class'], attributeOldValue: true, subtree: true });

  /* ---------- кнопка 🔊/🔇 ---------- */
  let muteBtn = null;
  function renderBtn() {
    if (!muteBtn) return;
    const m = isMuted();
    muteBtn.querySelector('.soundIcon').textContent = m ? '🔇' : '🔊';
    muteBtn.querySelector('span').textContent = BO.t('sound.nav');
    const label = BO.t(m ? 'sound.unmute' : 'sound.mute');
    muteBtn.title = label;
    muteBtn.setAttribute('aria-label', label);
    muteBtn.setAttribute('aria-pressed', m ? 'true' : 'false');
  }
  function toggleMute() {
    const st = snd();
    st.muted = !st.muted;
    if (st.muted) { clearTimeout(pendingSuccess); pendingSuccess = null; try { navigator.vibrate && navigator.vibrate(0); } catch (e) {} }
    if (BO.state) BO.saveState();
    renderBtn();
    if (!st.muted) play('tap');
  }

  BO.on('init', () => {
    const s = BO.state;
    if (!s.sound || typeof s.sound !== 'object') { s.sound = { muted: !!mem.muted, reactionIndex: +mem.reactionIndex || 0 }; BO.saveState(); }
    if (s.sound.reactionIndex === undefined) s.sound.reactionIndex = 0;
    probeFiles();
    // Місце: #navRow (ряд кнопок модулів). У #topbar на 390px вільного місця немає —
    // він і без нас уже переносить ⭐/🔥 на два рядки, а з ще однією кнопкою вилазить за край.
    const row = $('navRow');
    if (row && !$('btnSound')) {
      muteBtn = document.createElement('button');
      muteBtn.id = 'btnSound';
      muteBtn.type = 'button';
      muteBtn.className = 'navBtn soundNav';
      muteBtn.innerHTML = '<b class="soundIcon"></b><span></span>';
      muteBtn.addEventListener('click', toggleMute);
      row.appendChild(muteBtn);
    }
    renderBtn();
  });
  BO.on('lang', renderBtn);
  BO.on('points', n => { if (n > 0) successSoon(); });

  /* ---------- для тестів і рендеру WAV ---------- */
  window.BO_SOUND = {
    play, names: Object.keys(SOUNDS),
    success: successSoon, playReaction,
    get reactionIndex() { return +snd().reactionIndex || 0; },
    get reactionFiles() { return Object.keys(files).map(k => files[k].url); },
    probeFiles() { filesProbed = false; probeFiles(); },
    REACT_COUNT, THROTTLE,
    // відрендерити звук у будь-який (Offline)AudioContext — той самий код, що й у грі
    renderInto(c, name, arg, gain, when) {
      const g = c.createGain(); g.gain.value = gain == null ? MASTER : gain;
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -10; comp.knee.value = 6; comp.ratio.value = 6;
      g.connect(comp); comp.connect(c.destination);
      SOUNDS[name](c, g, 0.01 + (when || 0), arg);
    },
    voiceRate,
    get muted() { return isMuted(); },
    toggle: toggleMute,
    get ctx() { return ctx; },
    MASTER, VIBE,
    onplay: null,
  };
})();
