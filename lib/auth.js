import crypto from 'crypto';
import User from '../models/User.js';

const SECRET = process.env.AUTH_SECRET || 'dev-secret-change-me';

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signPayload(payload) {
  const body = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig !== expected) return null;

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (payload.exp && Date.now() > payload.exp) return null;
  return payload;
}

export function issueToken(user) {
  const payload = {
    sub: String(user._id),
    email: user.email,
    role: user.role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7
  };
  return signPayload(payload);
}

export async function getAuthUser(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload?.sub) return null;
  const user = await User.findById(payload.sub);
  return user;
}

export function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}
