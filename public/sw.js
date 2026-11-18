/* Identity Prism OS service worker.
 * - /_next/static (content-hashed, immutable): cache-first.
 * - Icons, images, fonts: stale-while-revalidate (serve cached, refresh in background).
 * - Page navigations: network-first; only the /offline fallback is ever stored.
 *   Authenticated HTML is NEVER cached.
 * - /api/* (incl. /api/auth): never touched, always straight to the network.
 */
const VERSION = 'v2';
const STATIC_CACHE = `prism-static-${VERSION}`;
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((c) => c.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('prism-') && k !== STATIC_CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

const isStaticAsset = (url) =>
  url.pathname.startsWith('/_next/static/') ||
  url.pathname.startsWith('/icons/') ||
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/i.test(url.pathname);

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never intercept API or auth traffic.
  if (url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()));
    return;
  }

  if (!isStaticAsset(url)) return;

  const store = (res, copy) => {
    if (res.ok && res.type === 'basic') caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
  };

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            store(res, res.clone());
            return res;
          })
      )
    );
    return;
  }

  // Stale-while-revalidate for other static files (same-origin, non-API only).
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          store(res, res.clone());
          return res;
        })
        .catch(() => hit || Response.error());
      return hit || network;
    })
  );
});
