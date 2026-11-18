/**
 * Retrieval visibility for the chat. Pure helpers (no DB) so they are unit-tested.
 * The visitor-facing /ask chat may only be grounded in packets the owner has
 * marked public (memory_packets.is_public); the owner's own session keeps everything.
 */

export const NO_PUBLIC_NOTES_MESSAGE = 'No public notes yet';

/** Filters to pass to `retrieve` for a chat request. */
export function chatRetrievalFilters(isAdmin: boolean): { publicOnly: boolean } {
  return { publicOnly: !isAdmin };
}

export const MAX_MARK_IDS = 200;

/** Validate the owner "mark public" request body. */
export function parsePublicMarkInput(
  raw: unknown,
): { ok: true; ids: string[]; isPublic: boolean } | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'body must be an object' };
  const { ids, isPublic } = raw as { ids?: unknown; isPublic?: unknown };
  if (typeof isPublic !== 'boolean') return { ok: false, error: 'isPublic must be a boolean' };
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_MARK_IDS) {
    return { ok: false, error: `ids must be an array of 1-${MAX_MARK_IDS} packet ids` };
  }
  if (!ids.every((i) => typeof i === 'string' && i.length > 0 && i.length <= 64)) {
    return { ok: false, error: 'ids must be strings' };
  }
  return { ok: true, ids: ids as string[], isPublic };
}

/** Context placeholder used when retrieval returned nothing. */
export function emptyContextText(isAdmin: boolean): string {
  return isAdmin
    ? '(no indexed clusters matched)'
    : `(${NO_PUBLIC_NOTES_MESSAGE}: nothing has been shared publicly yet or nothing public matched. Tell the visitor exactly that, politely, and do not guess.)`;
}
