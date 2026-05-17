import { NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";

export async function GET() {
  try {
    const activeProfiles = await postgres.personaProfile.count();
    const totalTraits = await postgres.behavioralTrait.count();
    const avgConfidence = await postgres.behavioralTrait.aggregate({
      _avg: { confidence: true },
    });
    const totalFingerprints = await postgres.outputFingerprint.count();
    const verifiedHumanCount = await postgres.outputFingerprint.count({
      where: { verifiedHuman: true },
    });
    const totalPreferences = await postgres.preferenceMemory.count();
    const totalLogs = await postgres.personaEvolutionLog.count();
    const feedbackCount = await postgres.feedbackMemory.count();

    const avgProfileConfidence = await postgres.personaProfile.aggregate({
      _avg: { confidenceScore: true },
    });

    const contaminationRatio =
      totalFingerprints > 0
        ? Math.round(
            ((totalFingerprints - verifiedHumanCount) / totalFingerprints) * 10000
          ) / 100
        : 0;

    return NextResponse.json({
      status: "ok",
      personaConfidence: avgProfileConfidence._avg.confidenceScore ?? 0,
      averageTraitConfidence: avgConfidence._avg.confidence ?? 0,
      contaminationRatio: `${contaminationRatio}%`,
      counts: {
        activeProfiles,
        behavioralTraits: totalTraits,
        fingerprints: totalFingerprints,
        verifiedHuman: verifiedHumanCount,
        preferences: totalPreferences,
        evolutionLogs: totalLogs,
        feedbackEntries: feedbackCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        error: (err as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}