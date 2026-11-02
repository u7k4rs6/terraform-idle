// Offline play: cache the app shell on install, serve it cache-first and refresh the cache in the background.
// After a deploy the next load gets the new files (the one that fetched them still shows the old ones).
const CACHE = 'terraform-v1';
const SHELL = ['./', './index.html', './style.css', './data.js', './game.js', './manifest.webmanifest', './fonts/VT323-Regular.woff2', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true }); // ?reset is the same page
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
