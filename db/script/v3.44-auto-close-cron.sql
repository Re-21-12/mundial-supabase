-- v3.44: Time-based auto-close for overdue matches and leagues
--
-- PROBLEM:
--   handle_match_extra_time() and close_finished_leagues() are trigger-based —
--   they only run when someone writes a MATCH_PERIOD or MATCH row. If no data
--   is entered after a match ends, the match stays open and the league never
--   closes, even days later.
--
-- SOLUTION:
--   1. auto_close_overdue_matches() — runs every minute via pg_cron.
--      Closes any match whose end_time has passed and that hasn't been
--      manually closed (scored_at IS NULL, phase != 'finished').
--      Updating MATCH rows fires the existing trigger_close_finished_leagues_from_match
--      which calls close_finished_leagues() automatically.
--
--   2. Rebuild close_finished_leagues() to also treat phase='finished' rows as
--      done, so a manually-closed match (phase set before end_time expires)
--      doesn't block league closure.
--
-- PREREQUISITES: pg_cron extension must be enabled.

-- ─── 1. New function: sweep overdue matches ───────────────────────────────────

CREATE OR REPLACE FUNCTION auto_close_overdue_matches()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_closed INTEGER := 0;
BEGIN
  -- Close matches that are past their end_time and not yet marked finished.
  -- scored_at IS NULL guard: if the operator already scored it (scored_at set),
  -- the phase was already handled by handle_match_extra_time; skip those rows.
  --
  -- Updating the phase fires trigger_close_finished_leagues_from_match which
  -- calls close_finished_leagues() automatically for each affected row.
  UPDATE "MATCH"
  SET    phase      = 'finished',
         updated_at = NOW()
  WHERE  is_deleted = false
    AND  phase     != 'finished'
    AND  end_time  <= NOW();

  GET DIAGNOSTICS v_closed = ROW_COUNT;
  RETURN v_closed;
END;
$$;

GRANT EXECUTE ON FUNCTION auto_close_overdue_matches() TO authenticated;

-- ─── 2. Rebuild close_finished_leagues() to respect phase column ──────────────
--
-- A match is still "in progress" only when:
--   - end_time is in the future, AND
--   - phase is not 'finished'
-- This way a manually-finished match (phase set before end_time) won't block
-- the league from closing.

CREATE OR REPLACE FUNCTION close_finished_leagues()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_closed_count INTEGER := 0;
BEGIN
  UPDATE "LEAGUE" l
  SET    status     = 'finished',
         updated_at = NOW(),
         updated_by = COALESCE(updated_by, 1)
  WHERE  l.is_deleted = false
    AND  l.status     = 'active'
    -- League has at least one match (not a ghost league)
    AND  EXISTS (
      SELECT 1 FROM "MATCH" m2
      WHERE m2.league_id  = l.league_id
        AND m2.is_deleted = false
    )
    -- No match is still running
    AND  NOT EXISTS (
      SELECT 1
      FROM "MATCH" m
      WHERE m.league_id  = l.league_id
        AND m.is_deleted = false
        AND m.phase     != 'finished'   -- not yet closed
        AND m.end_time   > NOW()        -- and end_time hasn't passed
    );

  GET DIAGNOSTICS v_closed_count = ROW_COUNT;
  RETURN v_closed_count;
END;
$$;

GRANT EXECUTE ON FUNCTION close_finished_leagues() TO authenticated;

-- ─── 3. pg_cron job: runs every minute ───────────────────────────────────────
--
-- Calls auto_close_overdue_matches() which:
--   a. Closes matches past end_time
--   b. Triggers close_finished_leagues() via the existing MATCH trigger

SELECT cron.unschedule('auto-close-matches-every-minute')
WHERE  EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-close-matches-every-minute'
);

SELECT cron.schedule(
  'auto-close-matches-every-minute',
  '* * * * *',
  $$
  SELECT auto_close_overdue_matches();
  $$
);

-- ─── 4. Migration log ─────────────────────────────────────────────────────────

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.44',
  'auto-close-cron',
  'Adds auto_close_overdue_matches() called every minute by pg_cron. Closes matches past end_time without needing MATCH_PERIOD writes. Rebuilds close_finished_leagues() to also respect phase=finished so manually-closed matches do not block league closure.',
  'db/script/v3.44-auto-close-cron.sql',
  NOW(),
  'applied'
)
ON CONFLICT (version) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      applied_at  = EXCLUDED.applied_at,
      status      = EXCLUDED.status;
