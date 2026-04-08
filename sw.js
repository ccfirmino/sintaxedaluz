// LuxSintax Service Worker - Proxy de Cache
const CACHE_NAME = 'luxsintax-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting(); // Força atualização imediata
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Intercepta requisições. Como somos focados em SaaS, 
// deixaremos a rede agir primariamente, servindo como PWA base.
self.addEventListener('fetch', (event) => {
    // Configuração básica inicial para validar o critério de instalabilidade do PWA
});