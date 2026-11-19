/** Topic aggregation from SemanticObject.topics JSON (the Topic table has no writer). */
export interface TopicObjectRow {
  packet_id: string;
  topics: unknown;
  fallback?: boolean;
  timestamp?: Date | string;
}

export interface AggregatedTopic {
  id: string;
  name: string;
  strength: number; // mean confidence
  mentions: number;
  packet_ids: string[];
  last_updated: string | null;
  inferred: boolean; // true when every contribution came from the rule-based fallback
}

export function aggregateTopics(rows: TopicObjectRow[], limit = 50): AggregatedTopic[] {
  const map = new Map<string, { name: string; sum: number; n: number; packets: Set<string>; last: number; llm: boolean }>();
  for (const row of rows) {
    if (!Array.isArray(row.topics)) continue;
    const ts = row.timestamp ? new Date(row.timestamp).getTime() : 0;
    for (const t of row.topics as any[]) {
      const name = String(typeof t === 'string' ? t : t?.name ?? t?.topic ?? '').trim();
      if (!name) continue;
      const conf = typeof t?.confidence === 'number' ? t.confidence : 0.5;
      const key = name.toLowerCase();
      const cur = map.get(key) ?? { name, sum: 0, n: 0, packets: new Set<string>(), last: 0, llm: false };
      cur.sum += conf;
      cur.n += 1;
      cur.packets.add(row.packet_id);
      cur.last = Math.max(cur.last, ts);
      if (!row.fallback && !t?.fallback) cur.llm = true;
      map.set(key, cur);
    }
  }
  return Array.from(map.entries())
    .map(([key, v]) => ({
      id: key,
      name: v.name,
      strength: v.sum / v.n,
      mentions: v.n,
      packet_ids: Array.from(v.packets),
      last_updated: v.last ? new Date(v.last).toISOString() : null,
      inferred: !v.llm,
    }))
    .sort((a, b) => b.mentions * b.strength - a.mentions * a.strength)
    .slice(0, limit);
}
