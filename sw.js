const CACHE_NAME = 'elauncher-v2';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Intercept requests for versions and serve directly from Cache Storage
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const requestUrl = new URL(event.request.url);

    // Only intercept requests for game version files
    if (requestUrl.pathname.includes('/versions/')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                const cachedResponse = await cache.match(event.request);
                if (cachedResponse) {
                    return cachedResponse;
                }

                // If not cached, fetch from network and store in cache automatically
                try {
                    const networkResponse = await fetch(event.request);
                    if (networkResponse && networkResponse.ok) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                } catch (error) {
                    return new Response('Version not downloaded and you are offline.', {
                        status: 503,
                        headers: { 'Content-Type': 'text/plain' }
                    });
                }
            })
        );
    }
});