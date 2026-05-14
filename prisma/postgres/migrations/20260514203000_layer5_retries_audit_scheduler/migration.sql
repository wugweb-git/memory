CREATE TABLE IF NOT EXISTS "scheduler_state" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT UNIQUE NOT NULL,
  "value" JSONB,
  "updatedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "retry_queue" (
  "id" TEXT PRIMARY KEY,
  "queueType" TEXT NOT NULL,
  "refId" TEXT NOT NULL,
  "status" TEXT DEFAULT 'pending',
  "retryCount" INTEGER DEFAULT 0,
  "nextRetryAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "execution_audit_logs" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "eventType" TEXT NOT NULL,
  "payload" JSONB,
  "status" TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);