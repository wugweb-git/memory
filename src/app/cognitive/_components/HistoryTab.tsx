'use client';

import { useEffect, useState } from 'react';
import { History, ChevronDown, RefreshCw } from 'lucide-react';
import { currentUserId, Intent, ErrorBox, EmptyState, SkeletonCard, FeedbackBar } from './shared';

const FEEDBACK_DOT: Record<string, string> = {
  accepted: 'bg-success',
  rejected: 'bg-danger',
  ignored: 'bg-text-disabled',
};

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.round((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export const HistoryTab: React.FC = () => {
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  async function load() {
    setItems(null);
    setError(null);
    try {
      const res = await fetch('/api/cognitive/history');
      if (!res.ok) throw new Error(`Could not load history (${res.status})`);
      const d = await res.json();
      setItems(Array.isArray(d) ? d : []);
    } catch (e: any) {
      setError(e?.message || 'Could not load history');
    }
  }

  useEffect(() => { load(); }, []);

  const intent = <Intent title="What did I decide?">A timeline of every run, newest first. Open one to review it or leave feedback.</Intent>;

  if (error) return <div className="space-y-5">{intent}<ErrorBox message={error} onRetry={load} /></div>;

  return (
    <div className="space-y-5">
      {intent}

      {items === null ? <SkeletonCard label="Loading timeline" /> : null}

      {items && items.length === 0 ? (
        <EmptyState icon={<History size={28} strokeWidth={1.5} />} title="No runs yet" hint="Use Decide, Evaluate or Rank and each run will show up here." />
      ) : null}

      {items && items.length > 0 ? (
        <ol className="relative ml-2 border-l border-border-secondary space-y-5">
          {items.map((h, i) => {
            const isOpen = open === h.id;
            const out = h.outputJson || {};
            const recs: string[] = out.recommendations || [];
            const headline = recs[0] || out.verdict || out.summary || out.ranked?.[0]?.item || 'Decision record';
            const showDay = i === 0 || dayLabel(items[i - 1].createdAt) !== dayLabel(h.createdAt);
            const conf = typeof h.confidence === 'number' ? Math.round(h.confidence * 100) : null;
            return (
              <li key={h.id} className="pl-5 relative">
                <span className={`absolute -left-[6px] top-4 w-2.5 h-2.5 rounded-full ring-2 ring-bg-primary ${FEEDBACK_DOT[h.lastFeedback] ?? 'bg-accent'}`} />
                {showDay ? <p className="text-2xs font-semibold text-text-tertiary uppercase tracking-widest mb-2">{dayLabel(h.createdAt)}</p> : null}
                <div className="rounded-2xl border border-border-secondary bg-bg-elevated overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : h.id)}
                    aria-expanded={isOpen}
                    className="w-full min-h-14 px-4 py-3 flex items-center gap-3 text-left"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium text-text-primary truncate">{headline}</p>
                      <p className="text-xs text-text-tertiary">
                        {new Date(h.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        {' · '}{h.mode}
                        {conf !== null ? ` · ${conf}% confident` : ''}
                        {h.lastFeedback ? ` · ${h.lastFeedback}` : ''}
                      </p>
                    </div>
                    <ChevronDown size={16} className={`text-text-tertiary shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen ? (
                    <div className="px-4 pb-4 pt-3 space-y-3 border-t border-border-secondary">
                      {recs.length > 0 ? (
                        <ol className="space-y-1.5 list-decimal list-inside text-sm text-text-secondary">
                          {recs.map((r, k) => <li key={k}>{r}</li>)}
                        </ol>
                      ) : null}
                      {out.ranked?.length ? (
                        <ol className="space-y-1.5 list-decimal list-inside text-sm text-text-secondary">
                          {out.ranked.map((r: any, k: number) => <li key={k}>{r.item}</li>)}
                        </ol>
                      ) : null}
                      {out.reasoning ? <p className="text-xs text-text-tertiary">{out.reasoning}</p> : null}
                      <FeedbackBar decisionId={h.id} />
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}

      {items && items.length > 0 ? (
        <button type="button" onClick={load} className="w-full min-h-11 text-xs font-semibold text-text-secondary flex items-center justify-center gap-2">
          <RefreshCw size={13} /> Refresh
        </button>
      ) : null}
    </div>
  );
};
