const VERSION_CACHE = 'elauncher-versions-v1';
const SHELL_CACHE = 'elauncher-shell-v3'; // Bumped version to force update

const PRECACHE_ASSETS = [
    './', // Cache the root path
    './index.html',
    './assets/favicon.ico',
    './assets/eaglercraft.png',
    './assets/webassembly.svg',
    './assets/js.svg'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(SHELL_CACHE).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch(err => {
                console.warn('Non-critical precache failed:', err);
            });
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
    // Clean up old shell caches
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== SHELL_CACHE && cacheName !== VERSION_CACHE) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    
    const requestUrl = new URL(event.request.url);

    // 1. GAME VERSIONS (Download Manager)
    if (requestUrl.pathname.includes('/versions/')) {
        event.respondWith(
            caches.open(VERSION_CACHE).then(async (cache) => {
                const cachedResponse = await cache.match(event.request);
                return cachedResponse || fetch(event.request).catch(() => {
                    return new Response('Version not installed and you are offline.', { status: 503 });
                });
            })
        );
        return;
    }

    // 2. PAGE NAVIGATION (The App Shell / index.html)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(async () => {
                const cache = await caches.open(SHELL_CACHE);
                
                // IMPORTANT: Normalize navigation requests. 
                // Whether the user asks for '/' or '/index.html', check for both in the cache.
                const cachedHtml = await cache.match(requestUrl.href) || 
                                   await cache.match('/') || 
                                   await cache.match('/index.html');
                                   
                return cachedHtml || new Response('App shell not cached.', { status: 503 });
            })
        );
        return;
    }

    // 3. STATIC ASSETS (CSS, Images, Icons)
    // Strategy: Stale-While-Revalidate
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                    caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, networkResponse.clone()));
                }
                return networkResponse;
            }).catch(() => {
                // Fail silently if offline
            });

            return cachedResponse || fetchPromise;
        })
    );
});