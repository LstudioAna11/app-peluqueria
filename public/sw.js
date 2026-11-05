/* Static application shell only. Never cache API, auth, photos or private responses. */
const CACHE_VERSION = 'lstudio-shell-offline-v1';
const staticAsset = url => url.origin === self.location.origin && /^\/assets\/[^/]+\.(?:js|css)$/.test(url.pathname) && !url.search;
self.addEventListener('install', event => event.waitUntil((async()=>{
  try { const response=await fetch('/',{cache:'reload',credentials:'omit'}); if(response.ok && (response.headers.get('content-type')||'').includes('text/html'))await (await caches.open(CACHE_VERSION)).put('/',response); }catch{}
  // Activation waits until the next page load, preserving the running build.
})()));
self.addEventListener('activate', event => event.waitUntil((async()=>{
  for(const name of await caches.keys())if(name.startsWith('lstudio-')&&name!==CACHE_VERSION)await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate'&&url.pathname==='/'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_VERSION),control=new AbortController();const timeout=setTimeout(()=>control.abort(),4000);
      try{
        const response=await fetch(request,{signal:control.signal,cache:'no-cache'});
        if(!response.ok)throw new Error('Navigation unavailable');
        if((response.headers.get('content-type')||'').includes('text/html'))await cache.put('/',response.clone()).catch(()=>{});
        return response;
      }catch(error){const saved=await cache.match('/');if(saved)return saved;throw error;}finally{clearTimeout(timeout);}
    })());
  }else if(staticAsset(url)){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_VERSION),saved=await cache.match(request);if(saved)return saved;
      const response=await fetch(request);
      const type=response.headers.get('content-type')||'';
      if(response.ok&&/javascript|text\/css/.test(type)){
        const keys=await cache.keys();if(keys.length<100)await cache.put(request,response.clone()).catch(()=>{});
      }
      return response;
    })());
  }
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
