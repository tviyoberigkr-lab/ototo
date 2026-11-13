/* OTOTO — service worker: гра працює без інтернету. CoLaba Production.

   Список файлів і версія нижче генеруються автоматично:
       python3 tools/build_precache.py
   Запускати після КОЖНОЇ зміни файлів гри — тоді версія зміниться і телефон
   тихо завантажить оновлення. Нова версія вмикається при наступному запуску
   гри (без перезавантаження посеред гри). Мережевих запитів назовні немає. */

/* PRECACHE-START (не редагувати вручну) */
const VERSION = 'dbd48c806741';
const PRECACHE = [
  "achieve.css",
  "achieve.js",
  "anim.css",
  "anim.js",
  "app.js",
  "bonus.css",
  "bonus.js",
  "countries.js",
  "decor.css",
  "decor.js",
  "edu.css",
  "edu.js",
  "edu_draw.css",
  "edu_draw.js",
  "edu_logic.css",
  "edu_logic.js",
  "edu_math.css",
  "edu_math.js",
  "edu_read.css",
  "edu_read.js",
  "edu_world.css",
  "edu_world.js",
  "fit.js",
  "holidays.css",
  "holidays.js",
  "index.html",
  "manifest.webmanifest",
  "map.css",
  "map.js",
  "parent.css",
  "parent.js",
  "pwa.js",
  "rig_data.js",
  "sound.css",
  "sound.js",
  "splash.css",
  "splash.js",
  "style.css",
  "tips.css",
  "tips.js",
  "fonts/liberation-serif-regular.woff2",
  "img/cactus.png",
  "img/gecko.png",
  "img/mama.png",
  "img/mushroom.png",
  "img/robot.png",
  "img/whale.png",
  "img/brand/eye.png",
  "img/brand/face.png",
  "img/flags/al.svg",
  "img/flags/am.svg",
  "img/flags/at.svg",
  "img/flags/az.svg",
  "img/flags/ba.svg",
  "img/flags/be.svg",
  "img/flags/bg.svg",
  "img/flags/ca.svg",
  "img/flags/ch.svg",
  "img/flags/cy.svg",
  "img/flags/cz.svg",
  "img/flags/de.svg",
  "img/flags/dk.svg",
  "img/flags/ee.svg",
  "img/flags/es.svg",
  "img/flags/fi.svg",
  "img/flags/fr.svg",
  "img/flags/gb.svg",
  "img/flags/ge.svg",
  "img/flags/gr.svg",
  "img/flags/hr.svg",
  "img/flags/hu.svg",
  "img/flags/ie.svg",
  "img/flags/is.svg",
  "img/flags/it.svg",
  "img/flags/kg.svg",
  "img/flags/kz.svg",
  "img/flags/lt.svg",
  "img/flags/lu.svg",
  "img/flags/lv.svg",
  "img/flags/md.svg",
  "img/flags/me.svg",
  "img/flags/mk.svg",
  "img/flags/mt.svg",
  "img/flags/nl.svg",
  "img/flags/no.svg",
  "img/flags/pl.svg",
  "img/flags/pt.svg",
  "img/flags/ro.svg",
  "img/flags/rs.svg",
  "img/flags/se.svg",
  "img/flags/si.svg",
  "img/flags/sk.svg",
  "img/flags/tj.svg",
  "img/flags/tm.svg",
  "img/flags/ua.svg",
  "img/flags/us.svg",
  "img/flags/uz.svg",
  "img/icons/apple-touch-icon.png",
  "img/icons/favicon-16.png",
  "img/icons/favicon-32.png",
  "img/icons/icon-192.png",
  "img/icons/icon-512.png",
  "img/icons/icon-maskable-512.png",
  "img/map/forest/acorn.png",
  "img/map/forest/bg.jpg",
  "img/map/forest/boletus.png",
  "img/map/forest/fir.png",
  "img/map/forest/fox.png",
  "img/map/forest/hedgehog.png",
  "img/map/forest/oak.png",
  "img/map/meadow/bg.jpg",
  "img/map/meadow/butterfly.png",
  "img/map/meadow/clover.png",
  "img/map/meadow/daisy.png",
  "img/map/meadow/mushroom.png",
  "img/map/meadow/sunflower.png",
  "img/map/meadow/tulip.png",
  "img/map/sea/wave.png",
  "img/rig/baby_body.png",
  "img/rig/baby_head.png",
  "img/rig/baby_legBF.png",
  "img/rig/baby_legBN.png",
  "img/rig/baby_legFF.png",
  "img/rig/baby_legFL.png",
  "img/rig/baby_legFR.png",
  "img/rig/baby_tail.png",
  "img/rig/cactus_armL.png",
  "img/rig/cactus_armR.png",
  "img/rig/cactus_body.png",
  "img/rig/cactus_footL.png",
  "img/rig/cactus_footR.png",
  "img/rig/mama_body.png",
  "img/rig/mama_head.png",
  "img/rig/mama_tail.png",
  "img/rig/mushroom_armL.png",
  "img/rig/mushroom_armR.png",
  "img/rig/mushroom_body.png",
  "img/rig/mushroom_cap.png",
  "img/rig/mushroom_footL.png",
  "img/rig/mushroom_footR.png",
  "img/rig/robot_armL.png",
  "img/rig/robot_armR.png",
  "img/rig/robot_body.png",
  "img/rig/robot_head.png",
  "img/rig/robot_legL.png",
  "img/rig/robot_legR.png",
  "img/rig/whale_body.png",
  "img/rig/whale_finF.png",
  "img/rig/whale_finN.png",
  "img/rig/whale_tail.png",
  "lang/de.js",
  "lang/en.js",
  "lang/es.js",
  "lang/fr.js",
  "lang/kk.js",
  "lang/pl.js",
  "lang/ro.js",
  "lang/uk.js"
];
/* PRECACHE-END */

const PREFIX = 'bo-cache-';
const CACHE = PREFIX + VERSION;

// Встановлення: кладемо всі файли гри в новий кеш. Старий кеш не чіпаємо —
// відкрита зараз гра далі працює зі старою версією.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE.map(u => new Request(u, { cache: 'reload' }))))
  );
  // skipWaiting НЕ викликаємо: нова версія чекає, доки всі вкладки гри закриються.
});

// Активація (наступний запуск): прибираємо старі кеші цієї гри.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Запити: спершу кеш, потім мережа (лише для файлів з нашого ж сайту).
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Відкриття гри (".", "/", "index.html", з ?параметрами) — завжди index.html з кешу.
    if (req.mode === 'navigate') {
      const page = await cache.match('index.html');
      if (page) return page;
    }
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      // Файл, якого немає в списку (напр. нові записи reactions/), — докладаємо в кеш.
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    } catch (e) {
      if (req.mode === 'navigate') {
        const page = await cache.match('index.html');
        if (page) return page;
      }
      return Response.error();
    }
  })());
});
