-- Identity Prism's semantic-graph entities move to their own table.
--
-- Why: this app shares one Neon database with wugweb-site. wugweb-site already
-- owns public."entities" as its content-owner registry (rows: vedanshu, wugweb,
-- both) and content_items.owner / content_relations.owner have foreign keys
-- into it. Prisma's Entity model was also mapped to "entities", so the graph
-- code hit wugweb's table and failed with P2022 (missing processing_state,
-- type, ...). Model Entity is now @@map("graph_entities").
--
-- This migration:
--   * never touches public."entities" (wugweb-site's table),
--   * creates graph_entities fresh (the graph never had rows of its own —
--     entity_aliases is empty as of 2026-09-21),
--   * points entity_aliases.entity_id at graph_entities.
-- Every statement is idempotent so it is safe if the table was created by
-- hand or by `prisma db push` first.

CREATE TABLE IF NOT EXISTS "graph_entities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "fallback" BOOLEAN NOT NULL DEFAULT false,
    "packet_ids" TEXT[],
    "source_chunk_ids" TEXT[],
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "embedding" DOUBLE PRECISION[],
    "metadata" JSONB,
    "processing_state" TEXT NOT NULL DEFAULT 'complete',
    "source_type" TEXT NOT NULL DEFAULT 'llm',
    "dedup_hash" TEXT NOT NULL,
    "test_run_id" TEXT NOT NULL DEFAULT 'PROD',

    CONSTRAINT "graph_entities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "graph_entities_dedup_hash_idx" ON "graph_entities"("dedup_hash");
CREATE INDEX IF NOT EXISTS "graph_entities_type_idx" ON "graph_entities"("type");
CREATE INDEX IF NOT EXISTS "graph_entities_test_run_id_idx" ON "graph_entities"("test_run_id");
CREATE INDEX IF NOT EXISTS "graph_entities_processing_state_idx" ON "graph_entities"("processing_state");
CREATE INDEX IF NOT EXISTS "graph_entities_verified_idx" ON "graph_entities"("verified");
CREATE UNIQUE INDEX IF NOT EXISTS "graph_entities_normalized_name_type_test_run_id_key" ON "graph_entities"("normalized_name", "type", "test_run_id");

-- entity_aliases FK -> graph_entities (drop any stale FK first). NOT VALID so the
-- migration cannot fail on pre-existing alias rows; new writes are still checked.
ALTER TABLE "entity_aliases" DROP CONSTRAINT IF EXISTS "entity_aliases_entity_id_fkey";
ALTER TABLE "entity_aliases" ADD CONSTRAINT "entity_aliases_entity_id_fkey"
  FOREIGN KEY ("entity_id") REFERENCES "graph_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
