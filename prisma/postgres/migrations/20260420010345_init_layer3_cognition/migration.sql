-- CreateTable
CREATE TABLE "decision_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "contextJson" JSONB NOT NULL,
    "outputJson" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_logs" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "decision_logs_userId_createdAt_idx" ON "decision_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "feedback_logs_decisionId_idx" ON "feedback_logs"("decisionId");

-- CreateIndex
CREATE INDEX "feedback_logs_userId_idx" ON "feedback_logs"("userId");
