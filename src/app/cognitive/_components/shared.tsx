'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { resolveUserId } from '@/config/identity';
import { readAiErrorBody } from '@/lib/ai/client-error';

/* ─── api helper ─────────────────────────────────────────── */
export const REQUEST_TIMEOUT_MS = 60_000;

/** Plain-language message for statuses the user can act on; null to fall through to the server's message. */
export function friendlyStatus(status: number, serverMessage?: string | null): string | null {
  if (status === 401) return 'Your session has ended. Sign in again, then retry.';
  // A 429 can carry its own reason (the daily limit and its reset time); show it when present.
  if (status === 429) return serverMessage || 'Too many requests right now. Wait a moment, then try again.';
  // Do not override a specific server message on 5xx.
  if (status >= 500) return serverMessage ? null : 'The service had a problem. Try again in a moment.';
  return null;
}

/** Error from postJson. `limit` marks a quota or daily limit: a calm notice, no Retry. */
export class ApiError extends Error {
  code?: string;
  retryable: boolean;
  limit: boolean;
  constructor(message: string, opts: { code?: string; retryable?: boolean; limit?: boolean } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = opts.code;
    this.limit = Boolean(opts.limit);
    this.retryable = opts.retryable !== false && !this.limit;
  }
}

/** Retry/notice flags for any caught error (plain Errors stay retryable). */
export function errorFlags(e: unknown): { limit: boolean; retryable: boolean } {
  return e instanceof ApiError ? { limit: e.limit, retryable: e.retryable } : { limit: false, retryable: true };
}

export async function postJson<T = any>(url: string, body: Record<string, unknown>): Promise<T> {
  let res: Response;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    if ((e as Error)?.name === 'AbortError') throw new Error('This is taking too long. Try again in a moment.');
    throw new Error('Connection failure. Check your network and try again.');
  }
  let data: any = null;
  try { data = await res.json(); } catch { /* non-json */ } finally { clearTimeout(timer); }
  if (!res.ok || data?.error) {
    // Show the server's safe message as returned; only fall back to a status sentence when it sent none.
    const info = readAiErrorBody(data, '');
    const text = info.message || friendlyStatus(res.status, null) || `The request failed (error ${res.status}). Try again.`;
    throw new ApiError(res.status === 401 ? friendlyStatus(401)! : text, { code: info.code, retryable: info.retryable, limit: info.limit });
  }
  return data as T;
}

export function currentUserId(): string {
  return resolveUserId().userId;
}

/* ─── layout primitives ──────────────────────────────────── */
export const Intent: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-1">
    <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
    <p className="text-sm text-text-tertiary">{children}</p>
  </div>
);

export const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-widest">{children}</p>
);

export const Card: React.FC<{
  eyebrow?: string;
  tone?: 'neutral' | 'success' | 'danger' | 'warning' | 'accent';
  children: React.ReactNode;
}> = ({ eyebrow, tone = 'neutral', children }) => {
  const border = {
    neutral: 'border-border-secondary',
    success: 'border-success/30',
    danger: 'border-danger/30',
    warning: 'border-warning/30',
    accent: 'border-accent/30',
  }[tone];
  return (
    <section className={`rounded-2xl border ${border} bg-bg-elevated p-4 sm:p-5 space-y-3`}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      {children}
    </section>
  );
};

export const PrimaryButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ onClick, disabled, loading, loadingLabel, icon, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className="w-full min-h-12 px-5 rounded-xl bg-text-primary text-bg-primary text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
  >
    {loading ? <><Loader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" /> {loadingLabel}</> : <><span aria-hidden="true" className="inline-flex">{icon}</span> {children}</>}
  </button>
);

export const ErrorBox: React.FC<{ message: string; onRetry?: () => void; limit?: boolean }> = ({ message, onRetry, limit }) => (
  <div
    role={limit ? 'status' : 'alert'}
    className={`rounded-2xl border p-4 flex items-start gap-3 ${limit ? 'border-border-secondary bg-bg-secondary' : 'border-danger/30 bg-danger/5'}`}
  >
    <AlertCircle size={16} className={`shrink-0 mt-0.5 ${limit ? 'text-text-tertiary' : 'text-danger'}`} aria-hidden="true" />
    <div className="flex-1 space-y-2">
      <p className={`text-sm ${limit ? 'text-text-secondary' : 'text-danger'}`}>{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="inline-flex items-center text-sm font-semibold text-danger underline underline-offset-2 min-h-11 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          Try again
        </button>
      ) : null}
    </div>
  </div>
);

