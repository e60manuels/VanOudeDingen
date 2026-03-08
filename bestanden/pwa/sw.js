const VERSION = '1.0.3';
const CACHE_NAME = `vod-v${VERSION}`;
const IMAGE_CACHE = `vod-images-v${VERSION}`;
const API_CACHE = `vod-api-cache`;

const SHELL = ['./index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => ![CACHE_NAME, IMAGE_CACHE, API_CACHE].includes(k)).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

async function limitCacheSize(name, size) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length > size) {
    await cache.delete(keys[0]);
    limitCacheSize(name, size);
  }
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isWP = url.hostname === 'vanoudedingen.nl';

  if (url.pathname.endsWith('sw.js')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // FIX 2: Images (network-first, 24h cache)
  if (isWP && url.pathname.includes('/wp-content/')) {
    e.respondWith(
      fetch(new Request(e.request.url, { credentials: 'omit', mode: 'cors' }))
        .then(res => {
          if (!res.ok && res.type !== 'opaque') return res;
          const clone = res.clone();
          caches.open(IMAGE_CACHE).then(cache => {
            const headers = new Headers(clone.headers);
            headers.append('sw-cache-date', new Date().getTime());
            cache.put(e.request, new Response(clone.body, { 
              status: clone.status,
              statusText: clone.statusText,
              headers: headers 
            }));
            limitCacheSize(IMAGE_CACHE, 200);
          });
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(e.request);
          if (cached) {
            const date = cached.headers.get('sw-cache-date');
            const now = new Date().getTime();
            if (date && (now - date < 86400000)) return cached;
          }
          return new Response(
            Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b]),
            { headers: { 'Content-Type': 'image/gif' } }
          );
        })
    );
    return;
  }

  if (isWP && url.pathname.includes('/wp-json/')) {
    if (url.search.includes('parent=') || (url.pathname.includes('/posts/') && !url.search.includes('per_page='))) {
      e.respondWith(fetch(e.request));
      return;
    }
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(API_CACHE).then(cache => {
            const headers = new Headers(clone.headers);
            headers.append('sw-cache-date', new Date().getTime());
            cache.put(e.request, new Response(clone.body, { 
              status: clone.status,
              statusText: clone.statusText,
              headers: headers 
            }));
          });
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(e.request);
          if (cached) {
            const date = cached.headers.get('sw-cache-date');
            const now = new Date().getTime();
            if (date && (now - date < 3600000)) return cached;
          }
          return fetch(e.request);
        })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
