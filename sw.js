const CACHE_NAME = 'crediteval-v27';
const ASSETS = [
    './',
    './index.html',
    './app.js',
    './style.css',
    './manifest.json'
];

// Instalación y cacheo
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
    );
});

// Limpieza de caches antiguos y toma de control inmediato
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null)
        )).then(() => self.clients.claim())
    );
});

// Estrategia: Network First (Busca en internet, si falla usa el cache)
self.addEventListener('fetch', e => {
    e.respondWith(
        fetch(e.request).catch(() => {
            return caches.match(e.request);
        })
    );
});
