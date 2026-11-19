'use client';

import { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getNative } from '@/lib/native/adapter';
import { aiLaunchers, buildAiPrompt, AI_HANDOFF_MAX_CHARS } from '@/lib/native/apps-ai';
import { PasteCaptureButton } from './DeviceActions';

/**
 * Hands a prompt (and optional context, e.g. a selected memory note) to another AI app. This is a handoff,
 * not a live session. Nothing is sent until a provider button is tapped, and the exact text is shown first.
 * Bring answers back with the Android share sheet (share target) or Paste from clipboard.
 */
export function AskAnotherAi({ initialPrompt = '', context = '' }: { initialPrompt?: string; context?: string }) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [includeContext, setIncludeContext] = useState(false);
  const ctx = includeContext ? context : '';
  const preview = useMemo(() => buildAiPrompt(prompt, ctx), [prompt, ctx]);
  const launchers = useMemo(() => aiLaunchers(prompt, ctx), [prompt, ctx]);
  const [note, setNote] = useState<string | null>(null);

  return (
    <section aria-label="Ask another AI" className="space-y-3">
      <label className="block text-2xs text-text-tertiary">
        Prompt
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} className="mt-1 block w-full rounded-xl border border-border-primary bg-bg-elevated p-3 text-sm text-text-primary" />
      </label>
      {context && (
        <label className="flex min-h-11 items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" checked={includeContext} onChange={(e) => setIncludeContext(e.target.checked)} className="h-4 w-4" />
          Include the selected note as context
        </label>
      )}
      <div className="rounded-xl border border-border-primary p-3">
        <p className="text-2xs text-text-tertiary">Will send ({preview.text.length} of {AI_HANDOFF_MAX_CHARS} characters){preview.truncated ? ', shortened' : ''}</p>
        <p className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-sm text-text-primary">{preview.text || 'Nothing to send yet.'}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {launchers.map((l) => (
          <Button
            key={l.id}
            variant="outline"
            size="lg"
            disabled={!preview.text}
            onClick={async () => {
              const r = await getNative().apps.open(l);
              setNote(l.promptPrefill ? null : `${l.app} cannot be prefilled from a link. Paste your prompt there.`);
              if (r.status === 'fallback') setNote(`${l.app} is not installed, opened the web version.`);
            }}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {l.label}
          </Button>
        ))}
      </div>
      {note && <p role="status" aria-live="polite" className="text-2xs text-text-secondary">{note}</p>}
      <p className="text-2xs text-text-tertiary">
        To bring an answer back, use Share in that app and pick this app, or copy it and tap Paste from clipboard.
      </p>
      <PasteCaptureButton />
    </section>
  );
}
