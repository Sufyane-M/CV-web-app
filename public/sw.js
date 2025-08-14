const CACHE_NAME = 'cv-analyzer-v2';
const STATIC_CACHE = 'static-v2';
const API_CACHE = 'api-v2';

// Assets da cachare immediatamente (solo quelli sicuramente presenti)
const STATIC_ASSETS = [
  '/',
  '/index.html'
];

// Installazione Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Attivazione Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => 
            cacheName !== STATIC_CACHE && 
            cacheName !== API_CACHE &&
            cacheName !== CACHE_NAME
          )
          .map(cacheName => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// Strategia di caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests; skip HEAD/POST/PUT/DELETE and range requests
  if (request.method !== 'GET' || request.headers.has('range')) {
    return;
  }

  // Strategy: network-first for JS/CSS on first load to prevent stale code serving; cache-first for images
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Only cache successful JS/CSS GET responses
          if (response && response.ok && (response.type === 'basic' || response.type === 'cors')) {
            const responseClone = response.clone();
            event.waitUntil(
              caches.open(STATIC_CACHE)
                .then(cache => cache.put(request, responseClone))
                .catch(() => {})
            );
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (request.destination === 'image' || request.destination === 'font') {
    event.respondWith(
      caches.match(request)
        .then(response => response || fetch(request))
    );
    return;
  }

  // Network First per API calls
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache only successful GET responses; skip opaque/partial
          if (response && response.ok && (response.type === 'basic' || response.type === 'cors')) {
            const responseClone = response.clone();
            event.waitUntil(
              caches.open(API_CACHE)
                .then(cache => cache.put(request, responseClone))
                .catch(() => {})
            );
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(request);
        })
    );
    return;
  }

  // Stale-While-Revalidate only for navigations/pages
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request)
        .then(response => {
          const networkFetch = fetch(request)
            .then(fetchResponse => {
              if (fetchResponse && fetchResponse.ok && (fetchResponse.type === 'basic' || fetchResponse.type === 'cors')) {
                const cloneForCache = fetchResponse.clone();
                event.waitUntil(
                  caches.open(CACHE_NAME)
                    .then(cache => cache.put(request, cloneForCache))
                    .catch(() => {})
                );
              }
              return fetchResponse;
            })
            .catch(() => response);

          return response || networkFetch;
        })
    );
    return;
  }

  // For any other GET requests, fall back to network
  // without interfering to avoid unexpected MIME/type issues
  // and let the browser handle caching heuristics.
  // Note: no respondWith means default browser fetch proceeds.
  return;
});