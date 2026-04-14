import { initStore } from './store.js';

export async function connectDB() {
  await initStore();
  return { ok: true, provider: 'vercel_blob_store' };
}
