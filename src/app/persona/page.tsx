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

/** Renders an arbitrary style-profile value as readable UI instead of a raw
 *  JSON dump — was the reason /persona read like a debug page. Numbers in
 *  [0,1] render as a labeled bar (these are style scores), strings render as
 *  prose, arrays as chips, nested objects recurse one level with indent. */
function StyleValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') {
    if (value >= 0 && value <= 1) {
      return (
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 bg-secondary rounded-full overflow-hidden">
            <div className="h-1 bg-text-primary rounded-full" style={{ width: `${value * 100}%` }} />
          </div>
          <span className="text-2xs font-bold text-text-tertiary w-9 text-right">{Math.round(value * 100)}%</span>
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
          <span key={i} className="text-2xs font-medium px-2 py-0.5 rounded-full bg-bg-primary border border-border-secondary text-text-tertiary">
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
            <p className="text-2xs text-text-tertiary mb-0.5">{humanize(k)}</p>
            <StyleValue value={v} depth={depth + 1} />
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
            : data.reason ?? data.error ?? 'Rebuild failed',
        );
        return;
      }
      setNotice('Persona regenerated.');
      await fetchData(userId);
    } catch {
      setError('Persona rebuild failed');
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
      setNotice('Rolled back.');
      await fetchData(userId);
    } catch {
      setError('Rollback failed');
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
      if (!res.ok) throw new Error(`Feedback failed (${res.status})`);
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
      if (!res.ok) throw new Error(`Update failed (${res.status})`);
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
        <div className="w-full max-w-3xl mx-auto px-4 py-8 space-y-4" role="status" aria-label="Loading persona">
          <Skeleton className="h-8 w-40 motion-reduce:animate-none" />
          <Skeleton className="h-40 w-full motion-reduce:animate-none" />
          <Skeleton className="h-40 w-full motion-reduce:animate-none" />
        </div>
      </AppShell>
    );
  }

  if (loadError && !profile) {
    return (
      <AppShell>
        <div className="w-full min-h-[50vh] flex items-center justify-center px-4">
          <div className="text-center space-y-3 max-w-sm">
            <p role="alert" className="text-sm text-danger">{loadError}</p>
            <p className="text-xs text-text-tertiary">Your persona data could not be reached. Check your connection or sign in again, then retry.</p>
            {userId && <button type="button" onClick={() => { setLoading(true); fetchData(userId); }} className="min-h-11 px-5 rounded-xl bg-text-primary text-bg-primary text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Try again</button>}
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
          <h1 className="text-xl font-semibold text-text-primary">Persona</h1>
          <p className="text-sm text-text-tertiary">How your digital twin writes, decides and changes over time. Review it, then regenerate when your writing has moved on.</p>
        </div>
        <button
          type="button"
          onClick={rebuildPersona}
          disabled={rebuilding || saving}
          className="min-h-11 px-5 rounded-xl bg-text-primary text-bg-primary text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {rebuilding ? 'Regenerating…' : 'Regenerate from my profile'}
        </button>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {loadError && <p role="alert" className="text-sm text-danger">{loadError}</p>}
        {notice && <p role="status" className="text-sm text-success">{notice}</p>}
      </header>

      {/* Communication profile */}
      <section className="glass-panel rounded-3xl border border-border-secondary p-5 space-y-3">
        <h2 className="text-sm font-semibold text-text-secondary">Communication profile</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm">Confidence</span>
          <span className="text-sm font-bold">{Math.round((profile?.confidenceScore ?? 0.5) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-1.5 bg-text-primary rounded-full transition-all" style={{ width: `${(profile?.confidenceScore ?? 0.5) * 100}%` }} />
        </div>
        <div className="grid grid-cols-1 gap-3">
          {(['communicationStyle', 'writingStyle', 'decisionStyle'] as const).map((key) => {
            const val = profile?.[key];
            const hasContent = val && typeof val === 'object' && Object.keys(val).length > 0;
            return (
              <div key={key} className="bg-secondary/40 rounded-xl p-3">
                <p className="text-2xs font-bold text-text-tertiary mb-2">{STYLE_LABEL[key]}</p>
                {hasContent ? <StyleValue value={val} /> : <p className="text-sm text-text-tertiary">Not enough signal yet.</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Behavioral traits */}
      <section className="glass-panel rounded-3xl border border-border-secondary p-5 space-y-3">
        <h2 className="text-sm font-semibold text-text-secondary">Behavioral traits</h2>
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
                  <span className="font-bold tabular-nums">{Math.round(t.traitValue * 100)}%</span>
                </div>
                <div
                  role="img"
                  aria-label={`${humanize(t.traitName)}: ${Math.round(t.traitValue * 100)} percent`}
                  className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden"
                >
                  <div className="h-1.5 bg-text-primary rounded-full transition-[width] motion-reduce:transition-none" style={{ width: `${t.traitValue * 100}%` }} />
                </div>
                <p className="text-xs text-text-tertiary">
                  {Math.round(t.confidence * 100)}% sure, based on {t.evidenceCount} {t.evidenceCount === 1 ? 'example' : 'examples'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Evolution timeline */}
      <section className="glass-panel rounded-3xl border border-border-secondary p-5 space-y-3">
        <h2 className="text-sm font-semibold text-text-secondary">Evolution timeline</h2>
        {timeline.length === 0 ? (
          <EmptyState title="No changes yet" hint="When your persona changes, each change is listed here and can be rolled back." />
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {timeline.map((log) => (
              <div key={log.id} className="flex items-start justify-between bg-secondary/40 rounded-xl p-3 gap-3">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">{log.changedField ? (STYLE_LABEL[log.changedField] ?? humanize(log.changedField)) : 'General'}</p>
                  <p className="text-xs text-text-tertiary">{log.reason || 'No reason recorded'}</p>
                  {log.changedField && ROLLBACK_FIELDS.includes(log.changedField) && log.reason !== 'rollback' && (
                    <button
                      onClick={() => rollbackField(log.id, log.changedField!)}
                      disabled={saving}
                      type="button"
                      aria-label={`Roll back ${STYLE_LABEL[log.changedField!] ?? log.changedField}`}
                      className="inline-flex min-h-11 items-center -ml-2 px-2 rounded-lg text-sm font-semibold text-accent hover:bg-bg-tertiary disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      Roll back
                    </button>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs font-bold ${(log.confidenceDelta || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                    {(log.confidenceDelta || 0) >= 0 ? '+' : ''}{Math.round((log.confidenceDelta || 0) * 100)}%
                  </span>
                  <p className="text-xs text-text-tertiary">{log.createdAt ? new Date(log.createdAt).toLocaleDateString() : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Adaptive UX Settings */}
      <section className="glass-panel rounded-3xl border border-border-secondary p-5 space-y-3">
        <h2 className="text-sm font-semibold text-text-secondary">Adaptive interface</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'UI density', field: 'uiDensity' as const, options: ['minimal', 'dense', 'comfortable'] },
            { label: 'Output length', field: 'preferredOutputLength' as const, options: ['short', 'medium', 'long'] },
            { label: 'Navigation', field: 'preferredNavigationStyle' as const, options: ['single-primary-action', 'tabbed', 'drawer'] },
            { label: 'Mode', field: 'preferredMode' as const, options: ['operator', 'founder', 'architect'] },
          ].map((ctrl) => (
            <div key={ctrl.field} className="space-y-1">
              <p className="text-xs font-medium text-text-secondary">{ctrl.label}</p>
              <div className="flex flex-wrap gap-1">
                {ctrl.options.map((opt) => (
                  <button
                    key={opt}
                    aria-pressed={adaptive?.[ctrl.field] === opt}
                    disabled={saving}
                    type="button"
                    onClick={() => updateAdaptive(ctrl.field, opt)}
                    className={`min-h-11 px-3 rounded-lg border text-xs font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${adaptive?.[ctrl.field] === opt ? 'bg-text-primary text-bg-primary border-text-primary' : 'border-border-secondary hover:bg-bg-secondary'} disabled:opacity-50`}
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
        <h2 className="text-sm font-semibold text-text-secondary">Does this persona sound like you?</h2>
        <div className="flex gap-2">
          {(['accepted', 'rejected', 'ignored'] as const).map((t) => (
            <button
              key={t}
              aria-pressed={feedbackType === t}
              type="button"
              onClick={() => setFeedbackType(t)}
              className={`flex-1 min-h-11 px-3 rounded-xl border text-sm capitalize font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${feedbackType === t ? 'bg-text-primary text-bg-primary border-text-primary' : 'border-border-secondary hover:bg-bg-secondary'}`}
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
