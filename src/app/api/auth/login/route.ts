import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { postgres } from '@/lib/db/postgres';
import { INTERNAL_VAULT } from '@/config/vault';
import { IDENTITY_CONFIG } from '@/config/identity';
import { signToken } from '@/lib/security/jwt';
import { sessionCookie } from '@/lib/security/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const normalized = String(email).trim().toLowerCase();

    // Owner login via env credentials (single-owner product). Works without a
    // user database; disabled unless ADMIN_PASSWORD is set in the environment.
    if (
      INTERNAL_VAULT.ADMIN_PASSWORD &&
      INTERNAL_VAULT.ADMIN_EMAIL &&
      normalized === INTERNAL_VAULT.ADMIN_EMAIL.toLowerCase() &&
      String(password) === INTERNAL_VAULT.ADMIN_PASSWORD
    ) {
      const token = signToken(
        { sub: IDENTITY_CONFIG.DEFAULT_USER_ID, email: normalized, role: 'admin' },
        INTERNAL_VAULT.AUTH_SECRET,
      );
      const res = NextResponse.json({
        access_token: token,
        user: { id: IDENTITY_CONFIG.DEFAULT_USER_ID, email: normalized, role: 'admin' },
      });
      res.headers.set('Set-Cookie', sessionCookie(token));
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

    const isAdmin = INTERNAL_VAULT.ADMIN_EMAIL && normalized === INTERNAL_VAULT.ADMIN_EMAIL.toLowerCase();
    const role = isAdmin ? 'admin' : user.role;

    if (role !== user.role) {
      await postgres.user.update({ where: { id: user.id }, data: { role } });
    }

    const token = signToken(
      { sub: user.id, email: user.email, role },
      INTERNAL_VAULT.AUTH_SECRET,
    );

    const res = NextResponse.json({
      access_token: token,
      user: { id: user.id, email: user.email, role },
    });
    res.headers.set('Set-Cookie', sessionCookie(token));
    return res;
  } catch (error: unknown) {
    console.error('[Auth Login]', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
