import mongoose from 'mongoose';
import { attachDatabasePool } from '@vercel/functions';
import { config } from '../config/config.js';
import { fail } from './errors.js';

if (!globalThis._mongooseCache) {
  globalThis._mongooseCache = { conn: null, promise: null, uri: null, poolAttached: false };
}

function formatDbError(error, attemptedUris = []) {
  const message = String(error?.message || 'Database connection failed');
  const attempted = attemptedUris.length ? ` Attempted: ${attemptedUris.join(' | ')}` : '';

  if (message.includes('ENOTFOUND')) {
    return fail(`MongoDB DNS lookup failed (${message}). Verify Atlas cluster hostname in MONGO_URI and network allow list.${attempted}`, 'external_error', 503);
  }

  if (message.toLowerCase().includes('authentication failed')) {
    return fail(`MongoDB authentication failed. Verify username/password in MONGO_URI.${attempted}`, 'external_error', 503);
  }

  return fail(`MongoDB connection failed: ${message}.${attempted}`, 'external_error', 503);
}

async function connectWithFallback() {
  const candidates = [config.mongoUri, config.mongoUriFallback].filter(Boolean);
  let lastError;

  for (const uri of candidates) {
    try {
      const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 12000 });
      globalThis._mongooseCache.uri = uri;
      if (!globalThis._mongooseCache.poolAttached) {
        attachDatabasePool(conn.connection.getClient());
        globalThis._mongooseCache.poolAttached = true;
      }
      return conn;
    } catch (error) {
      lastError = error;
    }
  }

  throw formatDbError(lastError, candidates);
}

export async function connectDB() {
  if (globalThis._mongooseCache.conn) return globalThis._mongooseCache.conn;

  if (!globalThis._mongooseCache.promise) {
    globalThis._mongooseCache.promise = connectWithFallback();
  }

  try {
    globalThis._mongooseCache.conn = await globalThis._mongooseCache.promise;
    return globalThis._mongooseCache.conn;
  } catch (error) {
    globalThis._mongooseCache.promise = null;
    throw error;
  }
}
