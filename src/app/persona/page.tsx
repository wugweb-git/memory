'use client';

import { useEffect, useState, useCallback } from 'react';
import { IDENTITY_CONFIG, resolveUserId } from '@/config/identity';
import { toast } from 'react-toastify';
import { AppShell } from '@/app/component/AppShell';
import { AppToastContainer } from '@/app/component/AppToastContainer';
import { EmptyState, Skeleton } from '@/components/ui/primitives';
import { ConfirmDialog, buildRollbackDescription, useConfirm } from '@/components/ui/confirm-dialog';

type Trait = { id: string; traitName: string; traitValue: number; confidence: number; evidenceCount: number };
type EvolutionLog = { id: string; changedField: string | null; reason: string | null; confidenceDelta: number | null; createdAt: string };
type AdaptiveProfile = { uiDensity: string; preferredMode: string | null; preferredOutputLength: string | null; preferredNavigationStyle: string | null };
type PersonaProfile = { displayName?: string | null; confidenceScore?: number; communicationStyle?: unknown; writingStyle?: unknown; decisionStyle?: unknown };

const STYLE_LABEL: Record<string, string> = {
  communicationStyle: 'Communication',
  writingStyle: 'Writing',
  decisionStyle: 'Decision-making',
};

/** Human-readable label for a camelCase key: "toneWarmth" -> "Tone warmth". */
function humanize(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** Accessible 0-1 progress bar with a text name for assistive tech. */
function Meter({ label, value, className = 'h-1.5' }: { label: string; value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={`${className} overflow-hidden rounded-full bg-bg-tertiary`}
    >
      <div className={`${className} rounded-full bg-text-primary transition-all motion-reduce:transition-none`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Renders an arbitrary style-profile value as readable UI instead of a raw
 *  JSON dump — was the reason /persona read like a debug page. Numbers in
 *  [0,1] render as a labeled bar (these are style scores), strings render as
 *  prose, arrays as chips, nested objects recurse one level with indent. */
function StyleValue({ value, depth = 0, label = 'Score' }: { value: unknown; depth?: number; label?: string }) {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') {
    if (value >= 0 && value <= 1) {
      return (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Meter label={label} value={value} className="h-1" />
          </div>
          <span className="text-xs font-semibold text-text-secondary w-9 text-right tabular-nums">{Math.round(value * 100)}%</span>
        </div>
      );
    }
    return <span className="text-sm text-text-primary">{value}</span>;
  }

  if (typeof value === 'string') {
    return <p className="text-sm text-text-secondary leading-snug">{value}</p>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((v, i) => (
          <span key={i} className="text-xs font-medium px-2 py-0.5 rounded-full bg-bg-primary border border-border-secondary text-text-secondary">
            {typeof v === 'string' ? v : JSON.stringify(v)}
          </span>
        ))}
      </div>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== null && v !== undefined && v !== '');
    if (entries.length === 0) return null;
    return (
      <div className={depth > 0 ? 'space-y-2 pl-3 border-l border-border-secondary' : 'space-y-2'}>
        {entries.map(([k, v]) => (
          <div key={k}>
            <p className="text-xs text-text-secondary mb-0.5">{humanize(k)}</p>
            <StyleValue value={v} depth={depth + 1} label={humanize(k)} />
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-sm text-text-primary">{String(value)}</span>;
}

export default function PersonaIntelligencePage() {
  const [profile, setProfile] = useState<PersonaProfile | null>(null);
  const [traits, setTraits] = useState<Trait[]>([]);
  const [adaptive, setAdaptive] = useState<AdaptiveProfile | null>(null);
  const [timeline, setTimeline] = useState<EvolutionLog[]>([]);
  const [feedbackType, setFeedbackType] = useState<'accepted' | 'rejected' | 'ignored'>('accepted');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Which part of the page last triggered an action, so its status shows next to the control.
  const [origin, setOrigin] = useState<'top' | 'adaptive' | 'feedback'>('top');
  const [saving, setSaving] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const rollbackConfirm = useConfirm<{ logId: string; field: string; createdAt: string }>();

  useEffect(() => {
    const { userId: resolved } = resolveUserId();
    if (resolved) setUserId(resolved);
    else {
      setLoadError('Could not determine which user to load.');
      setLoading(false);
    }
  }, []);

  const fetchData = useCallback(async (uid: string) => {
    if (!uid) return;
    try {
      setLoadError(null);
      let unauthorized = false;
      const getJson = (path: string) =>
        fetch(path, { signal: AbortSignal.timeout(30_000) }).then((r) => {
          if (r.status === 401) unauthorized = true;
          if (!r.ok) throw new Error(String(r.status));
          return r.json();
        });
      // Each part loads on its own so one failing endpoint does not blank the page.
      const [p, t, a, d] = await Promise.allSettled([
        getJson('/api/persona/profile'),
        getJson('/api/persona/traits'),
        getJson('/api/persona/adaptive-ui'),
        getJson('/api/persona/drift'),
      ]);
      if (p.status === 'fulfilled') setProfile(p.value);
      if (t.status === 'fulfilled') setTraits(Array.isArray(t.value) ? t.value : []);
      if (a.status === 'fulfilled') setAdaptive(a.value);
      if (d.status === 'fulfilled') setTimeline(Array.isArray(d.value?.timeline) ? d.value.timeline : []);
      const failedCount = [p, t, a, d].filter((x) => x.status === 'rejected').length;
      if (failedCount > 0) {
        setLoadError(
          unauthorized
            ? 'Your session has ended. Sign in again to load your persona.'
            : failedCount === 4
              ? 'Could not load your persona. Check your connection, then try again.'
              : 'Some persona data could not be loaded. Try again to refresh it.',
        );
      }
    } catch {
      setLoadError('Could not load your persona. Check your connection, then try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Feedback from controls low on the page would otherwise appear off-screen in the header.
  useEffect(() => {
    if (notice) toast.success(notice);
  }, [notice]);
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    if (userId) fetchData(userId);
  }, [userId, fetchData]);

  async function rebuildPersona() {
    if (rebuilding) return;
    setRebuilding(true);
    setOrigin('top');
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/persona/rebuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, useProfileSource: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.reason === 'ai_contamination_detected'
            ? 'Rebuild blocked: profile text appears AI-generated.'
            : data.reason ?? data.error ?? 'Rebuild failed. Try again in a moment.',
        );
        return;
      }
      setNotice('Persona regenerated from your profile.');
      await fetchData(userId);
    } catch {
      setError('Persona rebuild failed. Check your connection and try again.');
    } finally {
      setRebuilding(false);
    }
  }

  const ROLLBACK_FIELDS = ['communicationStyle', 'writingStyle', 'decisionStyle'];

  async function rollbackField(logId: string, field: string) {
    if (!ROLLBACK_FIELDS.includes(field)) return;
    setOrigin('top');
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/persona/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, toLogId: logId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(res.status === 401 ? 'Your session has ended. Sign in again, then retry.' : data.error ?? 'Rollback failed. Try again.');
        return;
      }
      setNotice('Rolled back to the earlier value.');
      await fetchData(userId);
    } catch {
      setError('Rollback failed. Check your connection and try again.');
    } finally {
      setSaving(false);
      rollbackConfirm.close();
    }
  }

  async function sendFeedback() {
    setOrigin('feedback');
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/persona/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, feedbackType, targetType: 'persona' }),
      });
      if (!res.ok) throw new Error(`Feedback was not saved (${res.status}). Try again.`);
      setNotice('Thanks, your feedback was saved.');
      await fetchData(userId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Feedback was not saved. Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function updateAdaptive(field: keyof AdaptiveProfile, value: string) {
    setOrigin('adaptive');
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/persona/adaptive-ui', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error(`Update failed (${res.status}). Try again.`);
      setNotice('Interface preference saved.');
      await fetchData(userId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed. Try again.');
    } finally {
      setSaving(false);
    }
  }

  function statusBlock(at: 'top' | 'adaptive' | 'feedback') {
    return (
      <div aria-live="polite" className="space-y-1">
        {origin === at && notice ? <p role="status" className="text-sm text-success">{notice}</p> : null}
        {origin === at && error ? <p role="alert" className="break-words text-sm text-danger">{error}</p> : null}
      </div>
    );
  }

  if (loading) {
    return (
      <AppShell>
        <div className="w-full max-w-3xl mx-auto space-y-4">
          <h1 className="sr-only">Persona</h1>
          <div role="status" aria-label="Loading persona" className="space-y-4">
            <Skeleton className="h-8 w-40 motion-reduce:animate-none" />
            <Skeleton className="h-40 w-full motion-reduce:animate-none" />
            <Skeleton className="h-40 w-full motion-reduce:animate-none" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (loadError && !profile && !adaptive && traits.length === 0 && timeline.length === 0) {
    return (
      <AppShell>
        <div className="w-full min-h-[50vh] flex items-center justify-center px-4">
          <div className="text-center space-y-3 max-w-sm">
            <h1 className="sr-only">Persona</h1>
            <p role="alert" className="text-sm text-danger">{loadError}</p>
            <p className="text-xs text-text-secondary">Your persona data could not be reached. Check your connection or sign in again, then retry.</p>
            {userId && <button type="button" onClick={() => { setLoading(true); fetchData(userId); }} className="min-h-11 px-5 rounded-xl bg-text-primary text-bg-primary text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Retry loading persona</button>}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <AppToastContainer position="top-center" />
      <header className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-text-primary">Persona</h1>
          <p className="text-sm text-text-secondary">How your digital twin writes, decides and changes over time. Review it, then regenerate when your writing has moved on.</p>
        </div>
        <button
          type="button"
          onClick={rebuildPersona}
          disabled={rebuilding || saving}
          aria-busy={rebuilding}
          className="min-h-12 w-full sm:w-auto px-5 rounded-xl bg-text-primary text-bg-primary text-sm font-semibold transition-colors hover:bg-text-secondary disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {rebuilding ? 'Regenerating…' : 'Regenerate from my profile'}
        </button>
        {statusBlock('top')}
        {loadError && (
          <div role="alert" className="flex flex-wrap items-center gap-3">
            <p className="min-w-0 break-words text-sm text-danger">{loadError}</p>
            <button
              type="button"
              onClick={() => { setLoading(true); void fetchData(userId); }}
              className="min-h-11 px-4 rounded-xl border border-border-primary text-sm font-medium text-text-primary hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Try again
            </button>
          </div>
        )}
      </header>

      {/* Communication profile */}
      <section className="glass-panel rounded-3xl border border-border-secondary p-5 space-y-3">
        <h2 className="text-base font-semibold text-text-primary">Communication profile</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm">Confidence</span>
          <span className="text-sm font-semibold tabular-nums">
            {typeof profile?.confidenceScore === 'number' ? `${Math.round(profile.confidenceScore * 100)}%` : 'Not measured yet'}
          </span>
        </div>
        {typeof profile?.confidenceScore === 'number' && <Meter label="Persona confidence" value={profile.confidenceScore} />}
        <div className="grid grid-cols-1 gap-3">
          {(['communicationStyle', 'writingStyle', 'decisionStyle'] as const).map((key) => {
            const val = profile?.[key];
            const hasContent = val && typeof val === 'object' && Object.keys(val).length > 0;
            return (
              <div key={key} className="bg-bg-secondary rounded-xl p-3">
                <h3 className="text-xs font-semibold text-text-secondary mb-2">{STYLE_LABEL[key]}</h3>
                {hasContent ? <StyleValue value={val} label={STYLE_LABEL[key]} /> : <p className="text-sm text-text-secondary">Not enough signal yet.</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Behavioral traits */}
      <section className="glass-panel rounded-3xl border border-border-secondary p-5 space-y-3">
        <h2 className="text-base font-semibold text-text-primary">Behavioral traits</h2>
        {traits.length === 0 ? (
          <EmptyState
            title="No traits yet"
            hint="Traits appear once enough of your writing and decisions have been analysed. Regenerate your persona to start."
          />
        ) : (
          <ul className="space-y-3">
            {[...traits].sort((a, b) => b.traitValue - a.traitValue).map((t) => (
              <li key={t.id} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-text-primary">{humanize(t.traitName)}</span>
                  <span className="font-semibold tabular-nums">{Math.round(t.traitValue * 100)}%</span>
                </div>
                <Meter label={humanize(t.traitName)} value={t.traitValue} />
                <p className="text-xs text-text-secondary">
                  {Math.round(t.confidence * 100)}% sure, based on {t.evidenceCount} {t.evidenceCount === 1 ? 'example' : 'examples'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Evolution timeline */}
      <section className="glass-panel rounded-3xl border border-border-secondary p-5 space-y-3">
        <h2 className="text-base font-semibold text-text-primary">Evolution timeline</h2>
        {timeline.length === 0 ? (
          <EmptyState title="No changes yet" hint="When your persona changes, each change is listed here and can be rolled back." />
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto pr-1" tabIndex={0} aria-label="Evolution timeline entries">
            {timeline.map((log) => (
              <li key={log.id} className="flex items-start justify-between bg-bg-secondary rounded-xl p-3 gap-3">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">{log.changedField ? (STYLE_LABEL[log.changedField] ?? humanize(log.changedField)) : 'General'}</p>
                  <p className="text-xs text-text-secondary">{log.reason || 'No reason recorded'}</p>
                  {log.changedField && ROLLBACK_FIELDS.includes(log.changedField) && log.reason !== 'rollback' && (
                    <button
                      type="button"
                      onClick={() => rollbackConfirm.ask({ logId: log.id, field: log.changedField!, createdAt: log.createdAt })}
                      disabled={saving}
                      aria-label={`Roll back ${(STYLE_LABEL[log.changedField!] ?? humanize(log.changedField!)).toLowerCase()} change`}
                      className="inline-flex min-h-11 items-center -ml-2 px-2 rounded-lg text-sm font-semibold text-text-primary underline underline-offset-4 decoration-accent hover:bg-bg-tertiary disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      Roll back
                    </button>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs font-semibold tabular-nums ${(log.confidenceDelta || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                    <span className="sr-only">Confidence change </span>
                    {(log.confidenceDelta || 0) >= 0 ? '+' : '−'}{Math.abs(Math.round((log.confidenceDelta || 0) * 100))}%
                  </span>
                  <p className="text-xs text-text-secondary">{log.createdAt ? new Date(log.createdAt).toLocaleDateString() : ''}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Adaptive UX Settings */}
      <section className="glass-panel rounded-3xl border border-border-secondary p-5 space-y-3">
        <h2 className="text-base font-semibold text-text-primary">Adaptive interface</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'UI density', field: 'uiDensity' as const, options: ['minimal', 'dense', 'comfortable'] },
            { label: 'Output length', field: 'preferredOutputLength' as const, options: ['short', 'medium', 'long'] },
            { label: 'Navigation', field: 'preferredNavigationStyle' as const, options: ['single-primary-action', 'tabbed', 'drawer'] },
            { label: 'Mode', field: 'preferredMode' as const, options: ['operator', 'founder', 'architect'] },
          ].map((ctrl) => (
            <div key={ctrl.field} role="group" aria-labelledby={`adaptive-${ctrl.field}`} className="space-y-1">
              <p id={`adaptive-${ctrl.field}`} className="text-xs font-medium text-text-secondary">{ctrl.label}</p>
              <div className="flex flex-wrap gap-2">
                {ctrl.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    aria-pressed={adaptive?.[ctrl.field] === opt}
                    disabled={saving}
                    
                    onClick={() => updateAdaptive(ctrl.field, opt)}
                    className={`min-h-11 px-4 rounded-lg border text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${adaptive?.[ctrl.field] === opt ? 'bg-text-primary text-bg-primary border-text-primary' : 'border-border-secondary text-text-primary hover:bg-bg-secondary'} disabled:opacity-50`}
                  >
                    {opt.replace(/-/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {statusBlock('adaptive')}
      </section>

      {/* Feedback */}
      <section className="glass-panel rounded-3xl border border-border-secondary p-5 space-y-3">
        <h2 className="text-base font-semibold text-text-primary">Does this persona sound like you?</h2>
        <div role="group" aria-label="Feedback type" className="flex gap-2">
          {(['accepted', 'rejected', 'ignored'] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={feedbackType === t}
              
              onClick={() => setFeedbackType(t)}
              className={`flex-1 min-h-11 px-3 rounded-xl border text-sm capitalize font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${feedbackType === t ? 'bg-text-primary text-bg-primary border-text-primary' : 'border-border-secondary text-text-primary hover:bg-bg-secondary'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={sendFeedback}
          disabled={saving}
          className="w-full min-h-11 px-4 rounded-xl bg-text-primary text-bg-primary text-sm font-semibold hover:bg-text-secondary disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {saving ? 'Saving…' : 'Send feedback'}
        </button>
        {statusBlock('feedback')}
      </section>
    </div>
      <ConfirmDialog
        open={rollbackConfirm.open}
        title="Roll back this change?"
        description={
          rollbackConfirm.pending
            ? buildRollbackDescription(
                STYLE_LABEL[rollbackConfirm.pending.field] ?? humanize(rollbackConfirm.pending.field),
                rollbackConfirm.pending.createdAt ? new Date(rollbackConfirm.pending.createdAt).toLocaleDateString() : null,
              )
            : ''
        }
        confirmLabel="Roll back"
        cancelLabel="Keep current value"
        tone="danger"
        busy={saving}
        onConfirm={() => {
          if (rollbackConfirm.pending) void rollbackField(rollbackConfirm.pending.logId, rollbackConfirm.pending.field);
        }}
        onCancel={rollbackConfirm.close}
      />
    </AppShell>
  );
}
