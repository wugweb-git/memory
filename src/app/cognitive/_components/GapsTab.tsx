'use client';

import { useEffect, useState } from 'react';
import { Check, Minus, RefreshCw } from 'lucide-react';
import { errorFlags, postJson, currentUserId, Intent, Card, ErrorBox, SkeletonCard, Meter } from './shared';

// Mirrors the expected profile the gaps API scores against.
const DOMAINS = ['technical', 'leadership', 'product', 'communication', 'financial', 'creative'];
const ENTITY_TYPES = ['person', 'company', 'concept', 'tool'];

export const GapsTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [errFlags, setErrFlags] = useState({ limit: false, retryable: true });

  async function run() {
    setLoading(true);
    setError(null);
    setErrFlags({ limit: false, retryable: true });
    try {
      setResult(await postJson('/api/cognitive/gaps', { user_id: currentUserId() }));
    } catch (e: any) {
      setResult(null);
      setError(e.message);
      setErrFlags(errorFlags(e));
    } finally {
      setLoading(false);
    }
  }

  // Deterministic, no input needed: run on open.
  useEffect(() => { run(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const missingDomains: string[] = result?.missing_domains ?? [];
  const missingTypes: string[] = result?.missing_entity_types ?? [];
  const weakEntities: any[] = result?.weak_entities ?? [];
  const weakSignals: any[] = result?.weak_signals ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <Intent title="Where am I thin?">
          A coverage check of your memory against a well-rounded professional profile.
        </Intent>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          aria-label="Run the coverage check again"
          className="min-h-11 min-w-11 shrink-0 rounded-xl border border-border-secondary flex items-center justify-center text-text-secondary disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <RefreshCw size={16} aria-hidden="true" className={loading ? 'motion-safe:animate-spin' : ''} />
        </button>
      </div>

      {error ? <ErrorBox message={error} limit={errFlags.limit} onRetry={errFlags.retryable ? run : undefined} /> : null}
      {loading && !result ? <SkeletonCard label="Checking coverage" /> : null}

      {result ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border-secondary bg-bg-elevated p-5 space-y-3">
            <Meter label="Profile coverage" value={result.coverage_score ?? 0} />
            {result.summary ? <p className="text-sm text-text-tertiary">{result.summary}</p> : null}
          </div>

          <Card eyebrow="Domains">
            <ul className="grid grid-cols-2 gap-2">
              {DOMAINS.map(d => {
                const missing = missingDomains.includes(d);
                return (
                  <li key={d} className={`flex items-center gap-2 rounded-xl border px-3 min-h-11 text-sm ${missing ? 'border-danger/30 bg-danger/5 text-danger' : 'border-success/30 bg-success/5 text-success'}`}>
                    {missing ? <Minus size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
                    {missing ? null : <span className="sr-only">Covered: </span>}
                    <span className="capitalize">{d}{missing ? ' (missing)' : ''}</span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card eyebrow="Entity types">
            <ul className="flex flex-wrap gap-2">
              {ENTITY_TYPES.map(t => {
                const missing = missingTypes.includes(t);
                return (
                  <li key={t} className={`text-xs font-medium rounded-full border px-3 py-1.5 capitalize ${missing ? 'border-danger/30 text-danger bg-danger/5' : 'border-success/30 text-success bg-success/5'}`}>
                    {t}{missing ? ' missing' : ''}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card eyebrow="Thinnest entities" tone="warning">
            {weakEntities.length ? (
              <ul className="space-y-2.5">
                {weakEntities.map((e, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-text-secondary truncate">{e.name} <span className="text-text-tertiary">· {e.type}</span></span>
                    <span className="text-xs text-warning font-semibold shrink-0">{e.occurrences}x</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-text-tertiary">Nothing is thin. Every entity has several mentions.</p>}
          </Card>

          <Card eyebrow="Weak signals">
            {weakSignals.length ? (
              <ul className="space-y-3">
                {weakSignals.map((s, i) => (
                  <li key={i} className="space-y-1">
                    <p className="text-sm text-text-secondary">
                      {s.type}{s.category ? <span className="text-text-tertiary"> · {s.category}</span> : null}
                    </p>
                    <Meter label="Intensity" value={Number(s.intensity) || 0} />
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-text-tertiary">All signals are carrying strength.</p>}
          </Card>
        </div>
      ) : null}
    </div>
  );
};
