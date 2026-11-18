/* eslint-env worker */
/* global globalThis */
const CACHE_NAME = 'listzy-shell-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo192.png',
];

// Install event - cache the app shell
globalThis.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cache files individually to avoid failure if one is missing
        return Promise.allSettled(
          urlsToCache.map(url =>
            cache.add(url).catch(err => console.log('Failed to cache:', url, err))
          )
        );
      })
  );
  globalThis.skipWaiting();
});

// Activate event - clean up old caches
globalThis.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  return globalThis.clients.claim();
});

// Only successful responses go in the cache. Caching a 5xx would poison
// later loads — this is what used to let a cloudflared Bad Gateway page
// get stored and re-served forever.
const cacheable = (response) => response && response.ok;

const put = (request, response) => {
  const clone = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
};

// Fetch event — the key contract of this worker:
//   /api        → NEVER intercepted (data calls must fail/succeed naturally)
//   navigations → network first, but a FAILED or 5xx response falls back to
//                 the cached shell. During a deploy the origin is briefly
//                 gone and the tunnel returns a 502 PAGE — swallowing that
//                 and serving the cached app is what keeps the user inside
//                 Listzy with zero downtime.
//   js/css/html → network first (fresh after updates), cache fallback
//   other       → cache first, network fallback
globalThis.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // NEVER intercept or cache API requests — always go to network.
  // Caching /api responses caused stale data (e.g. empty lists) to be
  // served indefinitely, which triggered runaway auto-create loops.
  if (url.pathname.startsWith('/api')) {
    return;
  }

  if (event.request.method !== 'GET' || url.origin !== globalThis.location.origin) {
    return;
  }

  // Full-page navigations (F5, deep links like /recipes, PWA launch)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Origin reachable and healthy → refresh the shell cache
          if (cacheable(response)) {
            put('/index.html', response);
            return response;
          }
          // Origin answered but it's an error page (e.g. tunnel 502 while
          // the frontend container rebuilds) → serve the cached app instead
          return caches.match('/index.html').then((cached) => cached || response);
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Network-first strategy for HTML, JS, CSS (always get fresh content)
  if (url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (cacheable(response)) {
            put(event.request, response);
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first strategy for images, fonts, etc.
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request).then((response) => {
            if (!cacheable(response)) {
              return response;
            }
            put(event.request, response);
            return response;
          }).catch(() =>
            // Nothing cached and network is down — resolve instead of
            // leaving the FetchEvent promise rejected (console noise).
            new Response('', { status: 504, statusText: 'Offline' })
          );
        })
    );
  }
});

// Push notification event
globalThis.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  event.waitUntil(
    globalThis.registration.showNotification(data.title, options)
  );
});

// Notification click event
globalThis.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    globalThis.clients.openWindow('/')
  );
});
