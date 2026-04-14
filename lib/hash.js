import crypto from 'crypto';

export function hashRaw(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}
