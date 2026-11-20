import {
  buildDesignPortfolioPayload,
  buildSubstackPayload,
  isManualPlatform,
  manualPostText,
  type ManualPlatform,
} from "@/lib/platforms/manual";

export type PendingManualItem = {
  key: string;
  outputId: string;
  platform: ManualPlatform;
  title: string;
  text: string;
};

type HistoryRowLike = {
  id?: string;
  outputId?: string | null;
  platform?: string | null;
  publishedContent?: { title?: unknown; content?: unknown; excerpt?: unknown } | null;
  delivery?: { status?: string; platform?: string } | null;
};

/** Rows whose delivery is 'manual' and that have text and an output id the owner can confirm. */
export function pendingManualItems(rows: HistoryRowLike[]): PendingManualItem[] {
  const out: PendingManualItem[] = [];
  rows.forEach((r, i) => {
    if (r.delivery?.status !== "manual") return;
    const platform = r.delivery.platform ?? r.platform;
    if (!isManualPlatform(platform)) return;
    if (typeof r.outputId !== "string" || !r.outputId) return;
    const pc = r.publishedContent && typeof r.publishedContent === "object" ? r.publishedContent : null;
    const content = typeof pc?.content === "string" && pc.content.trim() ? pc.content : typeof pc?.excerpt === "string" ? pc.excerpt : "";
    if (!content.trim()) return;
    const payload =
      platform === "substack" ? buildSubstackPayload({ content }) : buildDesignPortfolioPayload(platform, { content });
    out.push({
      key: r.id || `${r.outputId}-${i}`,
      outputId: r.outputId,
      platform,
      title: typeof pc?.title === "string" ? pc.title : "",
      text: manualPostText(platform, payload) || content,
    });
  });
  return out;
}
