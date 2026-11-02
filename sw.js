// Offline play: cache the app shell on install. Fetches go to the network first (so a deploy is always seen as one
// consistent set of files) and fall back to the cache only when offline; every good response refreshes the cache.
const CACHE = 'terraform-v4';
const SHELL = ['./', './index.html', './style.css', './data.js', './game.js', './manifest.webmanifest', './privacy.html', './fonts/VT323-Regular.woff2', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); e.waitUntil(caches.open(CACHE).then(c => c.put(e.request, copy))); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || Response.error()))); // ?reset is the same page
});
