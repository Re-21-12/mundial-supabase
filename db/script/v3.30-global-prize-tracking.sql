-- v3.31: Add global_prizes_distributed_at to WORLD_LEAGUE
-- Enables idempotent global prize distribution once all betting leagues close.

ALTER TABLE "WORLD_LEAGUE"
  ADD COLUMN IF NOT EXISTS global_prizes_distributed_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN "WORLD_LEAGUE".global_prizes_distributed_at IS
  'Timestamp when global prizes (1% pool across all betting leagues) were distributed. NULL = not yet done.';
