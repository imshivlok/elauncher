const VERSION_CACHE = 'elauncher-versions-v1';
const SHELL_CACHE = 'elauncher-shell-v1';

// Files to cache immediately when the Service Worker installs
const PRECACHE_ASSETS = [
    './',
    './index.html'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Only intercept GET requests
    if (event.request.method !== 'GET') return;

    const requestUrl = new URL(event.request.url);

    // ---------------------------------------------------------
    // 1. GAME VERSIONS (Managed strictly by your Download button)
    // ---------------------------------------------------------
    if (requestUrl.pathname.includes('/versions/')) {
        event.respondWith(
            caches.open(VERSION_CACHE).then(async (cache) => {
                const cachedResponse = await cache.match(event.request);
                if (cachedResponse) {
                    return cachedResponse; // Serve from Download Manager
                }
                try {
                    return await fetch(event.request); // Serve from Network
                } catch (error) {
                    return new Response('Version not installed and you are offline.', {
                        status: 503,
                        headers: { 'Content-Type': 'text/plain' }
                    });
                }
            })
        );
        return; // Stop here for version files
    }

    // ---------------------------------------------------------
    // 2. APP SHELL (Launcher UI, Tailwind, Icons, Backgrounds)
    // ---------------------------------------------------------
    // Strategy: Stale-While-Revalidate
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            
            // Always try to fetch the latest version in the background
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // Only cache valid responses or opaque (cross-origin CDN) responses
                if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                    caches.open(SHELL_CACHE).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Fail silently if offline, rely on cachedResponse
            });

            // Return the cached file immediately if it exists, otherwise wait for the network
            return cachedResponse || fetchPromise;
        })
    );
});