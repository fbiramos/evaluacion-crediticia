const CACHE_NAME = 'crediteval-v24';
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
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
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