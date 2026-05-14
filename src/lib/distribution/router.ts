import { buildLinkedInPayload } from "@/lib/platforms/linkedin";
import { buildMediumPayload } from "@/lib/platforms/medium";
import { buildPortfolioPayload } from "@/lib/platforms/portfolio";

export function routeDistribution(params: { platform: string; content: string; title?: string; tags?: string[]; scheduledAt?: string }) {
  const { platform, content, title, tags = [], scheduledAt } = params;
  if (!content.trim()) throw new Error("EMPTY_CONTENT");
  if (scheduledAt && Number.isNaN(Date.parse(scheduledAt))) throw new Error("INVALID_SCHEDULE");

  switch (platform) {
    case "linkedin":
      return buildLinkedInPayload({ content, title, tags });
    case "medium":
      return buildMediumPayload({ content, title, tags });
    case "portfolio":
    case "cms":
      return buildPortfolioPayload({ content, title, tags });
    case "email-digest":
      return { platform, payload: { subject: title || "Digest", body: content, tags } };
    case "export-api":
      return { platform, payload: { title, content, tags } };
    default:
      throw new Error(`UNSUPPORTED_PLATFORM:${platform}`);
  }
}
