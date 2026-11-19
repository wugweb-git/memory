'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { isStoragePersisted, readStorageHealth, requestPersistentStorage } from '@/lib/native/browser';
import { formatBytes, persistStateLabel, type StorageHealth } from '@/lib/native/storage';
import { pendingCaptureCount } from '@/lib/pwa/capture-client';

/** Device storage usage, persistence state, and queued offline captures. */
export function StorageStatus() {
  const [health, setHealth] = useState<StorageHealth | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [pending, setPending] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setHealth(await readStorageHealth());
    setPersisted(await isStoragePersisted());
    setPending(await pendingCaptureCount());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pct = health?.ratio !== null && health?.ratio !== undefined ? Math.round(health.ratio * 100) : null;

  return (
    <section aria-label="Device storage" className="space-y-2 rounded-xl border border-border-primary p-3">
      <p className="text-sm font-bold text-text-primary">Device storage</p>
      <p className="text-2xs text-text-secondary">
        {health && health.usage !== null && health.quota !== null
          ? `${formatBytes(health.usage)} used of ${formatBytes(health.quota)}${pct !== null ? ` (${pct}%)` : ''}`
          : 'Usage is not reported by this browser.'}
      </p>
      {health?.level === 'warn' && <p className="text-2xs text-warning">Storage is getting full.</p>}
      {health?.level === 'full' && <p role="alert" className="text-2xs text-danger">Storage is almost full. New offline captures may fail.</p>}
      <p className="text-2xs text-text-secondary">Offline captures waiting to sync: {pending}</p>
      <p className="text-2xs text-text-tertiary">{persistStateLabel(persisted)}.</p>
      {persisted !== true && (
        <Button
          variant="outline"
          size="lg"
          onClick={async () => {
            const ok = await requestPersistentStorage();
            setNote(ok === true ? 'Protected from automatic clean-up.' : ok === false ? 'The browser declined. It usually grants this to installed apps you use often.' : 'Not supported here.');
            void refresh();
          }}
        >
          Protect offline data
        </Button>
      )}
      {note && <p role="status" aria-live="polite" className="text-2xs text-text-secondary">{note}</p>}
    </section>
  );
}
