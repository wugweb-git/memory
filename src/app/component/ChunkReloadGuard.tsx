'use client';

import { useEffect } from 'react';

/**
 * Recovers from the "Application error: client-side exception" crash that
 * happens after a deploy when the browser holds a stale HTML shell but the old
 * JS chunks it references are gone (404) — Next throws ChunkLoadError.
 *
 * On such an error we reload once to pull the fresh bundle. A short throttle in
 * sessionStorage prevents a reload loop if the failure is persistent (offline,
 * genuinely-missing asset) rather than a stale deploy.
 */
const CHUNK_ERROR =
  /ChunkLoadError|Loading chunk \d+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i;
const RELOAD_KEY = '__chunk_reload_at';
const THROTTLE_MS = 60_000;

export function ChunkReloadGuard() {
  useEffect(() => {
    function recover(message?: string) {
      if (!message || !CHUNK_ERROR.test(message)) return;
      let last = 0;
      try {
        last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
      } catch {
        /* sessionStorage may be unavailable (private mode) — best effort */
      }
      if (Date.now() - last < THROTTLE_MS) return;
      try {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
      } catch {
        /* noop */
      }
      window.location.reload();
    }

    const onError = (e: ErrorEvent) => recover(e.message || e.error?.message);
    const onRejection = (e: PromiseRejectionEvent) =>
      recover(typeof e.reason === 'string' ? e.reason : e.reason?.message);

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
