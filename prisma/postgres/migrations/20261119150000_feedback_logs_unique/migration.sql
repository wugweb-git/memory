-- MANUAL APPLY REQUIRED: this migration is NOT applied automatically. Apply it
-- by hand to Neon (e.g. psql / Neon SQL editor) before relying on it.
-- Additive (database is shared with another app): closes the feedback
-- idempotency race. Step 1 deletes exact duplicate feedback_logs rows, keeping
-- the earliest-created row (ties broken by smallest id); step 2 adds the unique
-- index the route relies on (Prisma P2002 => duplicate). Only feedback_logs is touched.
DELETE FROM "feedback_logs" a
USING "feedback_logs" b
WHERE a."decisionId" = b."decisionId"
  AND a."userId" = b."userId"
  AND a."feedbackType" = b."feedbackType"
  AND (a."createdAt" > b."createdAt" OR (a."createdAt" = b."createdAt" AND a."id" > b."id"));

CREATE UNIQUE INDEX IF NOT EXISTS "feedback_logs_decisionId_userId_feedbackType_key"
  ON "feedback_logs"("decisionId", "userId", "feedbackType");
