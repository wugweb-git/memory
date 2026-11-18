'use client';

import { useState } from 'react';
import { Zap, TrendingDown, Compass } from 'lucide-react';
import { postJson, currentUserId, Intent, Card, PrimaryButton, ErrorBox, SkeletonCard, Meter, FeedbackBar, Eyebrow } from './shared';

type Mode = 'architect' | 'founder' | 'operator';

const PRIORITY_STYLE = {
  high: 'bg-danger/10 text-danger border-danger/30',
  medium: 'bg-warning/10 text-warning border-warning/30',
  low: 'bg-secondary text-text-tertiary border-border-secondary',
} as const;

function parsePriority(p: string): { level: keyof typeof PRIORITY_STYLE; text: string } {
  const m = /^(high|medium|low)\s*:\s*/i.exec(p);
  const level = (m ? m[1].toLowerCase() : 'low') as keyof typeof PRIORITY_STYLE;
  return { level, text: m ? p.slice(m[0].length) : p };
}

export const DecideTab: React.FC<{ mode: Mode }> = ({ mode }) => {
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const data = await postJson('/api/cognitive/decide', {
        user_id: currentUserId(),
        mode,
        external_input: context.trim() || undefined,
      });
      if (data.status === 'insufficient_data') {
        setOutput(null);
        setError(data.message || 'Not enough data in memory yet to make a decision.');
      } else {
        setOutput(data);
      }
    } catch (e: any) {
      setOutput(null);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const recs: string[] = output?.recommendations ?? [];
  const [top, ...rest] = recs;

  return (
    <div className="space-y-5">
      <Intent title="What should I do next?">
        Reads your memory and signals, then gives one direction to act on today.
      </Intent>

      <div className="space-y-2">
        <label htmlFor="decide-context" className="text-xs font-medium text-text-secondary">
          Anything to factor in? <span className="text-text-disabled">(optional)</span>
        </label>
        <input
          id="decide-context"
          value={context}
          onChange={e => setContext(e.target.value)}
          placeholder="e.g. I have 2 hours free and a client call at 4"
          className="w-full min-h-12 rounded-xl border border-border-secondary bg-bg-elevated px-4 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent"
        />
      </div>

      <PrimaryButton onClick={run} loading={loading} loadingLabel="Thinking it through…" icon={<Zap size={16} />}>
        Get direction
      </PrimaryButton>

      {error ? <ErrorBox message={error} onRetry={run} /> : null}
      {loading ? <SkeletonCard label="Synthesising your next move" /> : null}

      {!loading && !output && !error ? (
        <p className="text-xs text-text-tertiary text-center">Your direction will appear here.</p>
      ) : null}

      {!loading && output ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 space-y-4">
            <div className="flex items-center gap-2 text-accent">
              <Compass size={16} />
              <Eyebrow>Your direction</Eyebrow>
            </div>
            <p className="text-lg font-semibold text-text-primary leading-snug">
              {top ?? 'No clear recommendation this time.'}
            </p>
            {typeof output.confidence === 'number' ? <Meter label="Confidence" value={output.confidence} /> : null}
          </div>

          {rest.length > 0 ? (
            <Card eyebrow="Then">
              <ol className="space-y-3">
                {rest.map((r, i) => (
                  <li key={i} className="flex gap-3 text-sm text-text-secondary">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-secondary text-2xs font-semibold text-text-tertiary flex items-center justify-center">{i + 2}</span>
                    <span className="flex-1">{r}</span>
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}

          {output.priorities?.length > 0 ? (
            <Card eyebrow="Priorities">
              <ul className="space-y-2.5">
                {output.priorities.map((p: string, i: number) => {
                  const { level, text } = parsePriority(p);
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full border shrink-0 mt-0.5 ${PRIORITY_STYLE[level]}`}>
                        {level === 'medium' ? 'Medium' : level === 'high' ? 'High' : 'Low'}
                      </span>
                      <span className="text-sm text-text-secondary">{text}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}

          {output.gaps?.length > 0 ? (
            <Card eyebrow="Gaps noticed" tone="warning">
              <ul className="space-y-2">
                {output.gaps.map((g: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-text-secondary">
                    <TrendingDown size={14} className="text-warning mt-0.5 shrink-0" /> {g}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {output.reasoning ? (
            <details className="rounded-2xl border border-border-secondary px-4 py-3">
              <summary className="text-xs font-semibold text-text-secondary cursor-pointer min-h-8 flex items-center">Why this direction</summary>
              <p className="text-sm text-text-tertiary mt-2">{output.reasoning}</p>
            </details>
          ) : null}

          {output.decision_id ? <FeedbackBar decisionId={output.decision_id} /> : null}
        </div>
      ) : null}
    </div>
  );
};
