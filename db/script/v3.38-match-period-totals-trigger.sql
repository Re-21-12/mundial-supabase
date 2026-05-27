-- v3.38: Auto-sync MATCH totals from MATCH_PERIOD rows
--
-- Problem: MATCH.first_team_total / second_team_total were never recalculated
-- when a MATCH_PERIOD was inserted, updated, or deleted. Both the scoreboard
-- page (match-scoreboard.ts) and the CRUD page (match-period.ts) only wrote
-- the period row and left the match totals stale.
--
-- Fix: an AFTER trigger on MATCH_PERIOD that recomputes the SUM of all
-- non-deleted periods for the affected match and writes it back to MATCH.

CREATE OR REPLACE FUNCTION sync_match_totals_from_periods()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match_id INTEGER;
BEGIN
  -- Determine which match to recalculate (handle DELETE where NEW is null)
  v_match_id := COALESCE(NEW.match_id, OLD.match_id);

  IF v_match_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE "MATCH"
  SET
    first_team_total  = COALESCE((
      SELECT SUM(COALESCE(first_team_score, 0))
      FROM   "MATCH_PERIOD"
      WHERE  match_id   = v_match_id
        AND  is_deleted = false
    ), 0),
    second_team_total = COALESCE((
      SELECT SUM(COALESCE(second_team_score, 0))
      FROM   "MATCH_PERIOD"
      WHERE  match_id   = v_match_id
        AND  is_deleted = false
    ), 0),
    updated_at = NOW()
  WHERE match_id = v_match_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_match_totals ON "MATCH_PERIOD";

CREATE TRIGGER trg_sync_match_totals
  AFTER INSERT OR UPDATE OR DELETE ON "MATCH_PERIOD"
  FOR EACH ROW
  EXECUTE FUNCTION sync_match_totals_from_periods();

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.38',
  'match-period-totals-trigger',
  'Adds AFTER trigger on MATCH_PERIOD that recomputes MATCH.first_team_total and second_team_total as the SUM of all non-deleted periods whenever a period is inserted, updated, or deleted.',
  'db/script/v3.38-match-period-totals-trigger.sql',
  NOW(),
  'applied'
)
ON CONFLICT (version) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      applied_at  = EXCLUDED.applied_at,
      status      = EXCLUDED.status;
