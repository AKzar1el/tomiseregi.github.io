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
  try {
    // Return early if request is undefined
    if (!request || !request.url) return false;

    // Only cache GET requests
    if (request.method !== 'GET') return false;

    const url = new URL(request.url);

    // Early exit for non-HTTP(S) schemes (chrome-extension://, data:, etc.)
    if (!['http:', 'https:'].includes(url.protocol)) return false;

    // Only cache requests from your domain or specific CDNs
    const allowedDomains = [
      'tomiseregi.si',
      'cdnjs.cloudflare.com',
      'www.googletagmanager.com',
      'www.google-analytics.com'
    ];

    return allowedDomains.some(domain => url.hostname.includes(domain));
  } catch (error) {
    console.log('Error in shouldCache:', error);
    return false;
  }
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
    }).then(() => {
      return clients.claim();
    })
  );
});

// Fetch event handler with network-first strategy
self.addEventListener('fetch', (event) => {
  // If this request should NOT be cached, respond with the network fetch immediately.
  if (!shouldCache(event.request)) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If fetch fails for some reason, at least fail gracefully
        return new Response('Network request failed and not in cache.', {
          status: 408,
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      })
    );
    return; // Stop here.
  }

  // Otherwise, use a network-first approach and attempt to cache the result.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache valid responses
        if (response.ok) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            })
            .catch(error => {
              console.log('Cache put failed:', error);
            });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          return new Response('Network error happened', {
            status: 408,
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      })
  );
});
