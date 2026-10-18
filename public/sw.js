/* Service worker de L'Studio Ana: recepción de notificaciones push. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Navegaciones siempre en red primero, para que la app instalada no quede
// anclada a una versión antigua en la caché del navegador.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith((async () => {
    try {
      return await fetch(new Request(event.request, { cache: 'reload' }));
    } catch {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      throw new Error('Sin conexión y sin copia guardada de la app');
    }
  })());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data ? event.data.text() : '' }; }
  const title = payload.title || "L'Studio Ana";
  const body = payload.body || 'Tienes una novedad en tu cita.';
  const url = payload.url || '/?notificacion=1';
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: payload.icon || '/favicon.svg',
    badge: '/favicon.svg',
    tag: payload.tag || undefined,
    data: { url },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/?notificacion=1';
  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      if ('focus' in client) {
        client.focus();
        if ('navigate' in client) { try { await client.navigate(target); } catch { /* el cliente ya está en el portal */ } }
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
