const CACHE_NAME = 'vod-v1.0.0';
const SHELL = ['./index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

const API_CACHE = 'vod-api-cache';
const MEDIA_CACHE = 'vod-media-cache';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => ![CACHE_NAME, API_CACHE, MEDIA_CACHE].includes(k)).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isWP = url.hostname === 'vanoudedingen.nl';

  // CHANGE 4: Lightbox / single post details (network-only)
  // We detect this by specific query params or path if needed, 
  // but the requirement says "On tile click (attachment fetch): network-only"
  // We'll mark these with a custom header or check the URL pattern.
  if (isWP && (url.search.includes('parent=') || (url.pathname.includes('/posts/') && !url.search.includes('per_page=')))) {
    e.respondWith(fetch(e.request));
    return;
  }

  // CHANGE 4: API calls (network-first, cache 1h)
  if (isWP && url.pathname.includes('/wp-json/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(API_CACHE).then(cache => {
            // Add custom header for expiration tracking
            const headers = new Headers(clone.headers);
            headers.append('sw-cache-date', new Date().getTime());
            cache.put(e.request, new Response(clone.body, { ...clone, headers }));
          });
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(e.request);
          if (cached) {
            const date = cached.headers.get('sw-cache-date');
            const now = new Date().getTime();
            // 1 hour = 3600000ms
            if (date && (now - date < 3600000)) return cached;
          }
          return fetch(e.request); // Fallback to network if expired or not found
        })
    );
    return;
  }

  // CHANGE 4: Media/Images (cache-first, 7 days)
  if (isWP && url.pathname.includes('/wp-content/')) {
    e.respondWith(
      caches.match(e.request).then(async cached => {
        if (cached) {
          const date = cached.headers.get('sw-cache-date');
          const now = new Date().getTime();
          // 7 days = 604800000ms
          if (date && (now - date < 604800000)) return cached;
        }
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(MEDIA_CACHE).then(cache => {
            const headers = new Headers(clone.headers);
            headers.append('sw-cache-date', new Date().getTime());
            cache.put(e.request, new Response(clone.body, { ...clone, headers }));
          });
          return res;
        });
      })
    );
    return;
  }

  // CHANGE 4: App shell (cache-first)
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
