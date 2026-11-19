"use client";

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, Eye, EyeOff, Fingerprint, Loader2, LogOut } from 'lucide-react';
import { UI_API } from '@/lib/api/endpoints';
import { haptic } from '@/lib/pwa/browser';
import { APP_BRAND } from '@/config/ui-content';
import { hasDevicePasskey, platformPasskeySupported, signInWithPasskey } from '@/lib/passkey-client';

type SessionUser = { id: string; email: string; role: string };

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated';
const FIELD_CLS =
  'block w-full min-h-12 rounded-xl border bg-bg-primary px-3.5 py-3 text-md text-text-primary placeholder:text-text-tertiary transition-colors focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent';

/**
 * Prism mark: a beam enters a triangle and leaves as three lines.
 * Settles in once on load; static under reduced motion.
 */
function PrismMark({ revealed }: { revealed: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border-secondary bg-bg-elevated text-text-primary shadow-sm transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:opacity-100 motion-reduce:transition-none ${
        revealed ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-1 scale-95 opacity-0'
      }`}
    >
      <svg viewBox="0 0 32 32" width="28" height="28" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 6 L26 24 H6 Z" className="fill-accent/15 stroke-current" strokeWidth="1.75" />
        <path d="M2 17 H11.5" className="stroke-current" strokeWidth="1.75" />
        <path d="M20.5 17 L30 12" className="stroke-accent" strokeWidth="1.75" />
        <path d="M21.5 20 L30 20" className="stroke-accent" strokeWidth="1.75" />
        <path d="M20.5 23 L30 28" className="stroke-accent" strokeWidth="1.75" />
      </svg>
    </span>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const next = params.get('next') || '/console';

  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [remember, setRemember] = useState(true);
  const [bioReady, setBioReady] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Same-origin paths only: blocks "//evil.com", "/\\evil.com" and absolute URLs,
  // and never bounces back to /login itself.
  // Tab, CR and LF are stripped by browsers when parsing URLs, so "/\t/evil.com" would become "//evil.com".
  const cleanNext = next.replace(/[\u0000-\u001f\u007f]/g, '');
  const safeNext =
    cleanNext === next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') && !next.startsWith('/login')
      ? next
      : '/console';

  useEffect(() => {
    const id = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    platformPasskeySupported().then((ok) => setBioReady(ok && hasDevicePasskey()));
  }, []);

  async function biometricLogin() {
    if (bioBusy || busy) return;
    setBioBusy(true);
    setError(null);
    setFieldErrors({});
    setStatus('Waiting for your passkey');
    try {
      await signInWithPasskey(remember);
      setStatus('Signed in');
      haptic('success');
      window.location.assign(safeNext);
    } catch (err: unknown) {
      setStatus('');
      setError(err instanceof Error ? err.message : 'Passkey sign-in failed. Use your email and password instead.');
      setBioBusy(false);
    }
  }

  useEffect(() => {
    fetch(UI_API.authMe, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        setUser(u);
        // Only owner (admin) sessions can use the private app. A non-admin
        // session would be bounced back here by middleware (redirect loop),
        // so show the signed-in card instead of auto-redirecting.
        if (u && u.role === 'admin') window.location.replace(safeNext);
      })
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (busy || bioBusy) return;

    // Validate here instead of disabling the button, so the primary action
    // always looks available and a miss says exactly what to fix.
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) nextErrors.email = 'Enter your email address.';
    if (!password) nextErrors.password = 'Enter your password.';
    setFieldErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) {
      setError(null);
      (nextErrors.email ? emailRef.current : passwordRef.current)?.focus();
      return;
    }

    setBusy(true);
    setError(null);
    setStatus('Signing in');
    try {
      const res = await fetch(UI_API.authLogin, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Sign-in failed (${res.status}). Check your email and password, then try again.`);
      haptic('success');
      setStatus('Signed in');
      // Hard navigation so the fresh session cookie is sent and the dashboard
      // (and PWA shell) loads with it.
      window.location.assign(safeNext);
    } catch (err: unknown) {
      setStatus('');
      setError(err instanceof Error ? err.message : 'Sign-in failed. Check your connection and try again.');
      setBusy(false);
      passwordRef.current?.focus();
    }
  }

  async function logout() {
    setBusy(true);
    try {
      const res = await fetch(UI_API.authLogout, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Log out failed. Try again.');
      setUser(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Log out failed. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const labelCls = 'mb-1.5 block text-sm font-medium text-text-primary';
  const emailErrId = 'login-email-error';
  const passwordErrId = 'login-password-error';
  const emailDescribed = fieldErrors.email ? emailErrId : undefined;
  const passwordDescribed = [fieldErrors.password ? passwordErrId : '', error ? 'login-error' : ''].filter(Boolean).join(' ') || undefined;

  return (
    <main className="min-h-dvh-fallback flex items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-sm">
        <header className="mb-7 flex flex-col items-start gap-4">
          <div className="flex items-center gap-3">
            <PrismMark revealed={revealed} />
            <span className="text-md font-semibold tracking-tight text-text-primary">{APP_BRAND.name}</span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Sign in</h1>
            <p className="mt-1 text-sm text-text-tertiary">Your private workspace for memory, decisions and publishing.</p>
          </div>
        </header>

        <div className="rounded-3xl border border-border-secondary bg-bg-elevated p-5 shadow-sm sm:p-6">
          {checking ? (
            <div className="flex items-center gap-3 py-3" role="status">
              <Loader2 className="shrink-0 animate-spin text-text-tertiary motion-reduce:animate-none" size={20} aria-hidden="true" />
              <p className="text-sm text-text-secondary">Checking your session…</p>
            </div>
          ) : user ? (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                You are signed in as <span className="break-all font-semibold text-text-primary">{user.email}</span>{' '}
                <span className="text-xs text-text-tertiary">({user.role})</span>.
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href={safeNext}
                  className={`inline-flex min-h-12 items-center justify-center rounded-xl bg-text-primary text-sm font-semibold text-bg-primary transition-colors hover:bg-accent ${FOCUS_RING}`}
                >
                  Continue
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  disabled={busy}
                  className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border-primary bg-bg-elevated text-sm font-semibold text-text-primary transition-colors hover:bg-bg-secondary disabled:opacity-60 ${FOCUS_RING}`}
                >
                  <LogOut size={16} aria-hidden="true" /> {busy ? 'Logging out…' : 'Log out'}
                </button>
              </div>
              {user.role !== 'admin' && (
                <p className="text-xs text-text-tertiary">This account cannot open the private app. Log out, then sign in as the owner.</p>
              )}
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            </div>
          ) : (
            <form onSubmit={login} noValidate className="space-y-5" aria-busy={busy || bioBusy}>
              <div>
                <label htmlFor="login-email" className={labelCls}>Email</label>
                <input
                  ref={emailRef}
                  id="login-email"
                  type="email"
                  name="email"
                  required
                  autoComplete="username webauthn"
                  inputMode="email"
                  enterKeyHint="next"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className={`${FIELD_CLS} ${fieldErrors.email ? 'border-danger' : 'border-border-primary'}`}
                  aria-required="true"
                  aria-invalid={fieldErrors.email ? true : undefined}
                  aria-describedby={emailDescribed}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined })); }}
                />
                {fieldErrors.email && <p id={emailErrId} role="alert" className="mt-1.5 text-xs text-danger">{fieldErrors.email}</p>}
              </div>

              <div>
                <label htmlFor="login-password" className={labelCls}>Password</label>
                <div className="relative">
                  <input
                    ref={passwordRef}
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    autoComplete="current-password"
                    enterKeyHint="go"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className={`${FIELD_CLS} pr-12 ${fieldErrors.password || error ? 'border-danger' : 'border-border-primary'}`}
                    aria-required="true"
                    aria-invalid={fieldErrors.password || error ? true : undefined}
                    aria-describedby={passwordDescribed}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined })); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center rounded-xl text-text-tertiary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
                {fieldErrors.password && <p id={passwordErrId} role="alert" className="mt-1.5 text-xs text-danger">{fieldErrors.password}</p>}
              </div>

              <label htmlFor="login-remember" className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-text-secondary">
                <input
                  id="login-remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border-primary bg-bg-primary text-bg-primary transition-colors peer-checked:border-text-primary peer-checked:bg-text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg-elevated [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
                >
                  <Check size={14} strokeWidth={3} />
                </span>
                Keep me signed in on this device
              </label>

              <p role="status" aria-live="polite" className="sr-only">{status}</p>

              {error && (
                <p id="login-error" role="alert" className="rounded-xl border border-border-secondary bg-bg-secondary px-3 py-2.5 text-sm text-danger">
                  {error}
                </p>
              )}

              <div className="space-y-3">
                <button
                  type="submit"
                  aria-disabled={busy || bioBusy}
                  className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-text-primary text-sm font-semibold text-bg-primary transition-colors hover:bg-accent aria-disabled:cursor-progress aria-disabled:hover:bg-text-primary ${FOCUS_RING}`}
                >
                  {busy ? (
                    <>
                      <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      Signing in…
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>

                {bioReady ? (
                  <>
                    <div className="flex items-center gap-3 text-xs text-text-tertiary" aria-hidden="true">
                      <span className="h-px flex-1 bg-border-secondary" />
                      or
                      <span className="h-px flex-1 bg-border-secondary" />
                    </div>
                    <button
                      type="button"
                      onClick={biometricLogin}
                      aria-disabled={busy || bioBusy}
                      className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border-primary bg-bg-elevated text-sm font-semibold text-text-primary transition-colors hover:bg-bg-secondary aria-disabled:cursor-progress ${FOCUS_RING}`}
                    >
                      {bioBusy ? (
                        <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      ) : (
                        <Fingerprint size={18} aria-hidden="true" />
                      )}
                      {bioBusy ? 'Waiting for your device…' : 'Sign in with a passkey'}
                    </button>
                  </>
                ) : (
                  <p className="text-center text-xs text-text-tertiary">You can add passkey sign-in from System after you sign in.</p>
                )}
              </div>
            </form>
          )}
        </div>
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
