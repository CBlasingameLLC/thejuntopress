const CACHE_NAME = 'junto-press-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/assets/css/main.css',
  '/assets/css/custom.css',
  '/assets/js/main.js',
  '/assets/js/util.js',
  '/assets/js/breakpoints.min.js',
  '/assets/js/browser.min.js',
  '/assets/js/jquery.min.js',
  '/_pagefind/pagefind-ui.css',
  '/_pagefind/pagefind-ui.js',
  '/assets/images/logo.png', /* Added your new master logo so it loads offline */
  '/tools/blackjack/',
  '/tools/risk-of-ruin/',
  '/tools/slots/'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate Event: Clears out old caches when you update the CACHE_NAME version
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Fetch Event: NETWORK FIRST, fallback to cache
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If the network fetch is successful, clone it and update the cache dynamically
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // If the network fails (offline), serve from cache
        return caches.match(event.request);
      })
  );
});