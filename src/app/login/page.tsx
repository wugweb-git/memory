"use client";

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, LogOut } from 'lucide-react';
import { UI_API } from '@/lib/api/endpoints';
import { APP_BRAND } from '@/config/ui-content';
import { hasDevicePasskey, platformPasskeySupported, signInWithPasskey } from '@/lib/passkey-client';

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
  const [remember, setRemember] = useState(true);
  const [bioReady, setBioReady] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  const [status, setStatus] = useState('');

  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/console';

  useEffect(() => {
    platformPasskeySupported().then((ok) => setBioReady(ok && hasDevicePasskey()));
  }, []);

  async function biometricLogin() {
    setBioBusy(true);
    setError(null);
    setStatus('Waiting for Face ID or fingerprint');
    try {
      await signInWithPasskey(remember);
      setStatus('Signed in');
      window.location.assign(safeNext);
    } catch (err: unknown) {
      setStatus('');
      setError(err instanceof Error ? err.message : 'Biometric sign-in failed');
      setBioBusy(false);
    }
  }

  useEffect(() => {
    fetch(UI_API.authMe, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        setUser(u);
        if (u) window.location.replace(next.startsWith('/') && !next.startsWith('//') ? next : '/console');
      })
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
        body: JSON.stringify({ email, password, remember }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      // Hard navigation so the fresh session cookie is sent and the dashboard
      // (and PWA shell) loads with it.
      window.location.assign(next.startsWith('/') && !next.startsWith('//') ? next : '/console');
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
    <main className="min-h-dvh-fallback flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black tracking-tight text-text-primary">{APP_BRAND.name}</h1>
          <p className="text-sm text-text-tertiary mt-1">Sign in to manage your prism</p>
        </div>

        <div className="rounded-3xl bg-white border border-border-secondary shadow-sm p-6">
          {checking ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-text-disabled" size={22} aria-label="Checking session" role="img" />
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
                  className="inline-flex min-h-11 items-center px-4 rounded-xl bg-text-primary text-bg-primary text-sm font-bold"
                >
                  Continue
                </Link>
                <button
                  onClick={logout}
                  disabled={busy}
                  className="inline-flex min-h-11 items-center gap-1.5 px-4 rounded-xl border border-border-primary text-sm font-bold text-text-secondary disabled:opacity-50"
                >
                  <LogOut size={14} /> Log out
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={login} className="space-y-3">
              <label htmlFor="login-email" className="sr-only">Email</label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="username webauthn"
                inputMode="email"
                enterKeyHint="next"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full min-h-11 rounded-2xl border border-border-primary p-3 text-base"
                aria-label="Email" placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="login-password" className="sr-only">Password</label>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                enterKeyHint="go"
                className="w-full min-h-11 rounded-2xl border border-border-primary p-3 text-base"
                aria-label="Password" placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label htmlFor="login-remember" className="flex min-h-11 items-center gap-3 text-sm text-text-secondary">
                <input
                  id="login-remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-5 w-5 accent-accent"
                />
                Keep me signed in on this device
              </label>
              <p role="status" aria-live="polite" className="sr-only">{status}</p>
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
              <button
                type="submit"
                disabled={busy || bioBusy || !email || !password}
                className="w-full min-h-11 py-3 rounded-2xl bg-text-primary text-bg-primary text-sm font-bold disabled:opacity-40"
              >
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
              {bioReady ? (
                <button
                  type="button"
                  onClick={biometricLogin}
                  disabled={busy || bioBusy}
                  className="w-full min-h-11 py-3 rounded-2xl border border-border-primary text-sm font-bold text-text-primary disabled:opacity-40"
                >
                  {bioBusy ? 'Waiting for your device…' : 'Sign in with Face ID or fingerprint'}
                </button>
              ) : (
                <p className="text-2xs text-text-tertiary text-center">Set up biometrics after you sign in</p>
              )}
            </form>
          )}
        </div>

        <p className="text-2xs text-text-disabled text-center mt-6">
          <Link href="/console" className="inline-flex min-h-11 items-center hover:text-text-tertiary">Back to console</Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-dvh-fallback bg-bg-primary text-text-primary">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
