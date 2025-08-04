// Simple service worker for caching
const CACHE_NAME = 'dhaniverse-v1';
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
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});