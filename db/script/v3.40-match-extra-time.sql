-- v3.40: Automatic extra time and auto-close for tied matches
--
-- Flow (fired after every MATCH_PERIOD save, when sync_match_totals runs):
--   1. end_time reached AND tied AND phase = 'regulation'
--      → extend end_time +30 min, set phase = 'extra_time'
--   2. end_time reached AND still tied AND phase = 'extra_time'
--      → set phase = 'finished' (match is closed; operator still scores predictions)
--
-- scored_at is intentionally NOT touched here so that the Angular prediction
-- evaluation pipeline (evaluatePredictionsForMatch) still runs normally.

-- ─── 1. Add phase column ──────────────────────────────────────────────────────

ALTER TABLE "MATCH"
  ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'regulation'
    CHECK (phase IN ('regulation', 'extra_time', 'finished'));

-- ─── 2. Extra-time handler function ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_match_extra_time(p_match_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match RECORD;
BEGIN
  SELECT match_id, start_time, end_time,
         first_team_total, second_team_total,
         scored_at, phase
  INTO   v_match
  FROM   "MATCH"
  WHERE  match_id   = p_match_id
    AND  is_deleted = false;

  -- Skip if match not found, already fully scored, or still running
  IF v_match.match_id IS NULL   THEN RETURN; END IF;
  IF v_match.scored_at IS NOT NULL THEN RETURN; END IF;
  IF v_match.phase = 'finished'    THEN RETURN; END IF;
  IF NOW() < v_match.end_time      THEN RETURN; END IF;

  -- Only act on ties
  IF COALESCE(v_match.first_team_total, 0) <> COALESCE(v_match.second_team_total, 0) THEN
    RETURN;
  END IF;

  IF v_match.phase = 'regulation' THEN
    -- Regulation over, tied → grant 30 min extra time
    UPDATE "MATCH"
    SET    end_time   = v_match.end_time + INTERVAL '30 minutes',
           phase      = 'extra_time',
           updated_at = NOW()
    WHERE  match_id   = p_match_id;

  ELSIF v_match.phase = 'extra_time' THEN
    -- Extra time over, still tied → close the match
    -- scored_at is left NULL so the operator can still evaluate predictions
    UPDATE "MATCH"
    SET    phase      = 'finished',
           updated_at = NOW()
    WHERE  match_id   = p_match_id;
  END IF;
END;
$$;

-- ─── 3. Rebuild sync_match_totals trigger to call the handler ─────────────────

CREATE OR REPLACE FUNCTION sync_match_totals_from_periods()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match_id INTEGER;
BEGIN
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

  -- After syncing totals, check if extra time logic applies
  PERFORM handle_match_extra_time(v_match_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ─── 4. Enable Realtime for MATCH so Angular picks up phase changes ───────────

ALTER TABLE "MATCH" REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE "MATCH";
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.40',
  'match-extra-time',
  'Adds MATCH.phase column (regulation/extra_time/finished). Trigger handle_match_extra_time() extends end_time +30 min when tied at regulation end, then sets phase=finished when still tied after extra time. Called from sync_match_totals_from_periods trigger.',
  'db/script/v3.40-match-extra-time.sql',
  NOW(),
  'applied'
)
ON CONFLICT (version) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      applied_at  = EXCLUDED.applied_at,
      status      = EXCLUDED.status;
