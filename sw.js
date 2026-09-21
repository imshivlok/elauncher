const VERSION_CACHE = 'elauncher-versions-v1';
const SHELL_CACHE = 'elauncher-shell-v6'; 

const PRECACHE_ASSETS = [
    '/',
    '/static/tailwind.css',
    '/assets/favicon.ico',
    '/assets/eaglercraft.png',
    '/assets/webassembly.svg',
    '/assets/js.svg'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(SHELL_CACHE).then(async (cache) => {
            for (let url of PRECACHE_ASSETS) {
                try {
                    const response = await fetch(url, { redirect: 'follow' });
                    if (response.ok) {
                        await cache.put(url, response.clone());
                    }
                } catch (err) {
                    console.warn(`Failed to precache ${url}:`, err);
                }
            }
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
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

    // 1. GAME VERSIONS
    if (requestUrl.pathname.includes('/versions/')) {
        event.respondWith(
            caches.open(VERSION_CACHE).then(async (cache) => {
                const cachedResponse = await cache.match(event.request, { ignoreSearch: true });
                return cachedResponse || fetch(event.request).catch(() => {
                    return new Response('Version not installed and you are offline.', { status: 503 });
                });
            })
        );
        return;
    }

    // 2. PAGE NAVIGATION
    if (event.request.mode === 'navigate' || requestUrl.pathname === '/') {
        event.respondWith(
            fetch(event.request).catch(async () => {
                const cache = await caches.open(SHELL_CACHE);
                // ignoreSearch is critical here for PWA installation checks
                const cachedHtml = await cache.match('/', { ignoreSearch: true }) || 
                                   await cache.match('/index.html', { ignoreSearch: true });
                return cachedHtml || new Response('App shell not cached.', { status: 503 });
            })
        );
        return;
    }

    // 3. STATIC ASSETS
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                    caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, networkResponse.clone()));
                }
                return networkResponse;
            }).catch(() => {});

            return cachedResponse || fetchPromise;
        })
    );
});