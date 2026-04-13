import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { config } from '../config/config.js';


const revokedTokens = new Set();
const ACCESS_TTL_MS = 1000 * 60 * 60; // 1 hour
const REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

function signRaw(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', config.authSecret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyRaw(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', config.authSecret).update(body).digest('base64url');
  if (sig !== expected) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (payload.exp && Date.now() > payload.exp) return null;
  return payload;
}

export function issueTokens(user) {
  const base = { sub: String(user._id), email: user.email, role: user.role };
  const accessToken = signRaw({ ...base, type: 'access', exp: Date.now() + ACCESS_TTL_MS });
  const refreshToken = signRaw({ ...base, type: 'refresh', exp: Date.now() + REFRESH_TTL_MS });
  return { accessToken, refreshToken };
}

export function verifyAccessToken(token) {
  if (revokedTokens.has(token)) return null;
  const payload = verifyRaw(token);
  if (!payload || payload.type !== 'access') return null;
  return payload;
}

export function verifyRefreshToken(token) {
  const payload = verifyRaw(token);
  if (!payload || payload.type !== 'refresh') return null;
  return payload;
}

export async function getAuthUser(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const payload = verifyAccessToken(header.slice(7));
  if (!payload?.sub) return null;
  return User.findById(payload.sub);
}

export async function hashPassword(password) {
  return bcrypt.hash(String(password), 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(String(password), hash);
}


export async function ensureAdminUser() {
  const email = String(config.adminEmail || '').toLowerCase();
  const password = String(config.adminPassword || '');
  if (!email || !password) return null;

  const existing = await User.findOne({ email });
  if (existing) return existing;

  const password_hash = await hashPassword(password);
  return User.create({ email, password_hash, role: 'admin' });
}

export function revokeToken(token) {
  if (token) revokedTokens.add(token);
}
