/* Monitor Didi: guarda a "casca" do app para abrir rápido e mostrar o aviso de sem internet.
   Nunca guarda nem intercepta nada do Google: o painel e os dados vêm sempre ao vivo. */
const CACHE = 'monitor-didi-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
               './maskable-512.png', './apple-touch-icon.png', './favicon-32.png'];

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
  // Rede primeiro (pega as atualizações do app). Internet lenta (mais de 2,5 s) ou sem internet: abre com a cópia
  // guardada, e a versão da rede, quando chegar, fica guardada para a próxima abertura.
  const cached = () => caches.match(req, { ignoreSearch: true })
    .then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
  const net = fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  });
  e.respondWith(new Promise((resolve) => {
    let done = false;
    const finish = (r) => { if (!done && r) { done = true; resolve(r); } };
    const timer = setTimeout(() => cached().then(finish), 2500);
    net.then((r) => { clearTimeout(timer); finish(r); })
       .catch(() => { clearTimeout(timer); cached().then((r) => { finish(r || Response.error()); }); });
  }));
  e.waitUntil(net.catch(() => {}));
});
