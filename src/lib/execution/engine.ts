import { routeDistribution } from "@/lib/distribution/router";

export function buildExecutionPacket(input: {
  outputId: string;
  userId: string;
  platform: string;
  content: string;
  title?: string;
  tags?: string[];
}) {
  const routed = routeDistribution(input);
  return {
    state: "queued",
    outputId: input.outputId,
    userId: input.userId,
    platform: input.platform,
    payload: routed.payload,
    metadata: routed,
  };
}
