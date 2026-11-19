/** Pure storage helpers: size formatting, estimate shaping, error mapping, export naming. */

export function formatBytes(n: number | null | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return 'unknown';
  if (n < 1024) return `${Math.round(n)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 100 ? Math.round(v) : Math.round(v * 10) / 10} ${units[i]}`;
}

export interface StorageHealth {
  usage: number | null;
  quota: number | null;
  ratio: number | null;
  level: 'ok' | 'warn' | 'full' | 'unknown';
}

export function shapeEstimate(e: { usage?: number; quota?: number } | null | undefined): StorageHealth {
  const usage = typeof e?.usage === 'number' ? e.usage : null;
  const quota = typeof e?.quota === 'number' && e.quota > 0 ? e.quota : null;
  if (usage === null || quota === null) return { usage, quota, ratio: null, level: 'unknown' };
  const ratio = Math.min(1, usage / quota);
  return { usage, quota, ratio, level: ratio >= 0.95 ? 'full' : ratio >= 0.8 ? 'warn' : 'ok' };
}

export function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; code?: number };
  return e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014;
}

export type StorageErrorKind = 'quota' | 'unavailable' | 'unknown';

export function mapStorageError(err: unknown): StorageErrorKind {
  if (isQuotaError(err)) return 'quota';
  const name = err && typeof err === 'object' ? String((err as { name?: string }).name ?? '') : '';
  return /SecurityError|InvalidState|NotAllowed/.test(name) ? 'unavailable' : 'unknown';
}

export function storageErrorMessage(kind: StorageErrorKind): string {
  if (kind === 'quota') return 'Device storage is full, so this could not be saved offline. Free some space or reconnect to send it now.';
  if (kind === 'unavailable') return 'Offline storage is blocked in this browser (private mode or site data disabled).';
  return 'Could not save offline.';
}

export function persistStateLabel(persisted: boolean | null): string {
  if (persisted === true) return 'Protected from automatic clean-up';
  if (persisted === false) return 'The browser may clear this data when space is low';
  return 'Unknown';
}

/** e.g. prism-memory-2026-11-19.json */
export function exportFileName(prefix: string, ext: string, now: Date = new Date()): string {
  const slug = prefix.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'export';
  return `${slug}-${now.toISOString().slice(0, 10)}.${ext.replace(/^\./, '')}`;
}
