-- v3.50: Fix penalty phase transition
--
-- BUGS fixed:
--   1. MATCH.phase CHECK constraint missing 'penalty' → handle_match_extra_time()
--      fails with constraint violation when extra_time ends tied, rolling back
--      the operator's MATCH_PERIOD write.
--   2. auto_close_overdue_matches() closes tied extra_time matches as 'finished',
--      skipping the penalty phase entirely.
--   3. handle_match_extra_time() applied extra_time to group-stage matches
--      (grupo_id IS NOT NULL), which should end as draws.

-- ── 1. Extend CHECK constraint to include 'penalty' ──────────────────────────

ALTER TABLE "MATCH" DROP CONSTRAINT IF EXISTS "MATCH_phase_check";
ALTER TABLE "MATCH"
  ADD CONSTRAINT "MATCH_phase_check"
  CHECK (phase IN ('regulation', 'extra_time', 'penalty', 'finished'));

-- ── 2. Fix handle_match_extra_time ───────────────────────────────────────────
--   • Skip group-stage matches (grupo_id IS NOT NULL) for regulation → extra_time
--   • Extend end_time +60 min when transitioning to penalty so the cron
--     does not immediately close the match during the shootout

CREATE OR REPLACE FUNCTION handle_match_extra_time(p_match_id integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_match RECORD;
BEGIN
  SELECT match_id, end_time, first_team_total, second_team_total,
         scored_at, phase, grupo_id
  INTO   v_match
  FROM   "MATCH"
  WHERE  match_id = p_match_id AND is_deleted = false;

  IF v_match.match_id   IS NULL              THEN RETURN; END IF;
  IF v_match.scored_at  IS NOT NULL          THEN RETURN; END IF;
  IF v_match.phase IN ('finished','penalty') THEN RETURN; END IF;
  IF NOW() < v_match.end_time               THEN RETURN; END IF;
  -- Only act on ties
  IF COALESCE(v_match.first_team_total,  0)
   <> COALESCE(v_match.second_team_total, 0) THEN RETURN; END IF;

  IF v_match.phase = 'regulation' THEN
    -- Group-stage matches end as draws — no extra time
    IF v_match.grupo_id IS NOT NULL THEN RETURN; END IF;
    -- Knockout: grant 30-min extra time
    UPDATE "MATCH"
    SET    phase      = 'extra_time',
           end_time   = v_match.end_time + INTERVAL '30 minutes',
           updated_at = NOW()
    WHERE  match_id   = p_match_id;

  ELSIF v_match.phase = 'extra_time' THEN
    -- Still tied after extra time → penalty shootout
    -- Give the operator 60 min to enter penalty scores before auto-close
    UPDATE "MATCH"
    SET    phase      = 'penalty',
           end_time   = NOW() + INTERVAL '60 minutes',
           updated_at = NOW()
    WHERE  match_id   = p_match_id;
  END IF;
END;
$$;

-- ── 3. Fix auto_close_overdue_matches ────────────────────────────────────────
--   Step 1: tied extra_time bracket matches → penalty (with 60-min extension)
--   Step 2: all other overdue non-penalty matches → finished
--   Step 3: overdue penalty matches (operator timed out) → finished

CREATE OR REPLACE FUNCTION auto_close_overdue_matches()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_closed INTEGER := 0;
  v_count  INTEGER := 0;
BEGIN
  -- Step 1: extra_time, tied, bracket → penalty
  UPDATE "MATCH"
  SET    phase      = 'penalty',
         end_time   = NOW() + INTERVAL '60 minutes',
         updated_at = NOW()
  WHERE  is_deleted = false
    AND  phase      = 'extra_time'
    AND  end_time  <= NOW()
    AND  grupo_id  IS NULL
    AND  COALESCE(first_team_total, 0) = COALESCE(second_team_total, 0);

  -- Step 2: all other overdue matches not in penalty or finished
  UPDATE "MATCH"
  SET    phase      = 'finished',
         updated_at = NOW()
  WHERE  is_deleted = false
    AND  phase NOT IN ('finished', 'penalty')
    AND  end_time  <= NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_closed := v_closed + v_count;

  -- Step 3: penalty matches past their 60-min shootout window
  UPDATE "MATCH"
  SET    phase      = 'finished',
         updated_at = NOW()
  WHERE  is_deleted = false
    AND  phase      = 'penalty'
    AND  end_time  <= NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_closed := v_closed + v_count;

  RETURN v_closed;
END;
$$;

GRANT EXECUTE ON FUNCTION handle_match_extra_time(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_close_overdue_matches()      TO authenticated;

-- ── Migration log ─────────────────────────────────────────────────────────────

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.50',
  'penalty-phase-fix',
  'Adds penalty to MATCH.phase CHECK constraint. Fixes handle_match_extra_time to skip group-stage ties and extend end_time +60 min on penalty transition. Fixes auto_close_overdue_matches to route tied extra_time bracket matches to penalty instead of finished.',
  'db/script/v3.50-penalty-phase-fix.sql',
  NOW(),
  'applied'
)
ON CONFLICT (version) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      applied_at  = EXCLUDED.applied_at,
      status      = EXCLUDED.status;
