/**
 * Neon Logger
 * -----------
 * Specialized logger for L3 outputs. Strictly writes to Postgres (Neon).
 */
import { postgres } from "../../db/postgres";

export async function logDecisionNeon(params: {
  userId: string;
  mode: string;
  context: any;
  output: any;
}) {
  const { userId, mode, context, output } = params;

  const log = await postgres.decisionLog.create({
    data: {
      userId,
      mode,
      contextJson: context,
      outputJson: output,
      confidence: output.confidence
    }
  });

  return log.id;
}
