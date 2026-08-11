"use client";

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, LogOut } from 'lucide-react';
import { UI_API } from '@/lib/api/endpoints';
import { APP_BRAND } from '@/config/ui-content';

type SessionUser = { id: string; email: string; role: string };

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/console';

  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(UI_API.authMe, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(UI_API.authLogin, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await fetch(UI_API.authLogout, { method: 'POST', credentials: 'include' });
      setUser(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black tracking-tight text-text-primary">{APP_BRAND.name}</h1>
          <p className="text-sm text-text-tertiary mt-1">Sign in to manage your prism</p>
        </div>

        <div className="rounded-3xl bg-white border border-border-secondary shadow-sm p-6">
          {checking ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-text-disabled" size={22} />
            </div>
          ) : user ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-text-secondary">
                Signed in as <span className="font-bold text-text-primary">{user.email}</span>
                <span className="ml-1.5 text-2xs font-bold text-accent">({user.role})</span>
              </p>
              <div className="flex gap-2 justify-center">
                <Link
                  href={next}
                  className="px-4 py-2 rounded-xl bg-text-primary text-bg-primary text-sm font-bold"
                >
                  Continue
                </Link>
                <button
                  onClick={logout}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border-primary text-sm font-bold text-text-secondary disabled:opacity-50"
                >
                  <LogOut size={14} /> Log out
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={login} className="space-y-3">
              <input
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-2xl border border-border-primary p-3 text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-2xl border border-border-primary p-3 text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && <p className="text-sm text-danger">{error}</p>}
              <button
                type="submit"
                disabled={busy || !email || !password}
                className="w-full py-3 rounded-2xl bg-text-primary text-bg-primary text-sm font-bold disabled:opacity-40"
              >
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}
        </div>

        <p className="text-2xs text-text-disabled text-center mt-6">
          <Link href="/console" className="hover:text-text-tertiary">Back to console</Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
