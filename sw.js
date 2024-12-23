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

// Function to check if a request should be cached
function shouldCache(request) {
  // Only cache GET requests
  if (request.method !== 'GET') return false;

  const url = new URL(request.url);

  // Only cache supported schemes (http or https)
  if (!['http:', 'https:'].includes(url.protocol)) return false;

  // Only cache requests from your domain or specific CDNs
  const allowedDomains = [
    'tomiseregi.si',
    'cdnjs.cloudflare.com',
    'www.googletagmanager.com',
    'www.google-analytics.com'
  ];

  if (!allowedDomains.some(domain => url.hostname.includes(domain))) return false;

  return true;
}

// Install event handler
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          INITIAL_CACHE_URLS.map(url =>
            cache.add(url).catch(error => {
              console.log(`Failed to cache ${url}: ${error}`);
              return Promise.resolve();
            })
          )
        );
      })
  );
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
  event.waitUntil(clients.claim());
});

// Fetch event handler with network-first strategy
self.addEventListener('fetch', (event) => {
  // Only handle supported requests
  if (!shouldCache(event.request)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching it
        const responseToCache = response.clone();

        // Only cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME)
            .then((cache) => {
              // Double-check shouldCache before putting
              if (shouldCache(event.request)) {
                cache.put(event.request, responseToCache)
                  .catch(error => console.log('Cache put failed:', error));
              }
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