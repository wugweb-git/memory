-- schema.prisma has defined a full set of columns on the Entity model for a
-- while (see BUG-005 in docs/PROJECT_TRACKER.md, and CLAUDE.local.md's note
-- that several L2.5 tables were patched via ad-hoc `prisma db execute`
-- rather than tracked migrations). Production `entities` drifted from the
-- schema. Confirmed live via Vercel runtime error logs (2026-08-16):
--   - GET /api/health/system -> P2022 "column entities.processing_state
--     does not exist"
--   - GET /api/semantic/graph -> P2022 "column entities.type does not exist"
-- Rather than guess which other columns are also missing, this migration
-- brings `entities` to full parity with the current schema, column by
-- column, entirely with IF NOT EXISTS guards — safe to run whether a given
-- column already exists or not, and safe on an empty or populated table
-- (every NOT NULL addition carries a default).
--
-- Constraints/indexes are handled the same way. The @@unique([normalized_name,
-- type, test_run_id]) constraint is intentionally NOT added here — adding a
-- unique constraint blind (without knowing if existing rows would violate
-- it) is the one genuinely unsafe operation in this set, and dedup on this
-- table has been handled at the application layer since BUG-003. Revisit
-- separately once the table is confirmed to be in a clean state.

ALTER TABLE "entities"
  ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "normalized_name" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "fallback" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "packet_ids" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "source_chunk_ids" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "occurrences" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "embedding" DOUBLE PRECISION[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "processing_state" TEXT NOT NULL DEFAULT 'complete',
  ADD COLUMN IF NOT EXISTS "source_type" TEXT NOT NULL DEFAULT 'llm',
  ADD COLUMN IF NOT EXISTS "dedup_hash" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "test_run_id" TEXT NOT NULL DEFAULT 'PROD';

CREATE INDEX IF NOT EXISTS "entities_dedup_hash_idx" ON "entities" ("dedup_hash");
CREATE INDEX IF NOT EXISTS "entities_type_idx" ON "entities" ("type");
CREATE INDEX IF NOT EXISTS "entities_test_run_id_idx" ON "entities" ("test_run_id");
CREATE INDEX IF NOT EXISTS "entities_processing_state_idx" ON "entities" ("processing_state");
CREATE INDEX IF NOT EXISTS "entities_verified_idx" ON "entities" ("verified");
