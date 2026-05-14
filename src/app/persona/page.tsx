'use client';

import { useEffect, useState } from 'react';

type Trait = { id: string; traitName: string; traitValue: number; confidence: number };

export default function PersonaIntelligencePage() {
  const [profile, setProfile] = useState<any>(null);
  const [traits, setTraits] = useState<Trait[]>([]);
  const [adaptive, setAdaptive] = useState<any>(null);
  const [feedbackType, setFeedbackType] = useState<'accepted' | 'rejected' | 'ignored'>('accepted');

  useEffect(() => {
    Promise.all([
      fetch('/api/persona/profile?userId=system_user').then((r) => r.json()),
      fetch('/api/persona/traits?userId=system_user').then((r) => r.json()),
      fetch('/api/persona/adaptive-ui?userId=system_user').then((r) => r.json()),
    ]).then(([p, t, a]) => {
      setProfile(p);
      setTraits(Array.isArray(t) ? t : []);
      setAdaptive(a);
    });
  }, []);

  async function sendFeedback() {
    await fetch('/api/persona/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'system_user', feedbackType, targetType: 'persona' }),
    });
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-xl font-black uppercase italic">Persona Intelligence</h1>

      <section className="glass-panel rounded-3xl border border-border-secondary p-5 space-y-2">
        <h2 className="text-xs font-black uppercase tracking-widest text-text-tertiary">Communication Profile</h2>
        <p className="text-sm">Confidence: {Math.round((profile?.confidenceScore ?? 0.5) * 100)}%</p>
        <pre className="text-xs overflow-auto bg-secondary/40 rounded-xl p-3">{JSON.stringify(profile?.communicationStyle || {}, null, 2)}</pre>
      </section>

      <section className="glass-panel rounded-3xl border border-border-secondary p-5 space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-text-tertiary">Behavioral Traits</h2>
        {traits.length === 0 ? <p className="text-sm text-text-tertiary">No traits yet.</p> : traits.map((t) => (
          <div key={t.id} className="space-y-1">
            <div className="flex justify-between text-sm"><span>{t.traitName}</span><span>{Math.round(t.traitValue * 100)}%</span></div>
            <div className="h-1.5 bg-secondary rounded-full"><div className="h-1.5 bg-text-primary rounded-full" style={{ width: `${t.traitValue * 100}%` }} /></div>
          </div>
        ))}
      </section>

      <section className="glass-panel rounded-3xl border border-border-secondary p-5 space-y-2">
        <h2 className="text-xs font-black uppercase tracking-widest text-text-tertiary">Adaptive UX Settings</h2>
        <p className="text-sm">UI density: {adaptive?.uiDensity || 'minimal'}</p>
        <p className="text-sm">Preferred output length: {adaptive?.preferredOutputLength || 'short'}</p>
        <p className="text-sm">Navigation style: {adaptive?.preferredNavigationStyle || 'single-primary-action'}</p>
      </section>

      <section className="glass-panel rounded-3xl border border-border-secondary p-5 space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-text-tertiary">Feedback</h2>
        <div className="flex gap-2">
          {(['accepted', 'rejected', 'ignored'] as const).map((t) => (
            <button key={t} onClick={() => setFeedbackType(t)} className={`px-3 py-2 rounded-xl border text-xs uppercase ${feedbackType === t ? 'bg-text-primary text-bg-primary' : ''}`}>{t}</button>
          ))}
        </div>
        <button onClick={sendFeedback} className="px-4 py-2 rounded-xl bg-text-primary text-bg-primary text-xs font-bold uppercase">Save Feedback</button>
      </section>
    </div>
  );
}
