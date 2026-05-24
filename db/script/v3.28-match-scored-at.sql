-- v3.28: Add scored_at timestamp to MATCH for idempotent scoring
-- Apply in Supabase SQL editor before deploying the scoring service.

ALTER TABLE "MATCH"
  ADD COLUMN IF NOT EXISTS scored_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN "MATCH".scored_at IS
  'Timestamp when match predictions were evaluated and points awarded. NULL = not yet scored.';
