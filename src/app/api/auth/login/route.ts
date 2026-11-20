import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { postgres } from '@/lib/db/postgres';
import { INTERNAL_VAULT } from '@/config/vault';
import { IDENTITY_CONFIG } from '@/config/identity';
import { signToken } from '@/lib/security/jwt';
import { rememberedSessionCookie } from '@/lib/security/auth';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { safeEqual, clientIp, AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_MS } from '@/lib/security/safe-compare';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { email, password, remember } = body as { email?: unknown; password?: unknown; remember?: unknown };
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const normalized = String(email).trim().toLowerCase();

    // Brute-force guard: per client IP and per email, 10 attempts per 10 minutes.
    const [ipLimit, emailLimit] = await Promise.all([
      checkRateLimit(`login:ip:${clientIp(req)}`, AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_MS),
      checkRateLimit(`login:email:${normalized.slice(0, 200)}`, AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_MS),
    ]);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const res = NextResponse.json({ error: 'Too many sign-in attempts, try again in a few minutes' }, { status: 429 });
      res.headers.set('Retry-After', String(Math.ceil(AUTH_RATE_WINDOW_MS / 1000)));
      return res;
    }

    // Owner login via env credentials (single-owner product). Works without a
    // user database; disabled unless ADMIN_PASSWORD is set in the environment.
    // Constant-time comparison (equal-length digests); both sides always evaluated.
    const emailMatches = safeEqual(normalized, (INTERNAL_VAULT.ADMIN_EMAIL || '').toLowerCase());
    const passwordMatches = safeEqual(String(password).trim(), INTERNAL_VAULT.ADMIN_PASSWORD || '');
    if (INTERNAL_VAULT.ADMIN_PASSWORD && INTERNAL_VAULT.ADMIN_EMAIL && emailMatches && passwordMatches) {
      const token = signToken(
        { sub: IDENTITY_CONFIG.DEFAULT_USER_ID, email: normalized, role: 'admin' },
        INTERNAL_VAULT.AUTH_SECRET,
      );
      const res = NextResponse.json({
        access_token: token,
        user: { id: IDENTITY_CONFIG.DEFAULT_USER_ID, email: normalized, role: 'admin' },
      });
      res.headers.set('Set-Cookie', rememberedSessionCookie(token, remember));
      return res;
    }

    // Database-backed users. A DB outage must not read as "wrong password".
    let user;
    try {
      user = await postgres.user.findUnique({ where: { email: normalized } });
    } catch (dbError) {
      console.error('[Auth Login] user DB unreachable:', dbError);
      return NextResponse.json(
        { error: 'Sign-in service unavailable — try again shortly' },
        { status: 503 },
      );
    }
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await bcrypt.compare(String(password), user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Single-owner system: admin is ONLY ever granted by the env-credential
    // branch above. A database account (which public signup could create in
    // the past) never gets an admin session, whatever its stored role or email.
    const role = user.role === 'admin' ? 'user' : user.role;

    const token = signToken(
      { sub: user.id, email: user.email, role },
      INTERNAL_VAULT.AUTH_SECRET,
    );

    const res = NextResponse.json({
      access_token: token,
      user: { id: user.id, email: user.email, role },
    });
    res.headers.set('Set-Cookie', rememberedSessionCookie(token, remember));
    return res;
  } catch (error: unknown) {
    console.error('[Auth Login]', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
