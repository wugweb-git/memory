const store = new Map();

export function getCache(key) {
  const row = store.get(key);
  if (!row) return null;
  if (Date.now() > row.expiresAt) {
    store.delete(key);
    return null;
  }
  return row.value;
}

export function setCache(key, value, ttlMs = 10000) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearCacheByPrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
