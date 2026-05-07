const CACHE_NAME = 'morrinhos-v3';
const STATIC_ASSETS = [
  '/',
  '/favicon.png',
  '/favicon.ico',
];

// Install: cache only critical static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, network-only for navigation, cache-first for hashed assets only
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  // Never cache navigation requests — let the SPA handle routing
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }

  // API calls: network-only (no caching to avoid stale data bloating storage)
  if (request.url.includes('supabase.co') || request.url.includes('/functions/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Hashed assets (JS/CSS bundles with content hash): cache-first, no revalidation needed
  const url = new URL(request.url);
  const isHashedAsset = /\.[a-f0-9]{8,}\.(js|css|woff2?)$/i.test(url.pathname);

  if (isHashedAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network-first, no background caching
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  let data = { title: 'Morrinhos.Ai', body: 'Nova atualização disponível', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      data: { url: data.url },
      vibrate: [200, 100, 200],
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
