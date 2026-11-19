import { postgres } from "@/lib/db/postgres";

const METRICS = ["impressions", "likes", "comments", "shares", "clicks"] as const;
type Metric = (typeof METRICS)[number];
export type EngagementTotals = Record<Metric, number>;

const emptyTotals = (): EngagementTotals => ({ impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0 });

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
}

/** Pull known numeric metrics out of a loose JSON blob (snapshot payload or published_outputs.analytics). */
export function extractMetrics(blob: unknown): Partial<EngagementTotals> {
  if (!blob || typeof blob !== "object") return {};
  const src = ((blob as any).metrics && typeof (blob as any).metrics === "object" ? (blob as any).metrics : blob) as Record<string, unknown>;
  const out: Partial<EngagementTotals> = {};
  for (const m of METRICS) if (num(src[m]) > 0) out[m] = num(src[m]);
  return out;
}

export interface PublishedRow { platform?: string | null; externalId?: string | null; analytics?: unknown }
export interface SnapshotRow { platform?: string | null; externalPostId?: string | null; payload?: unknown; createdAt: Date }

/**
 * Pure aggregation. For each published post the newest engagement snapshot
 * written by the engagement-fetcher job wins; otherwise the metrics stored on
 * published_outputs.analytics (analytics-sync) are used.
 */
export function aggregateContentAnalytics(published: PublishedRow[], snapshots: SnapshotRow[]) {
  const latest = new Map<string, SnapshotRow>();
  for (const s of snapshots) {
    if (!s.externalPostId) continue;
    const key = `${s.platform ?? ""}:${s.externalPostId}`;
    const cur = latest.get(key);
    if (!cur || s.createdAt > cur.createdAt) latest.set(key, s);
  }

  const byPlatform: Record<string, number> = {};
  const engagementByPlatform: Record<string, EngagementTotals> = {};
  const totals = emptyTotals();
  let withMetrics = 0;

  for (const p of published) {
    const platform = p.platform || "unknown";
    byPlatform[platform] = (byPlatform[platform] || 0) + 1;
    const snap = p.externalId ? latest.get(`${p.platform ?? ""}:${p.externalId}`) : undefined;
    const fromSnap = snap ? extractMetrics(snap.payload) : {};
    const metrics = Object.keys(fromSnap).length ? fromSnap : extractMetrics(p.analytics);
    if (!Object.keys(metrics).length) continue;
    withMetrics += 1;
    const bucket = (engagementByPlatform[platform] ||= emptyTotals());
    for (const m of METRICS) {
      const v = metrics[m] ?? 0;
      bucket[m] += v;
      totals[m] += v;
    }
  }

  const interactions = totals.likes + totals.comments + totals.shares + totals.clicks;
  return {
    totalPublished: published.length,
    byPlatform,
    engagement: {
      totals,
      byPlatform: engagementByPlatform,
      engagementRate: totals.impressions > 0 ? Number((interactions / totals.impressions).toFixed(4)) : null,
      postsWithMetrics: withMetrics,
      snapshotCount: snapshots.length,
      lastSnapshotAt: snapshots.reduce<Date | null>((a, s) => (!a || s.createdAt > a ? s.createdAt : a), null),
      note: withMetrics === 0 ? "No platform metrics captured yet (engagement-fetcher has not recorded numeric metrics)." : undefined,
    },
  };
}

export async function getContentAnalytics(userId: string) {
  const [published, snapshots] = await Promise.all([
    postgres.publishedOutput.findMany({ where: { userId } }),
    postgres.externalFeedback.findMany({
      where: { userId, feedbackType: "engagement_snapshot" },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
  ]);
  return aggregateContentAnalytics(published, snapshots);
}
