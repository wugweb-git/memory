-- Remove the 15 graph columns that migration 20260816070800 grafted onto
-- public."entities" (a table this app does not own; the graph now lives in
-- "graph_entities"). Owner approved 2026-11-18.
--
-- Guards: only runs when the table has the foreign shape (entity_type present)
-- and none of the grafted columns holds graph data. "name" is NOT dropped — it
-- belonged to the table before. Safe/no-op on fresh databases.
DO $$
DECLARE
  has_graph_data boolean := false;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'entities' AND column_name = 'entity_type'
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'entities' AND column_name = 'dedup_hash'
  ) THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.entities WHERE dedup_hash <> '''' OR normalized_name <> '''')'
      INTO has_graph_data;
  END IF;

  IF has_graph_data THEN
    RAISE NOTICE 'entities has graph data in grafted columns; skipping drop';
    RETURN;
  END IF;

  ALTER TABLE public.entities
    DROP COLUMN IF EXISTS normalized_name,
    DROP COLUMN IF EXISTS type,
    DROP COLUMN IF EXISTS confidence,
    DROP COLUMN IF EXISTS verified,
    DROP COLUMN IF EXISTS fallback,
    DROP COLUMN IF EXISTS packet_ids,
    DROP COLUMN IF EXISTS source_chunk_ids,
    DROP COLUMN IF EXISTS occurrences,
    DROP COLUMN IF EXISTS last_seen,
    DROP COLUMN IF EXISTS embedding,
    DROP COLUMN IF EXISTS metadata,
    DROP COLUMN IF EXISTS processing_state,
    DROP COLUMN IF EXISTS source_type,
    DROP COLUMN IF EXISTS dedup_hash,
    DROP COLUMN IF EXISTS test_run_id;
END
$$;
