/** Pure pagination helpers for the admin memory list (no DB, safe to import from client code). */

export const LIST_DEFAULT_LIMIT = 10;
export const LIST_MAX_LIMIT = 200;
export const LIST_MAX_OFFSET = 100000;

export interface Pagination {
  limit: number;
  offset: number;
}

function parseIntStrict(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!/^[+-]?\d+$/.test(s)) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

/** limit in [1, 200] (default 10); offset in [0, 100000] (default 0). Invalid values fall back to defaults. */
export function parsePagination(searchParams: { get(name: string): string | null }): Pagination {
  const rawLimit = parseIntStrict(searchParams.get('limit'));
  const rawOffset = parseIntStrict(searchParams.get('offset'));
  const limit = rawLimit === null || rawLimit < 1 ? LIST_DEFAULT_LIMIT : Math.min(rawLimit, LIST_MAX_LIMIT);
  const offset = rawOffset === null || rawOffset < 0 ? 0 : Math.min(rawOffset, LIST_MAX_OFFSET);
  return { limit, offset };
}

/** Stable order: newest first, id as tiebreaker so pages never overlap or skip. */
export const LIST_ORDER_BY = [{ ingestion_time: 'desc' as const }, { id: 'desc' as const }];

/** Human label for the visible range, e.g. "Showing 11 to 20 of 134". */
export function pageRangeLabel(offset: number, count: number, total: number): string {
  if (total <= 0 || count <= 0) return 'No packets to show';
  const start = offset + 1;
  const end = Math.min(offset + count, total);
  return `Showing ${start} to ${end} of ${total}`;
}

export function hasPrevPage(offset: number): boolean {
  return offset > 0;
}

export function hasNextPage(offset: number, count: number, total: number): boolean {
  return offset + count < total;
}
