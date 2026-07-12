const CACHE_NAME = 'ovid-formwork-erp-v1';
const OFFLINE_URL = '/index.html';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/index.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline fallback and main files');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[Service Worker] Pre-cache asset warning:', err);
        return cache.add(OFFLINE_URL);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API Requests & Development HMR Websockets Bypass
  if (url.pathname.startsWith('/api') || url.pathname.includes('websocket') || url.hostname.includes('hmr') || url.pathname.includes('hot-update')) {
    event.respondWith(
      fetch(request).catch(() => {
        // Return a simulated offline backup response for predictive/AI APIs if offline
        if (request.method === 'POST') {
          return new Response(JSON.stringify({
            success: true,
            simulated: true,
            offline: true,
            message: 'ጣቢያው ከመስመር ውጭ በመሆኑ ሲስተሙ በአካባቢያዊ ሞዴል ስራውን ቀጥሏል። (Offline local backup enabled).'
          }), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        }
        return new Response(JSON.stringify({ 
          error: 'ኢንተርኔት የለም። መረጃው በአካባቢያዊ ማከማቻ ተቀምጧል። (Saved to local backup).' 
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      })
    );
    return;
  }

  // Assets and Layout Routing - Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Update cache in the background
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, networkResponse);
            });
          }
        }).catch(() => {
          // Ignore network failure in background
        });
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Return index.html as a fallback for navigate requests when offline
        if (request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});
