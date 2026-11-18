/**
 * Pure helpers for the owner "public notes" curation screen
 * (/admin/memory/public). No DOM, no fetch: unit-tested.
 */

export interface PublicNote {
  id: string;
  type: string;
  source: string;
  ingestion_time: string | null;
  is_public: boolean;
  preview: string;
}

/** Tolerantly normalise the GET /api/memory/public payload. */
export function parseNotes(body: unknown): PublicNote[] {
  const list = (body as { packets?: unknown } | null | undefined)?.packets;
  if (!Array.isArray(list)) return [];
  const out: PublicNote[] = [];
  for (const p of list) {
    if (!p || typeof p !== 'object') continue;
    const r = p as Record<string, unknown>;
    if (typeof r.id !== 'string' || !r.id) continue;
    out.push({
      id: r.id,
      type: typeof r.type === 'string' ? r.type : 'note',
      source: typeof r.source === 'string' ? r.source : 'unknown',
      ingestion_time: r.ingestion_time ? String(r.ingestion_time) : null,
      is_public: r.is_public === true,
      preview: typeof r.preview === 'string' ? r.preview : '',
    });
  }
  return out;
}

/** Return a new list with `ids` flipped to `isPublic`. */
export function applyMark(notes: PublicNote[], ids: ReadonlySet<string>, isPublic: boolean): PublicNote[] {
  return notes.map((n) => (ids.has(n.id) ? { ...n, is_public: isPublic } : n));
}

/** Restore the previous visibility of `ids` from a snapshot (optimistic rollback). */
export function rollbackMark(notes: PublicNote[], snapshot: PublicNote[], ids: ReadonlySet<string>): PublicNote[] {
  const prev = new Map(snapshot.map((n) => [n.id, n.is_public]));
  return notes.map((n) => (ids.has(n.id) && prev.has(n.id) ? { ...n, is_public: prev.get(n.id) as boolean } : n));
}

export function toggleId(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export type SelectAllState = 'none' | 'some' | 'all';

export function selectAllState(notes: PublicNote[], selected: ReadonlySet<string>): SelectAllState {
  if (notes.length === 0) return 'none';
  const count = notes.filter((n) => selected.has(n.id)).length;
  if (count === 0) return 'none';
  return count === notes.length ? 'all' : 'some';
}

/** Select every note on the page, or clear them all when everything is already selected. */
export function toggleSelectAll(notes: PublicNote[], selected: ReadonlySet<string>): Set<string> {
  return selectAllState(notes, selected) === 'all' ? new Set() : new Set(notes.map((n) => n.id));
}

/** Drop selected ids that are no longer on the page. */
export function pruneSelection(notes: PublicNote[], selected: ReadonlySet<string>): Set<string> {
  const ids = new Set(notes.map((n) => n.id));
  return new Set([...selected].filter((i) => ids.has(i)));
}

/** "3 of 50 public" summary line. */
export function summarise(notes: PublicNote[]): string {
  const pub = notes.filter((n) => n.is_public).length;
  return `${pub} of ${notes.length} public`;
}

export function formatNoteDate(iso: string | null): string {
  if (!iso) return 'No date';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'No date';
  return d.toISOString().slice(0, 10);
}
