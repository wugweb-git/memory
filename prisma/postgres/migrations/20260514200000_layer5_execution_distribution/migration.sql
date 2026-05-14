CREATE TABLE IF NOT EXISTS "publishing_queue" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "outputId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "status" TEXT DEFAULT 'pending',
  "scheduledAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "retryCount" INTEGER DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "published_outputs" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "outputId" TEXT NOT NULL,
  "platform" TEXT,
  "externalId" TEXT,
  "externalUrl" TEXT,
  "publishedContent" JSONB,
  "analytics" JSONB,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "workflow_logs" (
  "id" TEXT PRIMARY KEY,
  "workflowName" TEXT,
  "status" TEXT,
  "payload" JSONB,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "external_feedback" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "platform" TEXT,
  "externalPostId" TEXT,
  "feedbackType" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "automation_rules" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "triggerType" TEXT,
  "conditions" JSONB,
  "action" JSONB,
  "enabled" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);