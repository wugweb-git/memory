import { fail } from './errors.js';
import { sanitizeString } from '../middleware/requestGuards.js';
import {
  issueTokens,
  getAuthUser,
  revokeToken,
  verifyPassword,
  hashPassword,
  ensureAdminUser,
  getUserByEmail,
  createUser
} from './auth.js';

function userView(user) {
  return { id: String(user._id), email: user.email, role: user.role };
}

export async function login(req) {
  await ensureAdminUser();
  const email = sanitizeString(req.body?.email || '').toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) throw fail('email and password are required', 'validation_error', 400);

  const user = await getUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw fail('invalid credentials', 'auth_error', 401);
  }

  const tokens = issueTokens(user);
  return { code: 200, body: { user: userView(user), ...tokens, access_token: tokens.accessToken, refresh_token: tokens.refreshToken } };
}

export async function me(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);
  return { code: 200, body: userView(user) };
}

export async function logout(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  revokeToken(header.startsWith('Bearer ') ? header.slice(7) : '');
  return { code: 200, body: { ok: true } };
}

export async function signup(req) {
  const email = sanitizeString(req.body?.email || '').toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) throw fail('email and password are required', 'validation_error', 400);
  if (await getUserByEmail(email)) throw fail('email already exists', 'validation_error', 409);

  const user = await createUser({ email, password_hash: await hashPassword(password), role: 'user' });
  const tokens = issueTokens(user);
  return { code: 201, body: { user: userView(user), ...tokens, access_token: tokens.accessToken, refresh_token: tokens.refreshToken } };
}
