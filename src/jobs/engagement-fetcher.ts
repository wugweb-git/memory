import { postgres } from "@/lib/db/postgres";

const FETCH_TIMEOUT_MS = 15_000;
const LINKEDIN_DEFAULT_VERSION = "202511";

export type EngagementFetchResult =
  | { status: "ok"; metrics: { likes: number; comments: number } }
  | { status: "unsupported" | "unavailable"; reason: string };

/**
 * Fetch real engagement numbers for one published post. Never returns zeros
 * unless the platform API itself reported them; otherwise an explicit
 * unsupported/unavailable result with the reason.
 *
 * LinkedIn: /rest/socialMetadata/{urn} gives reaction + comment counts (needs a
 * token with social-read scope). Impressions/clicks are not available there.
 * Medium: no metrics API exists.
 */
export async function fetchPostMetrics(platform: string, externalId: string): Promise<EngagementFetchResult> {
  if (platform === "medium") {
    return { status: "unsupported", reason: "Medium has no metrics API." };
  }
  if (platform !== "linkedin") {
    return { status: "unsupported", reason: `No metrics fetcher for platform "${platform}".` };
  }
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!token) return { status: "unavailable", reason: "LINKEDIN_ACCESS_TOKEN is not configured." };

  try {
    const res = await fetch(`https://api.linkedin.com/rest/socialMetadata/${encodeURIComponent(externalId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "LinkedIn-Version": process.env.LINKEDIN_API_VERSION || LINKEDIN_DEFAULT_VERSION,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const json: any = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = json?.message ? `: ${String(json.message).slice(0, 160)}` : "";
      return { status: "unavailable", reason: `LinkedIn HTTP ${res.status}${detail}` };
    }
    if (!json || typeof json !== "object") {
      return { status: "unavailable", reason: "LinkedIn returned an unreadable response." };
    }
    const reactions = json.reactionSummaries;
    const comments = json.commentSummary?.count ?? json.commentSummary?.aggregatedTotalComments;
    // A missing reactionSummaries object with no comment count means we cannot
    // tell zero from unknown, so do not report numbers.
    if (reactions === undefined && typeof comments !== "number") {
      return { status: "unavailable", reason: "LinkedIn response carried no reaction or comment counts." };
    }
    let likes = 0;
    if (reactions && typeof reactions === "object") {
      for (const r of Object.values(reactions) as any[]) if (typeof r?.count === "number") likes += r.count;
    }
    return { status: "ok", metrics: { likes, comments: typeof comments === "number" ? comments : 0 } };
  } catch (err) {
    return { status: "unavailable", reason: `LinkedIn request failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function runEngagementFetcher() {
  const recent = await postgres.publishedOutput.findMany({
    where: { platform: { not: null }, externalId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let captured = 0;
  let withMetrics = 0;
  let unavailable = 0;
  for (const row of recent) {
    const result = await fetchPostMetrics(String(row.platform), String(row.externalId));
    const payload =
      result.status === "ok"
        ? { fetchedAt: new Date().toISOString(), source: "job:engagement-fetcher", status: "ok", metrics: result.metrics }
        : { fetchedAt: new Date().toISOString(), source: "job:engagement-fetcher", status: result.status, reason: result.reason };
    await postgres.externalFeedback.create({
      data: {
        userId: row.userId,
        platform: row.platform,
        externalPostId: row.externalId,
        feedbackType: "engagement_snapshot",
        payload,
      },
    });
    captured += 1;
    if (result.status === "ok") withMetrics += 1;
    else unavailable += 1;
  }

  return { ok: true, job: "engagement-fetcher", captured, withMetrics, unavailable };
}
