import mongoose from 'mongoose';
import { config } from '../config/config.js';

if (!globalThis._mongooseCache) {
  globalThis._mongooseCache = { conn: null, promise: null };
}

export async function connectDB() {
  if (globalThis._mongooseCache.conn) return globalThis._mongooseCache.conn;

  if (!globalThis._mongooseCache.promise) {
    globalThis._mongooseCache.promise = mongoose.connect(config.mongoUri);
  }

  globalThis._mongooseCache.conn = await globalThis._mongooseCache.promise;
  return globalThis._mongooseCache.conn;
}
