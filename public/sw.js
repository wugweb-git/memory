/* Identity Prism OS service worker.
 * - /_next/static (content-hashed, immutable): cache-first.
 * - Icons, images, fonts: stale-while-revalidate (serve cached, refresh in background).
 * - Page navigations: network-first (with navigation preload); only the /offline fallback is ever stored.
 *   Authenticated HTML is NEVER cached.
 * - /api/* (incl. /api/auth): never intercepted by fetch handling, always straight to the network.
 * - Update flow: a new worker waits; the page shows a prompt and posts {type:'SKIP_WAITING'}.
 * - Background Sync tag prism-capture-sync replays offline captures (bottom of file).
 */
const VERSION = 'v5';
/* v5: Web Share Target handler (bottom of file). Offline capture queue and push handlers unchanged. */
const STATIC_CACHE = `prism-static-${VERSION}`;
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((c) => c.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .catch(() => {})
  );
  // No automatic skipWaiting: the page prompts the user, then posts SKIP_WAITING.
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('prism-') && k !== STATIC_CACHE).map((k) => caches.delete(k)))
      )
      .then(() => (self.registration.navigationPreload ? self.registration.navigationPreload.enable() : undefined))
      .then(() => self.clients.claim())
  );
});

const isStaticAsset = (url) =>
  url.pathname.startsWith('/_next/static/') ||
  url.pathname.startsWith('/icons/') ||
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/i.test(url.pathname);

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // Web Share Target: POST /share-target from another Android app (works offline, keeps files).
  if (req.method === 'POST' && url.origin === self.location.origin && url.pathname === SHARE_PATH) {
    event.respondWith(handleShare(req));
    return;
  }
  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  // Never intercept API or auth traffic.
  if (url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const preload = await event.preloadResponse;
          return preload || (await fetch(req));
        } catch {
          return (await caches.match(OFFLINE_URL)) || Response.error();
        }
      })()
    );
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

/* ---- Web Share Target ----
 * Other apps POST multipart form data (title, text, url, files) to /share-target. The shared content is
 * parked in the Cache API under a one-shot id (cache name deliberately not "prism-*" so activate cleanup
 * leaves it alone) and the user is redirected to the review page, which reads it and queues a capture
 * through the normal offline-capable intake. Nothing is sent to the server by the worker itself.
 * Keep SHARE_INBOX and the /__share/<id>/... keys in sync with src/lib/native/share-data.ts and
 * src/app/share-target/review/page.tsx.
 */
const SHARE_PATH = '/share-target';
const SHARE_REVIEW = '/share-target/review';
const SHARE_INBOX = 'share-inbox-v1';
const SHARE_MAX_FILES = 5;
const SHARE_MAX_FILE_BYTES = 1024 * 1024;

async function handleShare(req) {
  try {
    const form = await req.formData();
    const str = (k) => {
      const v = form.get(k);
      return typeof v === 'string' ? v : '';
    };
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const cache = await caches.open(SHARE_INBOX);
    const metaFiles = [];
    const files = form.getAll('files').filter((f) => typeof f !== 'string').slice(0, SHARE_MAX_FILES);
    for (const f of files) {
      if (f.size > SHARE_MAX_FILE_BYTES) continue;
      await cache.put('/__share/' + id + '/file/' + metaFiles.length, new Response(f, { headers: { 'content-type': f.type || 'application/octet-stream' } }));
      metaFiles.push({ name: f.name, type: f.type });
    }
    const meta = { title: str('title'), text: str('text'), url: str('url'), files: metaFiles };
    await cache.put('/__share/' + id + '/meta', new Response(JSON.stringify(meta), { headers: { 'content-type': 'application/json' } }));
    return Response.redirect(SHARE_REVIEW + '?share=' + id, 303);
  } catch {
    return Response.redirect(SHARE_REVIEW, 303);
  }
}

/* ---- Web Push ----
 * Payload JSON: { title, body, url }. Click focuses an open tab (navigating it to url) or opens a new one.
 */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Notification', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Identity Prism';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: typeof data.url === 'string' && data.url.charAt(0) === '/' ? data.url : '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  let target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  if (new URL(target).origin !== self.location.origin) target = new URL('/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (list) => {
      for (const c of list) {
        if (new URL(c.url).origin === self.location.origin && 'focus' in c) {
          await c.focus();
          if ('navigate' in c && c.url !== target) return c.navigate(target).catch(() => {});
          return;
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
