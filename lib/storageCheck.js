import { connectDB } from './db.js';

export async function checkStorage() {
  try {
    const result = await connectDB();
    return { blob_store: { ok: true, message: result.provider } };
  } catch (error) {
    return { blob_store: { ok: false, message: error.message } };
  }
}
