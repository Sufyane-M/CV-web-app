const CACHE_NAME = 'cv-analyzer-v1';
const STATIC_CACHE = 'static-v1';
const API_CACHE = 'api-v1';

// Assets da cachare immediatamente
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
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
            cacheName !== API_CACHE
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

  // Strategy: network-first for JS/CSS on first load to prevent stale code serving; cache-first for images
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
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

  // Network First per API calls (solo stessa origin, evita cross-origin per CORS)
  if ((url.origin === self.location.origin && url.pathname.startsWith('/api/')) || url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(API_CACHE)
              .then(cache => cache.put(request, responseClone));
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

  // Stale While Revalidate per pagine
  event.respondWith(
    caches.match(request)
      .then(response => {
        const fetchPromise = fetch(request)
          .then(fetchResponse => {
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, fetchResponse.clone()));
            return fetchResponse;
          });
        
        return response || fetchPromise;
      })
  );
});