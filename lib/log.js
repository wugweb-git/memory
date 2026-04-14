import { createBaseDoc, readStore, updateStore } from './store.js';

export async function writeLog(entry) {
  try {
    await updateStore((store) => {
      store.logs.unshift(createBaseDoc('log', entry));
      store.logs = store.logs.slice(0, 1000);
    });
  } catch {
    // non-blocking
  }
}

export async function listLogs(limit = 50, userId = '', isAdmin = false) {
  const store = await readStore();
  const rows = isAdmin
    ? store.logs
    : store.logs.filter((l) => !l.user_id || String(l.user_id) === String(userId));
  return rows.slice(0, limit);
}
