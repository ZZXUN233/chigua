const CACHE = 'chigua-v1';
const ASSETS = [
  '/chigua/',
  '/chigua/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request)).catch(() => caches.match('/chigua/'))
  );
});
