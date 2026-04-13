import User from '../models/User.js';
import { fail } from './errors.js';
import { sanitizeString } from '../middleware/requestGuards.js';
import {
  issueTokens,
  getAuthUser,
  revokeToken,
  verifyPassword,
  hashPassword,
  ensureAdminUser
} from './auth.js';

export async function login(req) {
  await ensureAdminUser();

  const email = sanitizeString(req.body?.email || '').toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    throw fail('email and password are required', 'validation_error', 400);
  }

  const user = await User.findOne({ email });
  if (!user) throw fail('invalid credentials', 'auth_error', 401);

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw fail('invalid credentials', 'auth_error', 401);

  const tokens = issueTokens(user);
  return {
    code: 200,
    body: {
      user: { id: String(user._id), email: user.email, role: user.role },
      ...tokens,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken
    }
  };
}

export async function me(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  return {
    code: 200,
    body: { id: String(user._id), email: user.email, role: user.role }
  };
}

export async function logout(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  revokeToken(token);
  return { code: 200, body: { ok: true } };
}

export async function signup(req) {
  const email = sanitizeString(req.body?.email || '').toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    throw fail('email and password are required', 'validation_error', 400);
  }

  const exists = await User.findOne({ email });
  if (exists) throw fail('email already exists', 'validation_error', 409);

  const password_hash = await hashPassword(password);
  const user = await User.create({ email, password_hash, role: 'user' });
  const tokens = issueTokens(user);

  return {
    code: 201,
    body: {
      user: { id: String(user._id), email: user.email, role: user.role },
      ...tokens,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken
    }
  };
}
