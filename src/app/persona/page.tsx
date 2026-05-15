'use client';

import { useEffect, useState, useCallback } from 'react';

type Trait = { id: string; traitName: string; traitValue: number; confidence: number; evidenceCount: number };
type EvolutionLog = { id: string; changedField: string | null; reason: string | null; confidenceDelta: number | null; createdAt: string };
type AdaptiveProfile = { uiDensity: string; preferredMode: string | null; preferredOutputLength: string | null; preferredNavigationStyle: string | null };
type PersonaProfile = { displayName?: string | null; confidenceScore?: number; communicationStyle?: unknown; writingStyle?: unknown; decisionStyle?: unknown };

export default function PersonaIntelligencePage() {
  const [profile, setProfile] = useState<PersonaProfile | null>(null);
  const [traits, setTraits] = useState<Trait[]>([]);
  const [adaptive, setAdaptive] = useState<AdaptiveProfile | null>(null);
  const [timeline, setTimeline] = useState<EvolutionLog[]>([]);
  const [feedbackType, setFeedbackType] = useState<'accepted' | 'rejected' | 'ignored'>('accepted');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const userId = 'system_user';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [p, t, a, d] = await Promise.all([
        fetch(`/api/persona/profile?userId=${userId}`).then((r) => r.json()),
        fetch(`/api/persona/traits?userId=${userId}`).then((r) => r.json()),
        fetch(`/api/persona/adaptive-ui?userId=${userId}`).then((r) => r.json()),
        fetch(`/api/persona/drift?userId=${userId}`).then((r) => r.json()),
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
    fetchData();
  }, [fetchData]);

  async function sendFeedback() {
    setSaving(true);
    try {
      await fetch('/api/persona/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, feedbackType, targetType: 'persona' }),
      });
      await fetchData();
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
      await fetchData();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center px-4">
        <p className="text-sm uppercase tracking-widest text-text-tertiary animate-pulse">Loading Digital Twin…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <p className="text-sm text-red-500">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 rounded-xl bg-text-primary text-bg-primary text-xs font-bold uppercase">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 space-y-8">
      <header className="space-y-1">
        <h1 className="text-xl font-black uppercase italic">Persona Intelligence</h1>
        <p className="text-xs text-text-tertiary uppercase tracking-widest">Layer 4 — Digital Twin Evolution</p>
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
        <div className="grid grid-cols-1 gap-2">
          {(['communicationStyle', 'writingStyle', 'decisionStyle'] as const).map((key) => (
            <div key={key} className="bg-secondary/40 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-widest text-text-tertiary mb-1">{key}</p>
              <pre className="text-[10px] overflow-auto">{JSON.stringify((profile as any)?.[key] || {}, null, 2)}</pre>
            </div>
          ))}
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
              <p className="text-[10px] text-text-tertiary">Confidence {Math.round(t.confidence * 100)}% · Evidence {t.evidenceCount}</p>
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
              <div key={log.id} className="flex items-start justify-between bg-secondary/40 rounded-xl p-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold">{log.changedField || 'general'}</p>
                  <p className="text-[10px] text-text-tertiary">{log.reason || 'no reason'}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold ${(log.confidenceDelta || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {(log.confidenceDelta || 0) >= 0 ? '+' : ''}{Math.round((log.confidenceDelta || 0) * 100)}%
                  </span>
                  <p className="text-[10px] text-text-tertiary">{new Date(log.createdAt).toLocaleDateString()}</p>
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
              <p className="text-[10px] uppercase tracking-widest text-text-tertiary">{ctrl.label}</p>
              <div className="flex flex-wrap gap-1">
                {ctrl.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => updateAdaptive(ctrl.field, opt)}
                    className={`px-2 py-1 rounded-lg border text-[10px] uppercase ${(adaptive as any)?.[ctrl.field] === opt ? 'bg-text-primary text-bg-primary border-text-primary' : 'border-border-secondary'}`}
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
  );
}
