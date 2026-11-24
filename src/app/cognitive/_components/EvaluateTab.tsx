'use client';

import { useState } from 'react';
import { Target, Check, X, ListChecks, FileText } from 'lucide-react';
import { errorFlags, postJson, currentUserId, Intent, Card, PrimaryButton, ErrorBox, SkeletonCard, ScoreRing, Meter, toneForScore } from './shared';

type Mode = 'architect' | 'founder' | 'operator';
const MIN = 10;

const VERDICT_STYLE = {
  success: 'bg-success/10 text-success border-success/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  danger: 'bg-danger/10 text-danger border-danger/30',
} as const;

export const EvaluateTab: React.FC<{ mode: Mode }> = ({ mode }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [errFlags, setErrFlags] = useState({ limit: false, retryable: true });

  const len = input.trim().length;

  async function run() {
    if (len < MIN) return;
    setLoading(true);
    setError(null);
    setErrFlags({ limit: false, retryable: true });
    try {
      setResult(await postJson('/api/cognitive/evaluate', { user_id: currentUserId(), input_text: input, mode }));
    } catch (e: any) {
      setResult(null);
      setError(e.message);
      setErrFlags(errorFlags(e));
    } finally {
      setLoading(false);
    }
  }

  const fit = Number(result?.fit_score) || 0;
  const tone = toneForScore(fit);

  return (
    <div className="space-y-5">
      <Intent title="Is this worth my time?">
        Paste a job post, client brief or idea. It is scored against what your memory says you do best.
      </Intent>

      <div className="space-y-2">
        <label htmlFor="eval-input" className="text-sm font-medium text-text-secondary">Opportunity text</label>
        <textarea
          id="eval-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={7}
          aria-describedby="eval-help"
          placeholder="Paste the full description here…"
          className="w-full rounded-xl border border-border-secondary bg-bg-elevated px-4 py-3 text-md text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent resize-y"
        />
        <p id="eval-help" className="text-xs text-text-tertiary flex justify-between">
          <span aria-live="polite">{len < MIN ? `Add at least ${MIN} characters to evaluate` : 'Ready to evaluate'}</span>
          <span>{len} characters</span>
        </p>
      </div>

      <PrimaryButton onClick={run} disabled={len < MIN} loading={loading} loadingLabel="Scoring fit…" icon={<Target size={16} />}>
        Evaluate fit
      </PrimaryButton>

      {error ? <ErrorBox message={error} limit={errFlags.limit} onRetry={len >= MIN && errFlags.retryable ? run : undefined} /> : null}
      {loading ? <SkeletonCard label="Comparing against your memory" /> : null}

      {!loading && !result && !error ? (
        <div className="rounded-2xl border border-dashed border-border-secondary p-6 text-center text-sm text-text-tertiary flex flex-col items-center gap-2" role="status">
          <FileText size={22} className="text-text-tertiary" aria-hidden="true" />
          A fit score, pros, cons and next steps will appear here.
        </div>
      ) : null}

      {!loading && result ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border-secondary bg-bg-elevated p-5 flex flex-col sm:flex-row items-center gap-5">
            <ScoreRing value={fit} label="fit" />
            <div className="flex-1 space-y-3 min-w-0">
              <span className={`inline-block text-sm font-semibold px-3 py-1 rounded-full border ${VERDICT_STYLE[tone]}`}>
                {result.verdict || 'Moderate fit'}
              </span>
              {typeof result.confidence === 'number' ? <Meter label="Confidence" value={result.confidence} /> : null}
            </div>
          </div>

          {result.reasoning ? <p className="text-sm text-text-tertiary px-1">{result.reasoning}</p> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Card eyebrow="In favour" tone="success">
              {result.why_yes?.length ? (
                <ul className="space-y-2">
                  {result.why_yes.map((r: string, i: number) => (
                    <li key={i} className="flex gap-2.5 text-sm text-text-secondary">
                      <Check size={15} className="text-success shrink-0 mt-0.5" aria-hidden="true" /> {r}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-text-tertiary">No matching strengths found.</p>}
            </Card>
            <Card eyebrow="Against" tone="danger">
              {result.why_no?.length ? (
                <ul className="space-y-2">
                  {result.why_no.map((r: string, i: number) => (
                    <li key={i} className="flex gap-2.5 text-sm text-text-secondary">
                      <X size={15} className="text-danger shrink-0 mt-0.5" aria-hidden="true" /> {r}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-text-tertiary">No clear mismatches found.</p>}
            </Card>
          </div>

          {result.action_items?.length > 0 ? (
            <Card eyebrow="To raise your fit">
              <ul className="space-y-2.5">
                {result.action_items.map((a: string, i: number) => (
                  <li key={i} className="flex gap-3 text-sm text-text-secondary">
                    <ListChecks size={16} className="text-accent shrink-0 mt-0.5" aria-hidden="true" /> {a}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
