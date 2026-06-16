const CACHE_NAME = 'cashbook-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request)
          .then(response => {
            if (response && response.status === 200 && response.type === 'basic') {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
          });
      })
      .catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});

// ============================================
// NOTIFICATION HANDLERS
// ============================================

// Handle notification click – open app and navigate to specific reminder
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Extract reminder ID from notification tag (tag format: 'reminder-{id}')
  const reminderId = event.notification.tag.replace('reminder-', '');
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If there's already a window/tab open
        for (const client of clientList) {
          if (client.url && 'focus' in client) {
            client.focus();
            client.postMessage({
              type: 'OPEN_REMINDER',
              payload: { reminderId }
            });
            return client;
          }
        }
        // Otherwise open a new window/tab with reminder ID in URL
        return clients.openWindow(`/?reminder=${reminderId}`);
      })
  );
});

// Handle messages from the main app to show notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = event.data.payload;
    self.registration.showNotification(title, {
      body: body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: tag || 'reminder',
      requireInteraction: true,
    });
  }
});
