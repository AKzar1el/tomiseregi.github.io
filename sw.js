const CACHE_NAME = 'tomiseregi-site-cache-v1';

// Add a list of essential files to cache
const INITIAL_CACHE_URLS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/ts-initial.webp',
  '/hero-image.webp',
  '/tomi.webp',
  '/background.mp4',
  '/icons/contact-image.webp',
  '/icons/icon-192x192.webp'
];

// Install event handler
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Instead of cache.addAll, we'll use a more resilient approach
        return Promise.allSettled(
          INITIAL_CACHE_URLS.map(url =>
            cache.add(url).catch(error => {
              console.log(`Failed to cache ${url}: ${error}`);
              // Continue even if individual items fail to cache
              return Promise.resolve();
            })
          )
        );
      })
  );
  // Activate the worker immediately
  self.skipWaiting();
});

// Activate event handler
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Immediately claim clients
  event.waitUntil(clients.claim());
});

// Fetch event handler with network-first strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching it
        const responseToCache = response.clone();

        // Only cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            })
            .catch((error) => {
              console.log('Cache put failed:', error);
            });
        }

        return response;
      })
      .catch(() => {
        // If network request fails, try to get it from cache
        return caches.match(event.request)
          .then((response) => {
            return response || new Response('Network error happened', {
              status: 408,
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});