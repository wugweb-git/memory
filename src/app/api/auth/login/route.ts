import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { mongo } from '@/lib/db/mongo';
import { INTERNAL_VAULT } from '@/config/vault';
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
    const user = await mongo.user.findUnique({ where: { email: normalized } });
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
      await mongo.user.update({ where: { id: user.id }, data: { role } });
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
