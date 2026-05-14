-- Layer 4 Persona + Behavioral Intelligence Engine
-- Production-safe transform preserving existing data where possible.

-- 1) Evolve existing persona_profiles into new contract
ALTER TABLE "persona_profiles"
  ADD COLUMN IF NOT EXISTS "displayName" TEXT,
  ADD COLUMN IF NOT EXISTS "communicationStyle" JSONB,
  ADD COLUMN IF NOT EXISTS "writingStyle" JSONB,
  ADD COLUMN IF NOT EXISTS "decisionStyle" JSONB,
  ADD COLUMN IF NOT EXISTS "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "persona_profiles"
  DROP COLUMN IF EXISTS "publicTraits",
  DROP COLUMN IF EXISTS "positioningKeywords",
  DROP COLUMN IF EXISTS "bioSummary";

-- 2) New Layer 4 tables
CREATE TABLE IF NOT EXISTS "behavioral_traits" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "traitName" TEXT NOT NULL,
  "traitValue" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "evidenceCount" INTEGER NOT NULL DEFAULT 0,
  "sourceLayer" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "behavioral_traits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "communication_patterns" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "patternType" TEXT,
  "patternValue" JSONB,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "sampleCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "communication_patterns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "preference_memory" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "category" TEXT,
  "key" TEXT,
  "value" JSONB,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "source" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "preference_memory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "output_fingerprints" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "styleVector" JSONB,
  "aiProbability" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "humanProbability" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "verifiedHuman" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "output_fingerprints_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "persona_evolution_logs" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "changedField" TEXT,
  "oldValue" JSONB,
  "newValue" JSONB,
  "reason" TEXT,
  "confidenceDelta" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "persona_evolution_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "feedback_memory" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "targetType" TEXT,
  "targetId" TEXT,
  "feedbackType" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "feedback_memory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "adaptive_ux_profiles" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "uiDensity" TEXT NOT NULL DEFAULT 'minimal',
  "preferredMode" TEXT,
  "preferredOutputLength" TEXT,
  "preferredNavigationStyle" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "adaptive_ux_profiles_pkey" PRIMARY KEY ("id")
);

-- 3) Indexes and unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "behavioral_traits_userId_traitName_key"
  ON "behavioral_traits"("userId", "traitName");
CREATE INDEX IF NOT EXISTS "behavioral_traits_userId_idx"
  ON "behavioral_traits"("userId");

CREATE INDEX IF NOT EXISTS "communication_patterns_userId_patternType_idx"
  ON "communication_patterns"("userId", "patternType");

CREATE INDEX IF NOT EXISTS "preference_memory_userId_idx"
  ON "preference_memory"("userId");
CREATE INDEX IF NOT EXISTS "preference_memory_userId_category_key_idx"
  ON "preference_memory"("userId", "category", "key");

CREATE INDEX IF NOT EXISTS "output_fingerprints_userId_idx"
  ON "output_fingerprints"("userId");
CREATE INDEX IF NOT EXISTS "output_fingerprints_userId_sourceType_sourceId_idx"
  ON "output_fingerprints"("userId", "sourceType", "sourceId");

CREATE INDEX IF NOT EXISTS "persona_evolution_logs_userId_createdAt_idx"
  ON "persona_evolution_logs"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "feedback_memory_userId_idx"
  ON "feedback_memory"("userId");
CREATE INDEX IF NOT EXISTS "feedback_memory_userId_targetType_targetId_idx"
  ON "feedback_memory"("userId", "targetType", "targetId");

CREATE UNIQUE INDEX IF NOT EXISTS "adaptive_ux_profiles_userId_key"
  ON "adaptive_ux_profiles"("userId");