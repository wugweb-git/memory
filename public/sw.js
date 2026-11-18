/* Identity Prism OS service worker.
 * - /_next/static (content-hashed, immutable): cache-first.
 * - Icons, images, fonts: stale-while-revalidate (serve cached, refresh in background).
 * - Page navigations: network-first; only the /offline fallback is ever stored.
 *   Authenticated HTML is NEVER cached.
 * - /api/* (incl. /api/auth): never intercepted by fetch handling, always straight to the network.
 * - Background Sync tag prism-capture-sync replays offline captures (bottom of file).
 */
const VERSION = 'v3';
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

/* ---- Offline capture replay (Background Sync) ----
 * Replays captures queued in IndexedDB (db prism-captures, store queue; see
 * src/lib/pwa/capture-store.ts and capture-queue.ts for the shared record shape).
 * Same-origin POST with credentials so the session cookie is sent.
 */
const CAPTURE_DB = 'prism-captures';
const CAPTURE_STORE = 'queue';
const CAPTURE_SYNC_TAG = 'prism-capture-sync';
const MAX_ATTEMPTS = 8;
const PERMANENT = [404, 405, 410, 413, 415, 422]; // keep in sync with capture-queue.ts

const openDb = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(CAPTURE_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(CAPTURE_STORE)) req.result.createObjectStore(CAPTURE_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const idb = (db, mode, fn) =>
  new Promise((resolve, reject) => {
    const tx = db.transaction(CAPTURE_STORE, mode);
    const req = fn(tx.objectStore(CAPTURE_STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = tx.onabort = () => reject(tx.error);
  });

async function replayCaptures() {
  const db = await openDb();
  try {
    const items = (await idb(db, 'readonly', (s) => s.getAll())).sort((a, b) => a.createdAt - b.createdAt);
    let sent = 0;
    for (const item of items) {
      let status;
      try {
        const res = await fetch(item.url, {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(item.body),
        });
        status = res.status;
      } catch {
        throw new Error('offline'); // rejecting makes the browser retry the sync later
      }
      if (status >= 200 && status < 300) {
        await idb(db, 'readwrite', (s) => s.delete(item.id));
        sent++;
      } else if (status === 401 || status === 403) {
        break; // needs sign-in: keep items, the page flushes after login
      } else if (PERMANENT.indexOf(status) !== -1) {
        await idb(db, 'readwrite', (s) => s.delete(item.id)); // can never succeed
      } else if (item.attempts + 1 >= MAX_ATTEMPTS) {
        await idb(db, 'readwrite', (s) => s.delete(item.id));
      } else {
        await idb(db, 'readwrite', (s) => s.put({ ...item, attempts: item.attempts + 1 }));
      }
    }
    if (sent > 0) {
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      clients.forEach((c) => c.postMessage({ type: 'prism-capture-synced', sent }));
    }
  } finally {
    db.close();
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === CAPTURE_SYNC_TAG) event.waitUntil(replayCaptures());
});
