import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config/config.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const revokedTokens = new Set();
const ACCESS_TTL_MS = 1000 * 60 * 60;
const REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 14;

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
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function issueTokens(user) {
  const base = { sub: String(user.id), email: user.email, role: user.role };
  return {
    accessToken: signRaw({ ...base, type: 'access', exp: Date.now() + ACCESS_TTL_MS }),
    refreshToken: signRaw({ ...base, type: 'refresh', exp: Date.now() + REFRESH_TTL_MS })
  };
}

export function verifyAccessToken(token) {
  if (revokedTokens.has(token)) return null;
  const payload = verifyRaw(token);
  if (!payload || payload.type !== 'access') return null;
  return payload;
}

export async function getUserByEmail(email) {
  return await prisma.user.findUnique({ where: { email } });
}

export async function getUserById(id) {
  if (!id) return null;
  return await prisma.user.findUnique({ where: { id } });
}

export async function createUser({ email, password_hash, role = 'user' }) {
  return await prisma.user.create({
    data: { email, password_hash, role }
  });
}

export async function getAuthUser(req) {
  const header = req.headers.get?.('authorization') || req.headers?.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const payload = verifyAccessToken(header.slice(7));
  if (!payload?.sub) return null;
  return await getUserById(payload.sub);
}

export const hashPassword = async (password) => bcrypt.hash(String(password), 10);
export const verifyPassword = async (password, hash) => bcrypt.compare(String(password), hash);

export async function ensureAdminUser() {
  const email = String(config.adminEmail || '').toLowerCase();
  const password = String(config.adminPassword || '');
  if (!email || !password) return null;

  const password_hash = await hashPassword(password);

  return await prisma.user.upsert({
    where: { email },
    update: { password_hash, role: 'admin' },
    create: { email, password_hash, role: 'admin' }
  });
}

export function revokeToken(token) {
  if (token) revokedTokens.add(token);
}
