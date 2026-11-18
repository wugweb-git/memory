import type { QueueStorage, QueuedCapture } from './capture-queue';

export const CAPTURE_DB = 'prism-captures';
export const CAPTURE_STORE = 'queue';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(CAPTURE_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(CAPTURE_STORE)) req.result.createObjectStore(CAPTURE_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(CAPTURE_STORE, mode);
        const req = fn(tx.objectStore(CAPTURE_STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        tx.onerror = tx.onabort = () => {
          db.close();
          reject(tx.error);
        };
      }),
  );
}

/** IndexedDB adapter. Returns null when IndexedDB is unavailable (private mode, old browsers). */
export function createIndexedDbStorage(): QueueStorage | null {
  try {
    if (typeof indexedDB === 'undefined') return null;
  } catch {
    return null;
  }
  return {
    getAll: () => run<QueuedCapture[]>('readonly', (s) => s.getAll()),
    put: (item) => run('readwrite', (s) => s.put(item)).then(() => undefined),
    remove: (id) => run('readwrite', (s) => s.delete(id)).then(() => undefined),
  };
}
