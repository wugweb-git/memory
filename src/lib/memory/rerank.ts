/**
 * Retrieval re-ranking: mild recency boost + MMR (maximal marginal relevance).
 * Pure and deterministic (ties broken by packet_id) so it is unit-testable without a DB.
 */

export interface RerankConfig {
  /** Master switch for MMR diversification. */
  mmr: boolean;
  /** MMR trade-off: 1 = pure relevance, 0 = pure diversity. */
  lambda: number;
  /** Max fractional boost for a brand-new item (0.1 = +10%). 0 disables recency. */
  recencyWeight: number;
  /** Age at which the recency boost halves. */
  recencyHalfLifeDays: number;
}

export function rerankConfigFromEnv(env: Record<string, string | undefined> = process.env): RerankConfig {
  const num = (v: string | undefined, d: number) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);
  return {
    mmr: env.RETRIEVAL_MMR !== '0' && env.RETRIEVAL_MMR !== 'false',
    lambda: Math.min(1, Math.max(0, num(env.RETRIEVAL_MMR_LAMBDA, 0.7))),
    recencyWeight: Math.max(0, num(env.RETRIEVAL_RECENCY_WEIGHT, 0.1)),
    recencyHalfLifeDays: Math.max(1, num(env.RETRIEVAL_RECENCY_HALFLIFE_DAYS, 90)),
  };
}

export interface RerankCandidate {
  packet_id: string;
  /** Raw cosine score (best chunk). */
  score: number;
  timestamp?: string | Date | null;
  /** Vector of the best chunk; absent vectors are treated as "no known similarity". */
  vector?: number[] | null;
}

export function recencyFactor(timestamp: string | Date | null | undefined, now: Date, cfg: RerankConfig): number {
  if (!cfg.recencyWeight || !timestamp) return 1;
  const t = new Date(timestamp).getTime();
  if (!Number.isFinite(t)) return 1;
  const ageDays = Math.max(0, (now.getTime() - t) / 86_400_000);
  return 1 + cfg.recencyWeight * Math.pow(0.5, ageDays / cfg.recencyHalfLifeDays);
}

export function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

/**
 * Returns candidates ordered by recency-boosted relevance, then (if cfg.mmr) greedily
 * re-selected with MMR. Each output item gains `rank_score` (boosted relevance).
 */
export function rerank<T extends RerankCandidate>(
  candidates: T[],
  cfg: RerankConfig,
  limit: number,
  now: Date = new Date(),
): Array<T & { rank_score: number }> {
  const scored = candidates
    .map((c) => ({ ...c, rank_score: c.score * recencyFactor(c.timestamp, now, cfg) }))
    .sort((a, b) => b.rank_score - a.rank_score || a.packet_id.localeCompare(b.packet_id));

  if (!cfg.mmr || scored.length <= 1) return scored.slice(0, limit);

  const remaining = [...scored];
  const selected: typeof scored = [];
  while (selected.length < limit && remaining.length) {
    let bestIdx = 0;
    let bestVal = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const c = remaining[i];
      let maxSim = 0;
      if (c.vector) {
        for (const s of selected) {
          if (s.vector) maxSim = Math.max(maxSim, cosine(c.vector, s.vector));
        }
      }
      const val = cfg.lambda * c.rank_score - (1 - cfg.lambda) * maxSim;
      // remaining is pre-sorted (rank_score desc, id asc), so strict > keeps ties deterministic.
      if (val > bestVal) {
        bestVal = val;
        bestIdx = i;
      }
    }
    selected.push(remaining.splice(bestIdx, 1)[0]);
  }
  return selected;
}
