const CACHE_NAME = 'luxsintax-core-v1';

// Arquivos mínimos para o PWA ser considerado offline-capable
const CORE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    // Força o SW a instalar imediatamente e fazer cache do básico
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Limpa caches antigos, se houver
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) return caches.delete(cache);
                })
            );
        })
    );
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Estratégia "Network First, falling back to cache"
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});