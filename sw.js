// Service Worker for offline accessibility
const CACHE_NAME = 'creator-os-v1';
const urlsToCache = [
  '/content-designer/',
  '/content-designer/index.html',
  '/content-designer/90_day_blueprint.html',
  '/content-designer/manifest.webmanifest'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    }).catch(err => {
      console.log('Cache installation failed:', err);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.includes('/content-designer/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      // Return cached version if available
      if (response) {
        return response;
      }

      // Try to fetch from network
      return fetch(event.request).then(networkResponse => {
        // Cache successful network responses
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(err => {
        // Return offline page if both cache and network fail
        console.log('Fetch failed; returning offline page instead:', err);
        return new Response(
          '<html><body><h1>Offline</h1><p>You are currently offline. The blueprint is cached and should be available.</p></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      });
    })
  );
});

// Background sync for future updates
self.addEventListener('sync', event => {
  if (event.tag === 'sync-blueprint-updates') {
    event.waitUntil(
      fetch('/content-designer/90_day_blueprint.html').then(response => {
        if (response.ok) {
          return caches.open(CACHE_NAME).then(cache => {
            return cache.put('/content-designer/90_day_blueprint.html', response);
          });
        }
      }).catch(err => {
        console.log('Background sync failed:', err);
      })
    );
  }
});
