/* eslint-env worker */
/* global globalThis */
const CACHE_NAME = 'listzy-shell-v7';
const urlsToCache = [
  '/',
  '/index.html',
  '/updating.html',
  '/down.html',
  '/offline.html',
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
const cacheable = (response) => response?.ok;

const put = (request, response) => {
  const clone = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
};

// Fetch event — the key contract of this worker:
//   /api        → NEVER intercepted (data calls must fail/succeed naturally)
//   navigations → network first. The "Listzy is updating" placeholder is
//                 served whenever the app can't be — the maintenance
//                 container marks it with X-Listzy-Maintenance so we never
//                 store it as the shell, and a failed/5xx nav falls back to
//                 the cached copy instead of a half-broken home page.
//   js/css/html → network first (fresh after updates), cache fallback
//   other       → cache first, network fallback
const MAINTENANCE_HEADER = 'x-listzy-maintenance';

// Status-page routing for navigations:
//   maintenance header      → updating.html  (deploy in progress, shows notes)
//   HTTP error (>= 400)     → down.html?code=X (server answered but broke)
//   fetch throws (no reply) → offline.html   (user offline or Cloudflare/tunnel
//                                            down — the admin can't fix that side)
const updatingFallback = () =>
  caches.match('/updating.html').then((page) => page || caches.match('/index.html'));

const offlineFallback = () =>
  caches.match('/offline.html').then((page) => page || updatingFallback());

const errorRedirect = (status) =>
  Response.redirect(`/down.html?code=${status}`, 302);

// Deploy window — a maintenance-marked response arms this for 12 minutes.
// While it's live, error/unreachable navigations are almost certainly the
// port handoff gap (maintenance down -> app still booting), so we keep
// showing updating.html instead of falsely landing on down.html.
let deployUntil = 0;

// Status pages must NEVER redirect: /down.html?code=502 is itself a
// navigation, and redirecting an error response for it loops forever —
// that was the ERR_TOO_MANY_REDIRECTS bug. They always answer with the
// network response or their own cached copy.
const STATUS_PAGES = ['/updating.html', '/down.html', '/offline.html'];

globalThis.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // NEVER intercept or cache API requests — always go to network.
  // Caching /api responses caused stale data (e.g. empty lists) to be
  // served indefinitely, which triggered runaway auto-create loops.
  // .txt is also live data: /changes.txt is rewritten every deploy and a
  // cached copy was showing the PREVIOUS release's "In this update" list.
  if (url.pathname.startsWith('/api') || url.pathname.endsWith('.txt')) {
    return;
  }

  if (event.request.method !== 'GET' || url.origin !== globalThis.location.origin) {
    return;
  }

  // Full-page navigations (F5, deep links like /recipes, PWA launch)
  if (event.request.mode === 'navigate') {
    // Status pages: no redirects, no error routing — just serve them.
    // A maintenance-marked response is returned but never stored under
    // this page's key (it would poison down.html with updating.html).
    if (STATUS_PAGES.includes(url.pathname)) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response.ok) {
              if (!response.headers.get(MAINTENANCE_HEADER)) {
                caches.open(CACHE_NAME)
                  .then((cache) => cache.put(url.pathname, response.clone()));
              }
              return response;
            }
            return caches.match(url.pathname, { ignoreSearch: true });
          })
          .catch(() => caches.match(url.pathname, { ignoreSearch: true }))
      );
      return;
    }
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Maintenance placeholder answering → show it and keep our cached
          // copy fresh, but never store it as the app shell.
          if (response.headers.get(MAINTENANCE_HEADER)) {
            deployUntil = Date.now() + 12 * 60 * 1000;
            if (response.ok) put('/updating.html', response);
            return response;
          }
          // Origin reachable and healthy → refresh the shell cache
          if (cacheable(response)) {
            deployUntil = 0;
            put('/index.html', response);
            return response;
          }
          // Still inside the deploy window → the app is mid handoff; keep
          // the updating page, not the error page.
          if (Date.now() < deployUntil) return updatingFallback();
          // Server answered with an error (500/502/404/…) → the "something
          // went wrong" page with the code, never a half-broken shell.
          return errorRedirect(response.status);
        })
        // No answer at all → during a deploy that's the swap gap (updating);
        // otherwise the "can't reach Listzy" page (user offline or tunnel down).
        .catch(() => (Date.now() < deployUntil ? updatingFallback() : offlineFallback()))
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
        // ignoreSearch: /down.html?code=502 must still match the precached
        // /down.html when the network fetch fails
        .catch(() => caches.match(event.request, { ignoreSearch: true }))
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
