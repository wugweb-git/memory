import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI;

if (!globalThis._mongooseCache) {
  globalThis._mongooseCache = { conn: null, promise: null };
}

export default async function connectToDatabase() {
  if (!MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  if (globalThis._mongooseCache.conn) {
    return globalThis._mongooseCache.conn;
  }

  if (!globalThis._mongooseCache.promise) {
    globalThis._mongooseCache.promise = mongoose.connect(MONGO_URI).then((m) => m);
  }

  globalThis._mongooseCache.conn = await globalThis._mongooseCache.promise;
  return globalThis._mongooseCache.conn;
}
