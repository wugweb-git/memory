'use client';

import { useEffect, useState, useCallback } from 'react';
import { IDENTITY_CONFIG, resolveUserId } from '@/config/identity';
import { AppShell } from '@/app/component/AppShell';

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
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    const { userId: resolved } = resolveUserId();
    setUserId(resolved);
  }, []);

  const fetchData = useCallback(async (uid: string) => {
    if (!uid) return;
    try {
      setLoading(true);
      setError(null);
      const [p, t, a, d] = await Promise.all([
        fetch(`/api/persona/profile?userId=${uid}`).then((r) => r.json()),
        fetch(`/api/persona/traits?userId=${uid}`).then((r) => r.json()),
        fetch(`/api/persona/adaptive-ui?userId=${uid}`).then((r) => r.json()),
        fetch(`/api/persona/drift?userId=${uid}`).then((r) => r.json()),
      ]);
      setProfile(p);
      setTraits(Array.isArray(t) ? t : []);
      setAdaptive(a);
      setTimeline(Array.isArray(d?.timeline) ? d.timeline : []);
    } catch (e) {
      setError('Failed to load persona data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) fetchData(userId);
  }, [userId, fetchData]);

  async function rebuildPersona() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/persona/rebuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, useProfileSource: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.reason === 'ai_contamination_detected'
            ? 'Rebuild blocked: profile text appears AI-generated.'
            : data.reason ?? 'Rebuild failed',
        );
        return;
      }
      await fetchData(userId);
    } catch {
      setError('Persona rebuild failed');
    } finally {
      setSaving(false);
    }
  }

  const ROLLBACK_FIELDS = ['communicationStyle', 'writingStyle', 'decisionStyle'];

  async function rollbackField(logId: string, field: string) {
    if (!ROLLBACK_FIELDS.includes(field)) return;
    if (!confirm(`Roll back ${field} to its value before this change?`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/persona/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, toLogId: logId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Rollback failed');
        return;
      }
      await fetchData(userId);
    } catch {
      setError('Rollback failed');
    } finally {
      setSaving(false);
    }
  }

  async function sendFeedback() {
    setSaving(true);
    try {
      await fetch('/api/persona/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, feedbackType, targetType: 'persona' }),
      });
      await fetchData(userId);
    } finally {
      setSaving(false);
    }
  }

  async function updateAdaptive(field: keyof AdaptiveProfile, value: string) {
    setSaving(true);
    try {
      await fetch(`/api/persona/adaptive-ui?userId=${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      await fetchData(userId);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="w-full min-h-[50vh] flex items-center justify-center px-4">
          <p className="text-sm uppercase tracking-widest text-text-tertiary animate-pulse">Loading Digital Twin…</p>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="w-full min-h-[50vh] flex items-center justify-center px-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-red-500">{error}</p>
            <button onClick={() => fetchData(userId)} className="px-4 py-2 rounded-xl bg-text-primary text-bg-primary text-xs font-bold uppercase">Retry</button>
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
          <h1 className="text-xl font-black ">Persona Intelligence</h1>
          <p className="text-xs text-text-tertiary uppercase tracking-widest">Layer 4 — Digital Twin Evolution</p>
        </div>
        <button
          type="button"
          onClick={rebuildPersona}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-text-primary text-bg-primary text-xs font-bold uppercase disabled:opacity-50"
        >
          {saving ? 'Rebuilding…' : 'Regenerate with LLM'}
        </button>
      </header>

      {/* Communication Profile */}
      <section className="glass-panel rounded-3xl border border-border-secondary p-5 space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-text-tertiary">Communication Profile</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm">Confidence</span>
          <span className="text-sm font-bold">{Math.round((profile?.confidenceScore ?? 0.5) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-1.5 bg-text-primary rounded-full transition-all" style={{ width: `${(profile?.confidenceScore ?? 0.5) * 100}%` }} />
        </div>
        <div className="grid grid-cols-1 gap-3">
          {(['communicationStyle', 'writingStyle', 'decisionStyle'] as const).map((key) => {
            const val = (profile as any)?.[key];
            const hasContent = val && typeof val === 'object' && Object.keys(val).length > 0;
            return (
              <div key={key} className="bg-secondary/40 rounded-xl p-3">
                <p className="text-2xs font-bold uppercase tracking-widest text-text-tertiary mb-2">{STYLE_LABEL[key]}</p>
                {hasContent ? <StyleValue value={val} /> : <p className="text-sm text-text-tertiary">Not enough signal yet.</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Behavioral Traits */}
      <section className="glass-panel rounded-3xl border border-border-secondary p-5 space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-text-tertiary">Behavioral Traits</h2>
        {traits.length === 0 ? (
          <p className="text-sm text-text-tertiary">No traits yet.</p>
        ) : (
          traits.map((t) => (
            <div key={t.id} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{t.traitName}</span>
                <span className="font-bold">{Math.round(t.traitValue * 100)}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-1.5 bg-text-primary rounded-full transition-all" style={{ width: `${t.traitValue * 100}%` }} />
              </div>
              <p className="text-2xs text-text-tertiary">Confidence {Math.round(t.confidence * 100)}% · Evidence {t.evidenceCount}</p>
            </div>
          ))
        )}
      </section>

      {/* Evolution Timeline */}
      <section className="glass-panel rounded-3xl border border-border-secondary p-5 space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-text-tertiary">Evolution Timeline</h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-text-tertiary">No evolution logs yet.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {timeline.map((log) => (
              <div key={log.id} className="flex items-start justify-between bg-secondary/40 rounded-xl p-3 gap-3">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs font-bold">{log.changedField || 'general'}</p>
                  <p className="text-2xs text-text-tertiary">{log.reason || 'no reason'}</p>
                  {log.changedField && ROLLBACK_FIELDS.includes(log.changedField) && log.reason !== 'rollback' && (
                    <button
                      onClick={() => rollbackField(log.id, log.changedField!)}
                      disabled={saving}
                      className="text-2xs font-bold uppercase text-accent disabled:opacity-50"
                    >
                      Roll back
                    </button>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-2xs font-bold ${(log.confidenceDelta || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                    {(log.confidenceDelta || 0) >= 0 ? '+' : ''}{Math.round((log.confidenceDelta || 0) * 100)}%
                  </span>
                  <p className="text-2xs text-text-tertiary">{new Date(log.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Adaptive UX Settings */}
      <section className="glass-panel rounded-3xl border border-border-secondary p-5 space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-text-tertiary">Adaptive UX</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'UI Density', field: 'uiDensity' as const, options: ['minimal', 'dense', 'comfortable'] },
            { label: 'Output Length', field: 'preferredOutputLength' as const, options: ['short', 'medium', 'long'] },
            { label: 'Navigation', field: 'preferredNavigationStyle' as const, options: ['single-primary-action', 'tabbed', 'drawer'] },
            { label: 'Mode', field: 'preferredMode' as const, options: ['operator', 'founder', 'architect'] },
          ].map((ctrl) => (
            <div key={ctrl.field} className="space-y-1">
              <p className="text-2xs uppercase tracking-widest text-text-tertiary">{ctrl.label}</p>
              <div className="flex flex-wrap gap-1">
                {ctrl.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => updateAdaptive(ctrl.field, opt)}
                    className={`px-2 py-1 rounded-lg border text-2xs uppercase ${(adaptive as any)?.[ctrl.field] === opt ? 'bg-text-primary text-bg-primary border-text-primary' : 'border-border-secondary'}`}
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
        <h2 className="text-xs font-black uppercase tracking-widest text-text-tertiary">Feedback</h2>
        <div className="flex gap-2">
          {(['accepted', 'rejected', 'ignored'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFeedbackType(t)}
              className={`flex-1 px-3 py-2 rounded-xl border text-xs uppercase font-bold ${feedbackType === t ? 'bg-text-primary text-bg-primary border-text-primary' : 'border-border-secondary'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={sendFeedback}
          disabled={saving}
          className="w-full px-4 py-3 rounded-xl bg-text-primary text-bg-primary text-xs font-bold uppercase disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Feedback'}
        </button>
      </section>
    </div>
    </AppShell>
  );
}
