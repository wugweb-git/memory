/**
 * History Compressor
 * ------------------
 * Compresses recent decision logs to provide historical context
 * while avoiding context bloat in the prompt.
 */
import { postgres } from "../../db/postgres";

export async function compressHistory(userId: string) {
  try {
    const recent = await postgres.decisionLog.findMany({
      where: { userId },
      take: 5,
      orderBy: { createdAt: "desc" }
    });

    return recent.map(r => ({
      mode: r.mode,
      recommendations: (r.outputJson as any)?.recommendations || []
    }));
  } catch (err) {
    console.warn("[Cognitive/History] History retrieval failed, proceeding without history context.");
    return [];
  }
}
