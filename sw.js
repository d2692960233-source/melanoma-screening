// Service Worker for Melanoma Screening PWA
// Caches model files + app shell for offline use

const CACHE_NAME = 'melanoma-screening-v1';
const ASSETS_TO_CACHE = [
  '/melanoma-screening/',
  '/melanoma-screening/index.html',
  '/melanoma-screening/worker.js',
  '/melanoma-screening/manifest.json',
  '/melanoma-screening/tfjs_model/model.json',
  '/melanoma-screening/tfjs_model/preprocess.json',
  '/melanoma-screening/tfjs_model/group1-shard1of5.bin',
  '/melanoma-screening/tfjs_model/group1-shard2of5.bin',
  '/melanoma-screening/tfjs_model/group1-shard3of5.bin',
  '/melanoma-screening/tfjs_model/group1-shard4of5.bin',
  '/melanoma-screening/tfjs_model/group1-shard5of5.bin'
];

// Install: cache all critical assets (including 17MB model)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell + model files...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      console.log('[SW] All assets cached. App ready for offline use.');
      return self.skipWaiting();
    })
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: cache-first strategy (fast + offline)
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Return cached response immediately
      if (cached) return cached;

      // Otherwise fetch from network and cache for next time
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(() => {
        // Offline fallback: return index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/melanoma-screening/');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
