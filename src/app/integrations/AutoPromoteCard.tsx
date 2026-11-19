'use client';

import { useCallback, useEffect, useState } from 'react';
import { M3Button } from '@/components/ui/m3';
import { ListSection } from './list-parts';
import { apiRequest } from '@/lib/ui/api-client';

type Mode = 'off' | 'trusted' | 'all';

const OPTIONS: Array<{ value: Mode; label: string; help: string }> = [
  { value: 'off', label: 'Review first', help: 'Synced items wait in the Buffer until you promote them. This is the default.' },
  { value: 'trusted', label: 'Trusted sources only', help: 'GitHub, YouTube, blog, Notion, Spotify, Google Calendar and Google Tasks go straight to memory. Gmail and everything else waits.' },
  { value: 'all', label: 'Everything', help: 'Every synced source goes straight to memory, including Gmail. Memory still filters noise and holds sensitive items.' },
];

/** Owner setting: should synced items flow into memory automatically? */
export function AutoPromoteCard() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');

  const load = useCallback(() => {
    setError(null);
    return apiRequest<{ mode: Mode }>('/api/settings/auto-promote')
      .then((r) => setMode(r.mode))
      .catch(() => setError('Could not load this setting. Check your connection and try again.'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function choose(next: Mode) {
    const prev = mode;
    setMode(next);
    setSaving(true);
    setError(null);
    setSaved('');
    try {
      await apiRequest('/api/settings/auto-promote', { method: 'PUT', body: { mode: next } });
      setSaved('Saved.');
    } catch (e: unknown) {
      setMode(prev);
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ListSection
      id="auto-promote-title"
      title="Send synced items to memory"
      hint="Choose whether items pulled in by syncs go straight into memory or wait for your review. Applies to scheduled syncs and Sync now."
      bare
    >
      <fieldset className="divide-y divide-border-secondary" disabled={saving || mode === null} aria-describedby={error ? 'auto-promote-err' : undefined}>
        <legend className="sr-only">Send synced items to memory</legend>
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            htmlFor={`auto-promote-${o.value}`}
            className="flex min-h-14 cursor-pointer items-start gap-3 px-4 py-3 hover:bg-bg-secondary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-accent"
          >
            <input
              id={`auto-promote-${o.value}`}
              type="radio"
              name="auto-promote"
              value={o.value}
              checked={mode === o.value}
              onChange={() => choose(o.value)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent)]"
            />
            <span className="min-w-0">
              <span className="block text-base font-medium text-text-primary">{o.label}</span>
              <span className="block text-sm text-text-tertiary">{o.help}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {error ? <p id="auto-promote-err" role="alert" className="border-t border-border-secondary px-4 py-3 text-sm text-danger">{error}</p> : null}
      {error && mode === null ? <div className="px-4 pb-3"><M3Button tone="secondary" onClick={load}>Try again</M3Button></div> : null}
      <p role="status" aria-live="polite" className="px-4 py-2 text-sm text-text-tertiary empty:hidden">{saved}</p>
    </ListSection>
  );
}
