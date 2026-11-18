// Saves the app's own files for offline use, which matters in a gym with poor signal.
// Workout logs are never in here: they live in IndexedDB.
// Uses stale-while-revalidate so cached screens load instantly and updates fetch in the background.
const CACHE = 'workout-tracker-v8';
const FILES = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './js/app.js',
  './js/art.js',
  './js/charts.js',
  './js/logic.js',
  './js/plan.js',
  './js/store.js',
  './js/timer.js',
  './js/ui.js',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request, { ignoreSearch: true });
    const fetchAndCache = async () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      try {
        const response = await fetch(request, { signal: ctrl.signal });
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } finally {
        clearTimeout(timer);
      }
    };
    if (cached) {
      event.waitUntil(fetchAndCache().catch(() => {}));
      return cached;
    }
    try {
      return await fetchAndCache();
    } catch {
      return (await cache.match('./index.html')) || Response.error();
    }
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (all.length > 0) {
      await all[0].focus();
      return;
    }
    await self.clients.openWindow('./index.html');
  })());
});
