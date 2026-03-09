const VERSION = '1.0.8';
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

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isWP = url.hostname === 'vanoudedingen.nl';

  if (url.pathname.endsWith('sw.js')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // IMAGES - Use standard fetch, handle as opaque
  if (isWP && url.pathname.includes('/wp-content/')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const networkFetch = fetch(e.request).then(res => {
          if (!res.ok && res.type !== 'opaque') return res;
          const clone = res.clone();
          caches.open(IMAGE_CACHE).then(cache => cache.put(e.request, clone));
          return res;
        }).catch(() => cached); // Fallback to cache on network failure
        
        return cached || networkFetch;
      })
    );
    return;
  }

  // API calls
  if (isWP && url.pathname.includes('/wp-json/')) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(API_CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
