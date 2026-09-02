// Minimal service worker — just enough to make the app installable
// ("Add to Home Screen") and cache the app shell for faster repeat loads.
// Not a full offline strategy: chat/orders/content still need a live connection.

const CACHE_NAME = 'bregu-shell-v1';
const SHELL_FILES = [
  'hotel-bregu-guest-app.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only cache-first for our own shell files; everything else (API calls,
  // socket.io, tiles, weather) always goes to the network.
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && SHELL_FILES.some((f) => url.pathname.endsWith(f))) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});
