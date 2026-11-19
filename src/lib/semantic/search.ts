export function semanticSearch(query: string, corpus: Array<{ id: string; text: string }>) {
  const q = query.toLowerCase();
  return corpus.filter((c) => c.text.toLowerCase().includes(q));
}

export interface VectorHit { packet_id: string; context: string[]; score: number }

/**
 * Map pgvector retrieval hits (grouped by packet) onto semantic-object corpus rows.
 * Hits with no semantic object are still returned (id = packet_id) so nothing is lost.
 */
export function mapVectorHits(
  hits: VectorHit[],
  corpus: Array<{ id: string; text: string; packet_id: string }>,
) {
  const byPacket = new Map<string, Array<{ id: string; text: string; packet_id: string }>>();
  for (const c of corpus) byPacket.set(c.packet_id, [...(byPacket.get(c.packet_id) ?? []), c]);
  const out: Array<{ id: string; text: string; packet_id: string; score: number; match: 'vector' }> = [];
  for (const h of hits) {
    const objs = byPacket.get(h.packet_id);
    if (objs?.length) for (const o of objs) out.push({ ...o, score: h.score, match: 'vector' });
    else out.push({ id: h.packet_id, text: (h.context ?? []).join(' ').slice(0, 500), packet_id: h.packet_id, score: h.score, match: 'vector' });
  }
  return out;
}
