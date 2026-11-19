'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Registers /sw.js in production only (avoids stale caches in `next dev`) and shows an
 * accessible "new version" prompt when an updated worker is waiting. Accepting posts
 * SKIP_WAITING and reloads once the new worker takes control.
 */
export function ServiceWorkerRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    const watch = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const next = reg.installing;
        next?.addEventListener('statechange', () => {
          if (next.state === 'installed' && navigator.serviceWorker.controller) setWaiting(next);
        });
      });
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        watch(reg);
        const check = () => reg.update().catch(() => {});
        const onVisible = () => document.visibilityState === 'visible' && check();
        document.addEventListener('visibilitychange', onVisible);
      })
      .catch(() => {});
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);

  if (!waiting) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border-primary bg-bg-elevated p-3 shadow-3xl bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] md:bottom-6"
    >
      <RefreshCw size={16} aria-hidden="true" className="shrink-0 text-text-secondary" />
      <p className="min-w-0 flex-1 text-sm text-text-primary">A new version is available.</p>
      <button
        type="button"
        onClick={() => waiting.postMessage({ type: 'SKIP_WAITING' })}
        className="min-h-11 shrink-0 rounded-xl bg-text-primary px-4 text-sm font-bold text-bg-primary"
      >
        Update
      </button>
      <button
        type="button"
        onClick={() => setWaiting(null)}
        className="min-h-11 shrink-0 rounded-xl px-3 text-sm font-medium text-text-secondary"
      >
        Later
      </button>
    </div>
  );
}
