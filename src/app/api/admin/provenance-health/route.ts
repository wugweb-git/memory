import { NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      outputFingerprints,
      verifiedHuman,
      feedbackEntries,
      evolutionLogs,
      executionAudits,
    ] = await Promise.all([
      postgres.outputFingerprint.count().catch(() => 0),
      postgres.outputFingerprint.count({ where: { verifiedHuman: true } }).catch(() => 0),
      postgres.feedbackMemory.count().catch(() => 0),
      postgres.personaEvolutionLog.count().catch(() => 0),
      postgres.executionAuditLog.count().catch(() => 0),
    ]);

    const unverified = Math.max(0, outputFingerprints - verifiedHuman);
    const contaminationRatio = outputFingerprints > 0 ? Number((unverified / outputFingerprints).toFixed(4)) : 0;

    return NextResponse.json({
      status: "ok",
      provenance: outputFingerprints > 0 ? "active" : "idle",
      aiDetection: unverified > 0 ? "active" : "idle",
      metrics: {
        outputFingerprints,
        verifiedHuman,
        unverified,
        contaminationRatio,
        feedbackEntries,
        evolutionLogs,
        executionAudits,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[ADMIN] provenance-health error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
