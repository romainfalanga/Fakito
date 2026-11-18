/* Fakito — service worker : l'appli s'ouvre hors ligne une fois chargée.
   Change VERSION à chaque mise à jour des fichiers de data/ pour que les téléphones les retéléchargent. */
const VERSION = 'fakito-v1';
const SHELL = ['./', 'index.html', 'css/app.css', 'js/engine.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const put = (res) => { if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); } return res; };
  if (url.pathname.includes('/data/')) {
    // les dictionnaires sont lourds et ne changent pas : le cache d'abord
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then(put)));
    return;
  }
  // le reste : le réseau d'abord pour avoir la dernière version, le cache si on est hors ligne
  e.respondWith(fetch(e.request).then(put).catch(() => caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html'))));
});
