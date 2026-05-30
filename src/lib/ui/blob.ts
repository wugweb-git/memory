/** Map UI actions to dedicated blob API routes (not /api/blob/:action). */
export const BLOB_ACTION_ROUTES: Record<string, string> = {
  promote: '/api/blob/promote',
  reject: '/api/blob/reject',
  review: '/api/blob/review',
  promotable: '/api/blob/promotable',
};

export async function postBlobAction(action: string, id: string) {
  const route = BLOB_ACTION_ROUTES[action];
  if (!route) throw new Error(`Unknown blob action: ${action}`);
  const res = await fetch(route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  return res;
}

/** Normalize GET /api/blob responses ({ items }) or legacy array payloads. */
export function parseBlobItems<T = Record<string, unknown>>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { items?: unknown }).items)) {
    return (payload as { items: T[] }).items;
  }
  return [];
}
