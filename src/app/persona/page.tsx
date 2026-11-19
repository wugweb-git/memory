'use client';

import { useEffect, useState, useCallback } from 'react';
import { IDENTITY_CONFIG, resolveUserId } from '@/config/identity';
import { AppShell } from '@/app/component/AppShell';
import { EmptyState, Skeleton } from '@/components/ui/primitives';

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
          <span className="text-2xs font-semibold text-text-secondary w-9 text-right tabular-nums">{Math.round(value * 100)}%</span>
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
          <span key={i} className="text-2xs font-medium px-2 py-0.5 rounded-full bg-bg-primary border border-border-secondary text-text-secondary">
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
            <p className="text-2xs text-text-secondary mb-0.5">{humanize(k)}</p>
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
  const [saving, setSaving] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [userId, setUserId] = useState<string>('');

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
      const getJson = (path: string) =>
        fetch(path).then((r) => {
          if (!r.ok) throw new Error(`${path} failed (${r.status})`);
          return r.json();
        });
      const [p, t, a, d] = await Promise.all([
        getJson('/api/persona/profile'),
        getJson('/api/persona/traits'),
        getJson('/api/persona/adaptive-ui'),
        getJson('/api/persona/drift'),
      ]);
      setProfile(p);
      setTraits(Array.isArray(t) ? t : []);
      setAdaptive(a);
      setTimeline(Array.isArray(d?.timeline) ? d.timeline : []);
    } catch (e) {
      setLoadError(e instanceof Error ? `Failed to load persona data: ${e.message}` : 'Failed to load persona data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) fetchData(userId);
  }, [userId, fetchData]);

  async function rebuildPersona() {
    if (rebuilding) return;
    setRebuilding(true);
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
    if (!confirm(`Roll back ${(STYLE_LABEL[field] ?? humanize(field)).toLowerCase()} to how it was before this change? The change stays in the timeline.`)) return;
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
        setError(data.error ?? 'Rollback failed');
        return;
      }
      setNotice('Rolled back to the earlier value.');
      await fetchData(userId);
    } catch {
      setError('Rollback failed. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function sendFeedback() {
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
      setError(e instanceof Error ? e.message : 'Feedback failed');
    } finally {
      setSaving(false);
    }
  }

  async function updateAdaptive(field: keyof AdaptiveProfile, value: string) {
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
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="w-full max-w-3xl mx-auto px-4 py-8 space-y-4">
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

  if (loadError && !profile) {
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
    <div className="w-full max-w-3xl mx-auto px-4 py-8 space-y-8">
      <header className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-text-primary">Persona</h1>
          <p className="text-sm text-text-secondary">How your digital twin writes, decides and changes over time. Review it, then regenerate when your writing has moved on.</p>
        </div>
        <button
          type="button"
          onClick={rebuildPersona}
          disabled={rebuilding || saving}
          aria-busy={rebuilding}
          className="min-h-11 px-5 rounded-xl bg-text-primary text-bg-primary text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {rebuilding ? 'Regenerating…' : 'Regenerate from my profile'}
        </button>
        <div aria-live="polite" className="space-y-1">
          {notice && <p role="status" className="text-sm text-success">{notice}</p>}
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {loadError && <p role="alert" className="text-sm text-danger">{loadError}</p>}
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
                      onClick={() => rollbackField(log.id, log.changedField!)}
                      disabled={saving}
                      aria-label={`Roll back ${(STYLE_LABEL[log.changedField!] ?? humanize(log.changedField!)).toLowerCase()} change`}
                      className="inline-flex min-h-11 items-center -ml-2 px-2 rounded-lg text-sm font-semibold text-accent hover:bg-bg-tertiary disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
                    className={`min-h-11 px-3 rounded-lg border text-xs font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${adaptive?.[ctrl.field] === opt ? 'bg-text-primary text-bg-primary border-text-primary' : 'border-border-secondary text-text-primary hover:bg-bg-secondary'} disabled:opacity-50`}
                  >
                    {opt.replace(/-/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
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
          className="w-full min-h-11 px-4 rounded-xl bg-text-primary text-bg-primary text-sm font-semibold hover:bg-accent disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {saving ? 'Saving…' : 'Send feedback'}
        </button>
      </section>
    </div>
    </AppShell>
  );
}
