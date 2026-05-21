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
    if (!email || !password || String(password).length < 8) {
      return NextResponse.json({ error: 'Valid email and password (8+ chars) required' }, { status: 400 });
    }

    const normalized = String(email).trim().toLowerCase();
    const existing = await mongo.user.findUnique({ where: { email: normalized } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const isAdmin = INTERNAL_VAULT.ADMIN_EMAIL && normalized === INTERNAL_VAULT.ADMIN_EMAIL.toLowerCase();
    const password_hash = await bcrypt.hash(String(password), 10);
    const user = await mongo.user.create({
      data: {
        email: normalized,
        password_hash,
        role: isAdmin ? 'admin' : 'user',
      },
    });

    const token = signToken(
      { sub: user.id, email: user.email, role: user.role },
      INTERNAL_VAULT.AUTH_SECRET,
    );

    const res = NextResponse.json({
      access_token: token,
      user: { id: user.id, email: user.email, role: user.role },
    });
    res.headers.set('Set-Cookie', sessionCookie(token));
    return res;
  } catch (error: unknown) {
    console.error('[Auth Signup]', error);
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
