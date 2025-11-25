const CACHE_NAME = 'tempo-tune-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  'index.html',
  'metronome.html',
  'settings.html',
  'styles.css',
  'app.js',
  'metronome.js',
  'theme.js',
  'manifest.json',
  'icons/icon.png',
  'icons/iconSmall.png',
  // Add more assets if needed (e.g., sounds, other icons)
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => {
        // Optionally, fallback to index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('index.html');
        }
      });
    })
  );
});
