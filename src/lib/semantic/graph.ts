export interface GraphEdge {
  from: string;
  to: string;
  type?: string;
  weight?: number;
  inferred?: boolean;
}

interface RelRow { from_entity_id: string; to_entity_id: string; type: string; confidence: number }
interface EntRow { id: string; packet_ids: unknown }

/**
 * Real Relationship rows are authoritative. Co-occurrence edges (entities that
 * share a packet) are synthesized only when no real edge exists, and are always
 * flagged `inferred: true` with a low weight.
 */
export function buildGraphEdges(rels: RelRow[], entities: EntRow[], inferredWeight = 0.1): GraphEdge[] {
  const known = new Set(entities.map((e) => e.id));
  const real: GraphEdge[] = rels
    .filter((r) => known.has(r.from_entity_id) && known.has(r.to_entity_id))
    .map((r) => ({ from: r.from_entity_id, to: r.to_entity_id, type: r.type, weight: r.confidence, inferred: false }));
  if (real.length > 0) return real;

  const byPacket = new Map<string, string[]>();
  for (const e of entities) {
    const pids = Array.isArray(e.packet_ids) ? e.packet_ids.map(String) : [];
    for (const p of pids) {
      const list = byPacket.get(p) ?? [];
      list.push(e.id);
      byPacket.set(p, list);
    }
  }
  const seen = new Set<string>();
  const edges: GraphEdge[] = [];
  for (const ids of byPacket.values()) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = ids[i] < ids[j] ? `${ids[i]}|${ids[j]}` : `${ids[j]}|${ids[i]}`;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({ from: ids[i], to: ids[j], type: 'co_occurs', weight: inferredWeight, inferred: true });
      }
    }
  }
  return edges;
}
