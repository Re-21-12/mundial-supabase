-- v3.51: Close match immediately when scored_at is set
--
-- PROBLEM:
--   When an operator sets scored_at (marking predictions as scoreable),
--   the match phase stays in 'penalty' or 'extra_time' until the cron runs.
--   close_finished_leagues() won't fire because it checks phase != 'finished',
--   so leagues can stay open up to 60 min after the operator has scored the match.
--
-- SOLUTION:
--   BEFORE UPDATE trigger: when scored_at transitions NULL → NOT NULL,
--   set phase = 'finished' on the same row (no extra UPDATE needed).
--   This fires the existing AFTER UPDATE trigger chain that calls
--   close_finished_leagues() immediately.

CREATE OR REPLACE FUNCTION trg_close_match_on_scored()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.scored_at IS NULL AND NEW.scored_at IS NOT NULL THEN
    IF NEW.phase != 'finished' THEN
      NEW.phase := 'finished';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_close_on_scored ON "MATCH";
CREATE TRIGGER trg_close_on_scored
  BEFORE UPDATE ON "MATCH"
  FOR EACH ROW
  EXECUTE FUNCTION trg_close_match_on_scored();

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.51',
  'close-match-on-scored',
  'Adds BEFORE UPDATE trigger trg_close_on_scored: when scored_at is set, phase is set to finished in the same UPDATE so close_finished_leagues fires immediately without waiting for the cron.',
  'db/script/v3.51-close-match-on-scored.sql',
  NOW(),
  'applied'
)
ON CONFLICT (version) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      applied_at  = EXCLUDED.applied_at,
      status      = EXCLUDED.status;
