/* Service worker de L'Studio Ana: recepción de notificaciones push. */
const CACHE_VERSION = 'lstudio-logo-v6';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  const names = await caches.keys();
  await Promise.all(names.filter((name) => name !== CACHE_VERSION).map((name) => caches.delete(name)));
  await self.clients.claim();
})()));

// Navegaciones y assets siempre en red primero, para que el enlace publicado
// no sirva una versión antigua en la caché del navegador.
self.addEventListener('fetch', (event) => {
  const navigates = event.request.mode === 'navigate';
  if (!navigates && !/\.(?:js|css|webp|png|jpeg|jpg|svg|json)$/.test(new URL(event.request.url).pathname)) return;
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
    icon: payload.icon || '/lstudio-logo-v3-192.png',
    badge: '/lstudio-logo-v3-192.png',
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