export const EmptyState: React.FC<{ icon: React.ReactNode; title: string; hint: string }> = ({ icon, title, hint }) => (
  <div className="rounded-2xl border border-dashed border-border-secondary p-8 text-center space-y-2">
    <div className="mx-auto w-fit text-text-tertiary">{icon}</div>
    <p className="text-sm font-semibold text-text-secondary">{title}</p>
    <p className="text-xs text-text-tertiary">{hint}</p>
  </div>
);

export const SkeletonCard: React.FC<{ label: string }> = ({ label }) => (
  <div className="rounded-2xl border border-border-secondary bg-bg-elevated p-5 space-y-3" role="status" aria-busy="true">
    <p className="text-xs text-text-tertiary flex items-center gap-2"><RefreshCw size={13} className="motion-safe:animate-spin" aria-hidden="true" /> {label}</p>
    <div className="h-3 rounded bg-secondary motion-safe:animate-pulse w-2/3" />
    <div className="h-3 rounded bg-secondary motion-safe:animate-pulse w-full" />
    <div className="h-3 rounded bg-secondary motion-safe:animate-pulse w-5/6" />
  </div>
);

/* ─── data presentation ──────────────────────────────────── */
export function toneForScore(v: number): 'success' | 'warning' | 'danger' {
  return v >= 0.7 ? 'success' : v >= 0.4 ? 'warning' : 'danger';
}

const TEXT_TONE = { success: 'text-success', warning: 'text-warning', danger: 'text-danger' } as const;
const BG_TONE = { success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' } as const;

export const Meter: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  const v = Math.min(1, Math.max(0, Number(value) || 0));
  const tone = toneForScore(v);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-text-tertiary">
        <span>{label}</span>
        <span className="font-semibold text-text-primary">{Math.round(v * 100)}%</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-full rounded-full ${BG_TONE[tone]} transition-all duration-700 motion-reduce:transition-none`} style={{ width: `${v * 100}%` }} />
      </div>
    </div>
  );
};

export const ScoreRing: React.FC<{ value: number; label: string; size?: number }> = ({ value, label, size = 112 }) => {
  const v = Math.min(1, Math.max(0, Number(value) || 0));
  const r = 44;
  const c = 2 * Math.PI * r;
  const tone = toneForScore(v);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label} ${Math.round(v * 100)} percent`}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-border-secondary" />
        <circle
          cx="50" cy="50" r={r} fill="none" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v)}
          className={`${TEXT_TONE[tone]} transition-all duration-700 motion-reduce:transition-none`} stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-text-primary leading-none">{Math.round(v * 100)}</span>
        <span className="text-xs text-text-tertiary mt-1">{label}</span>
      </div>
    </div>
  );
};

export const FeedbackBar: React.FC<{ decisionId: string }> = ({ decisionId }) => {
  const [sent, setSent] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(type: string) {
    setFailed(false);
    setBusy(true);
    try {
      await postJson('/api/cognitive/feedback', { decisionId, userId: currentUserId(), feedbackType: type });
      setSent(type);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-success font-semibold">
        <CheckCircle size={14} aria-hidden="true" /> Thanks, marked as {sent}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <p id="feedback-label" className="text-xs text-text-tertiary">Was this useful?</p>
      {failed ? <p role="alert" className="text-xs text-danger">Your feedback was not saved. Check your connection and try again.</p> : null}
      <div role="group" aria-labelledby="feedback-label" className="grid grid-cols-3 gap-2">
        {[
          { key: 'accepted', label: 'Accept' },
          { key: 'ignored', label: 'Ignore' },
          { key: 'rejected', label: 'Reject' },
        ].map(f => (
          <button
            key={f.key}
            type="button"
            disabled={busy}
            onClick={() => submit(f.key)}
            className="min-h-11 rounded-xl border border-border-secondary text-sm font-semibold text-text-secondary hover:bg-secondary disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
};
