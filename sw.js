/* Monitor Didi: guarda a "casca" do app para abrir rápido e mostrar o aviso de sem internet.
   Nunca guarda nem intercepta nada do Google: o painel e os dados vêm sempre ao vivo. */
const CACHE = 'monitor-didi-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png',
               './icons/maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('monitor-didi-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;     // Google, fontes etc.: direto da rede
  // Rede primeiro (pega as atualizações do app); sem internet, usa a cópia guardada
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true })
      .then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
