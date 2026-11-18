-- Additive only (database is shared with another app): owner-curated visibility
-- flag on memory packets. Default false = nothing is public until the owner
-- marks it. Touches only memory_packets; no other table is altered or dropped.
ALTER TABLE "memory_packets" ADD COLUMN IF NOT EXISTS "is_public" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "memory_packets_is_public_idx" ON "memory_packets"("is_public");
