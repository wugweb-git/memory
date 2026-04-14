const store = new Map();

export async function getCache(key) {
  const row = store.get(key);
  if (!row) return null;
  if (Date.now() > row.expiresAt) {
    store.delete(key);
    return null;
  }
  return row.value;
}

export async function setCache(key, value, ttlMs = 10000) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export async function clearCacheByPrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
