import { config } from '../config/config.js';

const ipBuckets = new Map();

export function applyCors(req, res) {
  const origin = req.headers.origin || '*';
  const allowed = config.allowedOrigins.includes('*') || config.allowedOrigins.includes(origin);
  if (allowed) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  return allowed;
}

export function enforcePayloadLimit(req) {
  const length = Number(req.headers['content-length'] || 0);
  if (length > config.requestLimitBytes) {
    const err = new Error('Payload too large');
    err.type = 'validation_error';
    err.status = 413;
    throw err;
  }
}

export function rateLimit(req, { key = 'global', limit = 120, windowMs = 60000 } = {}) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();
  const row = ipBuckets.get(bucketKey) || { count: 0, resetAt: now + windowMs };
  if (now > row.resetAt) {
    row.count = 0;
    row.resetAt = now + windowMs;
  }
  row.count += 1;
  ipBuckets.set(bucketKey, row);
  if (row.count > limit) {
    const err = new Error('Rate limit exceeded');
    err.type = 'rate_limit_error';
    err.status = 429;
    throw err;
  }
}

export function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/[<>]/g, '').trim();
}
