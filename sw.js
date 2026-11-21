// Service worker: shell dell'app in cache (aggiornata in background), dati con rete prima e cache come riserva offline.
const CACHE = 'magodel8-v7';
const SHELL = ['./', 'index.html', 'app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';   // font del titolo, tenuti in cache per l'offline
  if (req.method !== 'GET' || (url.origin !== location.origin && !isFont)) return;
  const isData = url.pathname.includes('/data/');
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req);
    const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
    if (isData) return (await net) || hit || Response.error();   // dati: rete prima
    return hit || (await net) || Response.error();               // shell: cache subito, aggiorna in background
  }));
});
