/**
 * Timeout for browser fetches without AbortSignal.timeout (missing before Safari 16.4).
 * `clear()` must run once the response body has been read, so a slow body still aborts.
 */
export function timeoutSignal(ms: number): { signal: AbortSignal; clear: () => void; timedOut: () => boolean } {
  const ctrl = new AbortController();
  let fired = false;
  const timer = setTimeout(() => {
    fired = true;
    ctrl.abort();
  }, ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(timer), timedOut: () => fired };
}
