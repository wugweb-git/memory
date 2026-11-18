import { publishToPlatform, type PlatformPublishResult } from "./platforms";

export async function publishNow(params: {
  platform: string;
  content: string;
  /** Platform-formatted payload from routeDistribution; preferred over raw content. */
  payload?: unknown;
}): Promise<PlatformPublishResult> {
  // Thread the built payload through to the platform dispatch. Raw content is
  // only a last-resort fallback when no payload was routed (should not happen
  // on the normal publish path).
  return publishToPlatform(params.platform, params.payload ?? params.content);
}
