'use client';

import { useState } from 'react';
import { ListOrdered } from 'lucide-react';
import { errorFlags, postJson, currentUserId, Intent, Card, PrimaryButton, ErrorBox, SkeletonCard, Meter } from './shared';

type Mode = 'architect' | 'founder' | 'operator';
const MAX_ITEMS = 10;

export const PrioritizeTab: React.FC<{ mode: Mode }> = ({ mode }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [errFlags, setErrFlags] = useState({ limit: false, retryable: true });

  const items = text.split('\n').map(s => s.trim()).filter(Boolean);
  const tooMany = items.length > MAX_ITEMS;

  async function run() {
    if (!items.length || tooMany) return;
    setLoading(true);
    setError(null);
    setErrFlags({ limit: false, retryable: true });
    try {
      setResult(await postJson('/api/cognitive/prioritize', { user_id: currentUserId(), items, mode }));
    } catch (e: any) {
      setResult(null);
      setError(e.message);
      setErrFlags(errorFlags(e));
    } finally {
      setLoading(false);
    }
  }

  const ranked: any[] = Array.isArray(result?.ranked)
    ? [...result.ranked].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
    : [];

  return (
    <div className="space-y-5">
      <Intent title="What comes first?">
        List what is on your plate, one item per line. Get them ranked against your current signals.
      </Intent>

      <div className="space-y-2">
        <label htmlFor="prio-items" className="text-sm font-medium text-text-secondary">Your list</label>
        <textarea
          id="prio-items"
          value={text}
          onChange={e => setText(e.target.value)}
          rows={6}
          aria-describedby="prio-help"
          placeholder={'Reply to client proposal\nFix onboarding bug\nWrite weekly update'}
          className="w-full rounded-xl border border-border-secondary bg-bg-elevated px-4 py-3 text-md text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent resize-y"
        />
        <p id="prio-help" role={tooMany ? 'alert' : undefined} aria-live="polite" className={`text-xs ${tooMany ? 'text-danger' : 'text-text-tertiary'}`}>
          {items.length} of {MAX_ITEMS} items{tooMany ? ' (remove some to continue)' : ''}
        </p>
      </div>

      <PrimaryButton onClick={run} disabled={!items.length || tooMany} loading={loading} loadingLabel="Ranking…" icon={<ListOrdered size={16} />}>
        Rank these
      </PrimaryButton>

      {error ? <ErrorBox message={error} limit={errFlags.limit} onRetry={items.length && !tooMany && errFlags.retryable ? run : undefined} /> : null}
      {loading ? <SkeletonCard label="Weighing each item" /> : null}

      {!loading && !result && !error ? (
        <p className="text-sm text-text-tertiary text-center">A ranked list with reasons will appear here.</p>
      ) : null}

      {!loading && result ? (
        <div className="space-y-4">
          {ranked.length === 0 ? (
            <ErrorBox message="The ranking came back empty. Make each line a specific task, then try again." onRetry={run} />
          ) : (
            <ol className="space-y-3">
              {ranked.map((r, i) => (
                <li key={i} className={`rounded-2xl border p-4 flex gap-4 ${i === 0 ? 'border-accent/30 bg-accent/5' : 'border-border-secondary bg-bg-elevated'}`}>
                  <span className={`text-3xl font-semibold leading-none w-8 shrink-0 ${i === 0 ? 'text-text-primary' : 'text-text-tertiary'}`}>{r.rank ?? i + 1}</span>
                  <div className="space-y-2 min-w-0">
                    <p className="text-sm font-semibold text-text-primary">{r.item}</p>
                    <p className="text-sm text-text-tertiary">{r.reason}</p>
                    {r.signal_match ? (
                      <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-bg-secondary text-text-secondary border border-border-secondary">
                        Matches: {r.signal_match}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
          {typeof result.confidence === 'number' ? (
            <Card eyebrow="Ranking confidence">
              <Meter label="Confidence" value={result.confidence} />
              {result.reasoning ? <p className="text-sm text-text-tertiary">{result.reasoning}</p> : null}
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
