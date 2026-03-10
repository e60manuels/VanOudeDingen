const VERSION = '1.3.2';
const CACHE_SHELL  = `vod-shell-v${VERSION}`;
const CACHE_IMAGES = `vod-images-v${VERSION}`;
const CACHE_API    = `vod-api-v${VERSION}`;

const SHELL_FILES = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ─── INSTALL: cache app shell ───────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_SHELL).then(c => c.addAll(SHELL_FILES))
  );
  self.skipWaiting(); // Force the waiting service worker to become active
  self.clients.claim(); // Take control of clients immediately
});

// ─── ACTIVATE: remove old caches ───────────────────────────────────
self.addEventListener('activate', e => {
  const valid = [CACHE_SHELL, CACHE_IMAGES, CACHE_API];
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => !valid.includes(k)).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── FETCH ──────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never intercept sw.js itself
  if (url.pathname.endsWith('/sw.js')) return;

  // Never intercept non-GET requests
  if (e.request.method !== 'GET') return;

  const isWP = url.hostname === 'vanoudedingen.nl';

  // ── WordPress images: network-first, 24h cache ──────────────────
  if (isWP && url.pathname.startsWith('/wp-content/')) {
    e.respondWith(handleImage(e.request));
    return;
  }

  // ── WordPress REST API: network-first, 1h cache ──────────────────
  if (isWP && url.pathname.startsWith('/wp-json/')) {
    e.respondWith(handleApi(e.request));
    return;
  }

  // ── App shell: cache-first ───────────────────────────────────────
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// ─── IMAGE HANDLER ──────────────────────────────────────────────────
async function handleImage(request) {
  // Use no-cors so WordPress images load as opaque responses.
  // Opaque = browser renders the image but JS cannot inspect it —
  // correct for a PWA tile grid where we only need display, not data.
  const imageRequest = new Request(request.url, {
    mode: 'no-cors',
    credentials: 'omit'
  });

  try {
    const networkRes = await fetch(imageRequest);
    if (networkRes.ok || networkRes.type === 'opaque') {
      const cache = await caches.open(CACHE_IMAGES);
      await trimCache(cache, 300);
      cache.put(request.url, networkRes.clone());
      return networkRes;
    }
  } catch (_) {}

  const cached = await caches.match(request.url);
  if (cached) return cached;

  // Last resort: transparent 1×1 PNG so tiles don't show broken icon
  return new Response(
    atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
    { headers: { 'Content-Type': 'image/png' } }
  );
}

// ─── API HANDLER ────────────────────────────────────────────────────
async function handleApi(request) {
  try {
    const networkRes = await fetch(request);
    if (networkRes.ok) {
      const cache = await caches.open(CACHE_API);
      await trimCache(cache, 50); // max 50 API responses
      cache.put(request, networkRes.clone());
    }
    return networkRes;
  } catch (_) {
    // Offline fallback
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ─── LRU TRIM ───────────────────────────────────────────────────────
async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await cache.delete(keys[0]);
  }
}
