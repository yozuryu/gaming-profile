const CACHE_NAME = 'gaming-hub-v1';

// Static assets — cache-first
const PRECACHE = [
  '/gaming-hub/',
  '/gaming-hub/index.html',
  '/gaming-hub/profile/ra/index.html',
  '/gaming-hub/profile/ra/app.js',
  '/gaming-hub/profile/ra/utils/constants.js',
  '/gaming-hub/profile/ra/utils/helpers.js',
  '/gaming-hub/profile/ra/utils/transform.js',
  '/gaming-hub/profile/steam/index.html',
  '/gaming-hub/profile/steam/app.js',
  '/gaming-hub/profile/steam/utils/constants.js',
  '/gaming-hub/profile/steam/utils/helpers.js',
  '/gaming-hub/activity/index.html',
  '/gaming-hub/activity/app.js',
  '/gaming-hub/activity/utils/constants.js',
  '/gaming-hub/activity/utils/helpers.js',
  '/gaming-hub/activity/utils/normalizers.js',
  '/gaming-hub/completions/index.html',
  '/gaming-hub/completions/app.js',
  '/gaming-hub/changelog/index.html',
  '/gaming-hub/changelog/app.js',
  '/gaming-hub/assets/avatar.png',
  '/gaming-hub/assets/icon-ra.png',
  '/gaming-hub/assets/icon-steam.png',
  '/gaming-hub/assets/icon-192.png',
  '/gaming-hub/assets/icon-512.png',
];

// Install — precache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate — delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch — network-first for JSON data, cache-first for everything else
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  const isData = url.pathname.startsWith('/gaming-hub/data/') ||
                 url.pathname.startsWith('/gaming-hub/changelog.md');

  if (isData) {
    // Network-first: always try fresh data, fall back to cache if offline
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first: static assets served from cache, network fallback
    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || fetch(event.request)
          .then(res => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            return res;
          })
        )
    );
  }
});
