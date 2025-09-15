// Simple service worker for caching
const CACHE_NAME = 'dhaniverse-v1';
const CHUNK_CACHE = 'dhaniverse-chunks-v1';
const urlsToCache = [
  '/',
  '/src/style.css',
  '/UI/thumbnail.png',
  '/UI/whatMakesDifference.png',
  '/UI/buildingsThatTeach.svg',
  'https://cdn.jsdelivr.net/npm/phaser@3.88.2/dist/phaser.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/maps/chunks/')) {
    // Cache-first for chunk images
    event.respondWith(
      caches.open(CHUNK_CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const resp = await fetch(event.request);
          if (resp && resp.ok) cache.put(event.request, resp.clone());
          return resp;
        } catch (e) {
          return cached || new Response('Offline chunk unavailable', { status: 503 });
        }
      })
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(r => r || fetch(event.request))
  );
});
