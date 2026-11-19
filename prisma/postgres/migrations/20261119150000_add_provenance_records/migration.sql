-- MANUAL APPLY REQUIRED: apply this to Neon by hand (e.g. `prisma db execute`); it is not run automatically.
-- Additive only (database is shared with another app): provenance ledger.
-- Creates one new table and its indexes; no other table is altered or dropped.
CREATE TABLE IF NOT EXISTS "provenance_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "aiLikelihood" DOUBLE PRECISION NOT NULL,
    "confidence" TEXT NOT NULL,
    "signals" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provenance_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "provenance_records_subjectType_subjectId_idx" ON "provenance_records"("subjectType", "subjectId");
CREATE INDEX IF NOT EXISTS "provenance_records_userId_createdAt_idx" ON "provenance_records"("userId", "createdAt");
