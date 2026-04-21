-- CreateTable
CREATE TABLE "behavior_models" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "modelType" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "sourceIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "behavior_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trait_scores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trait" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "sourceIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trait_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "explicit" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "sourceIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "style_patterns" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "style_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persona_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicTraits" TEXT[],
    "positioningKeywords" TEXT[],
    "bioSummary" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persona_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "behavior_models_userId_modelType_key_key" ON "behavior_models"("userId", "modelType", "key");

-- CreateIndex
CREATE UNIQUE INDEX "trait_scores_userId_trait_key" ON "trait_scores"("userId", "trait");

-- CreateIndex
CREATE UNIQUE INDEX "preferences_userId_category_key_key" ON "preferences"("userId", "category", "key");

-- CreateIndex
CREATE UNIQUE INDEX "style_patterns_userId_pattern_key" ON "style_patterns"("userId", "pattern");

-- CreateIndex
CREATE UNIQUE INDEX "persona_profiles_userId_key" ON "persona_profiles"("userId");
