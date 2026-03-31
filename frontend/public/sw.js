// Service Worker — Auteide Turnos
// Estrategia: Cache-First para assets estáticos, Network-First para API

const CACHE_NAME = 'auteide-turnos-v3';

// Assets a pre-cachear en el evento install (shell de la app)
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Pre-cacheando assets del shell...');
            return cache.addAll(PRECACHE_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => {
                        console.log('[SW] Eliminando caché obsoleta:', key);
                        return caches.delete(key);
                    })
            )
        ).then(() => self.clients.claim())
    );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // No interceptar peticiones a la API backend
    if (url.pathname.startsWith('/api/') || url.port === '3001' || url.port === '4000') {
        return;
    }

    // No interceptar peticiones de navegación POST ni otras
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) {
                // Cache-First: servir desde caché y actualizar en segundo plano (stale-while-revalidate)
                fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                }).catch(() => { /* red no disponible, no pasa nada */ });

                return cached;
            }

            // Sin caché: ir a la red y guardar respuesta
            return fetch(event.request).then((response) => {
                if (!response || response.status !== 200 || response.type === 'opaque') {
                    return response;
                }
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                return response;
            }).catch(() => {
                // Offline fallback: retornar la página principal cacheada
                if (event.request.destination === 'document') {
                    return caches.match('/');
                }
            });
        })
    );
});
