import { createHash } from "node:crypto";
import { detectAiLikelihood } from "./detection";

export type ProvenanceSubjectType = "output" | "memory_packet" | "draft";

/** Minimal slice of the Prisma delegate the ledger needs (injectable for tests). */
export interface ProvenanceDb {
  provenanceRecord: {
    findFirst(args: any): Promise<any>;
    create(args: any): Promise<any>;
    findMany(args: any): Promise<any[]>;
  };
}

async function resolveDb(db?: ProvenanceDb): Promise<ProvenanceDb> {
  if (db) return db;
  const mod = await import("@/lib/db/postgres");
  return mod.postgres as unknown as ProvenanceDb;
}

export function hashContent(text: string): string {
  return createHash("sha256").update(text || "").digest("hex");
}

/**
 * Records an AI-likelihood assessment for a subject. Idempotent per
 * (subjectType, subjectId, contentHash): re-recording identical content returns the
 * existing row. Never throws; returns null on any failure (logged).
 */
export async function recordProvenance(
  params: {
    userId: string;
    subjectType: ProvenanceSubjectType;
    subjectId: string;
    text: string;
    source: string;
  },
  db?: ProvenanceDb,
) {
  try {
    const client = await resolveDb(db);
    const contentHash = hashContent(params.text);
    const existing = await client.provenanceRecord.findFirst({
      where: { subjectType: params.subjectType, subjectId: params.subjectId, contentHash },
    });
    if (existing) return existing;
    const result = detectAiLikelihood(params.text);
    return await client.provenanceRecord.create({
      data: {
        userId: params.userId,
        subjectType: params.subjectType,
        subjectId: params.subjectId,
        contentHash,
        aiLikelihood: result.aiProbability,
        confidence: result.confidence,
        signals: result.signals,
        source: params.source,
      },
    });
  } catch (err) {
    console.error("[Provenance] recordProvenance failed:", err);
    return null;
  }
}

export async function listProvenance(
  params: { userId?: string; subjectType?: ProvenanceSubjectType; subjectId?: string; limit?: number },
  db?: ProvenanceDb,
) {
  const client = await resolveDb(db);
  const where: Record<string, unknown> = {};
  if (params.userId) where.userId = params.userId;
  if (params.subjectType) where.subjectType = params.subjectType;
  if (params.subjectId) where.subjectId = params.subjectId;
  return client.provenanceRecord.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.max(1, Math.min(params.limit ?? 50, 200)),
  });
}
