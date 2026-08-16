-- schema.prisma has defined `processing_state` on the Entity model for a
-- while (see BUG-005 in docs/PROJECT_TRACKER.md), and the column was added
-- to 5 sibling tables (topics, signals, patterns, semantic_objects,
-- relationships) via an ad-hoc `prisma db execute`, per CLAUDE.local.md.
-- The `entities` table was missed. Confirmed live 2026-08-16:
-- GET /api/health/system -> 500 "column entities.processing_state does not
-- exist". This migration closes that gap. Additive + backward compatible:
-- existing rows get the same default the schema already expects.

ALTER TABLE "entities"
  ADD COLUMN IF NOT EXISTS "processing_state" TEXT NOT NULL DEFAULT 'complete';

CREATE INDEX IF NOT EXISTS "entities_processing_state_idx"
  ON "entities" ("processing_state");
