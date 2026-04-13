const mongoose = require('mongoose');

if (!global._mongooseCache) {
  global._mongooseCache = { conn: null, promise: null };
}

async function connectDB() {
  if (global._mongooseCache.conn) {
    return global._mongooseCache.conn;
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  if (!global._mongooseCache.promise) {
    global._mongooseCache.promise = mongoose.connect(process.env.MONGO_URI);
  }

  global._mongooseCache.conn = await global._mongooseCache.promise;
  return global._mongooseCache.conn;
}

module.exports = { connectDB };
