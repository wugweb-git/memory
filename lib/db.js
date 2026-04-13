import mongoose from 'mongoose';

if (!globalThis._mongooseCache) {
  globalThis._mongooseCache = { conn: null, promise: null };
}

export async function connectDB() {
  if (globalThis._mongooseCache.conn) return globalThis._mongooseCache.conn;

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  if (!globalThis._mongooseCache.promise) {
    globalThis._mongooseCache.promise = mongoose.connect(process.env.MONGO_URI);
  }

  globalThis._mongooseCache.conn = await globalThis._mongooseCache.promise;
  return globalThis._mongooseCache.conn;
}
