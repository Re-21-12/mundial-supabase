-- v3.23 · Fix MATCH round values for league 4 (Quiniela Global)
--
-- Problem 1: 72 group stage matches have round=1 → must be NULL
-- Problem 2: 36 knockout matches all have round=2 → delete and re-seed
-- ──────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Group stage: round must be NULL (grupo_id identifies them)
UPDATE "MATCH"
SET    round      = NULL,
       updated_at = NOW()
WHERE  league_id  = 4
AND    grupo_id   IS NOT NULL
AND    is_deleted = false;

-- 2. Remove bad knockout shells for league 4 (will be re-created by seed)
DELETE FROM "MATCH"
WHERE  league_id  = 4
AND    grupo_id   IS NULL
AND    is_deleted = false;

COMMIT;
