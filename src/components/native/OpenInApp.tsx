'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getNative } from '@/lib/native/adapter';
import { appLaunchers, openAppLaunchers, type AppLauncher, type LaunchContext } from '@/lib/native/apps';

/**
 * "Open in app" launcher list. Best effort: a PWA cannot tell which apps are installed, so every
 * launcher falls back to the web version. Launching happens only on tap.
 */
export function OpenInApp({ context, showAll = false }: { context: LaunchContext; showAll?: boolean }) {
  const [note, setNote] = useState<string | null>(null);
  const items: AppLauncher[] = [...appLaunchers(context), ...(showAll ? openAppLaunchers() : [])];
  if (items.length === 0) return null;

  async function go(l: AppLauncher) {
    const r = await getNative().apps.open(l);
    setNote(r.status === 'fallback' ? `${l.app} is not installed, opened the web version.` : null);
  }

  return (
    <section aria-label="Open in app" className="space-y-2">
      <p className="text-2xs uppercase tracking-wide text-text-tertiary">Open in app</p>
      <div className="flex flex-wrap gap-2">
        {items.map((l) => (
          <Button key={l.id} variant="outline" size="lg" onClick={() => go(l)}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            {l.label}
          </Button>
        ))}
      </div>
      <p className="text-2xs text-text-tertiary">If the app is not installed, the web version opens instead.</p>
      {note && <p role="status" aria-live="polite" className="text-2xs text-text-secondary">{note}</p>}
    </section>
  );
}
