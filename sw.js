const CACHE_NAME = 'elauncher-versions-v3';

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
                // 1. Try to serve from Download Manager cache
                const cachedResponse = await cache.match(event.request);
                if (cachedResponse) {
                    return cachedResponse; 
                }

                // 2. If not cached, fetch normally from network
                // (We DO NOT use cache.put() here anymore. Saving is strictly handled by index.html)
                try {
                    return await fetch(event.request);
                } catch (error) {
                    return new Response('Version not installed and you are offline.', {
                        status: 503,
                        headers: { 'Content-Type': 'text/plain' }
                    });
                }
            })
        );
    }
});