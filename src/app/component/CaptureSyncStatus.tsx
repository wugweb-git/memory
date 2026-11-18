'use client';

import { useEffect, useState } from 'react';
import { UploadCloud, CheckCircle2 } from 'lucide-react';
import { CAPTURE_EVENT, flushCaptureQueue, pendingCaptureCount } from '@/lib/pwa/capture-client';

/**
 * Small status chip for offline captures. Replays the queue when the connection returns
 * (the service worker does it too via Background Sync where supported).
 */
export function CaptureSyncStatus() {
  const [pending, setPending] = useState(0);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const sync = async () => {
      const before = await pendingCaptureCount();
      if (before === 0 || navigator.onLine === false) return;
      const res = await flushCaptureQueue();
      if (alive && res && res.sent > 0) {
        setJustSynced(true);
        timer = setTimeout(() => alive && setJustSynced(false), 4000);
      }
    };
    const onChange = (e: Event) => {
      const n = (e as CustomEvent<{ pending: number }>).detail?.pending;
      if (alive && typeof n === 'number') setPending(n);
    };
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'prism-capture-synced') void pendingCaptureCount();
    };

    window.addEventListener(CAPTURE_EVENT, onChange);
    window.addEventListener('online', sync);
    navigator.serviceWorker?.addEventListener?.('message', onMessage);
    void sync();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      window.removeEventListener(CAPTURE_EVENT, onChange);
      window.removeEventListener('online', sync);
      navigator.serviceWorker?.removeEventListener?.('message', onMessage);
    };
  }, []);

  if (pending === 0 && !justSynced) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4rem)] z-40 mx-auto flex w-fit max-w-full items-center gap-2 rounded-full border border-border-primary bg-bg-elevated px-4 py-2 text-xs font-bold text-text-primary shadow-3xl"
    >
      {pending > 0 ? (
        <>
          <UploadCloud size={14} aria-hidden="true" className="text-warning" />
          <span>Saved offline, will sync{pending > 1 ? ` (${pending} items)` : ''}</span>
        </>
      ) : (
        <>
          <CheckCircle2 size={14} aria-hidden="true" className="text-success" />
          <span>Offline captures synced</span>
        </>
      )}
    </div>
  );
}
