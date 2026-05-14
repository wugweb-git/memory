import { publishToPlatform } from "./platforms";

export async function publishNow(params: { platform: string; content: string }) {
  return publishToPlatform(params.platform, params.content);
}
