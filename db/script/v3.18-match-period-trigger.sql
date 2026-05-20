-- v3.18: MATCH_PERIOD trigger — auto-sync match totals + TEAM_LEAGUE standings

-- ── 1. Sync MATCH totals from period SUM ─────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_match_totals(p_match_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE "MATCH"
  SET
    first_team_total = (
      SELECT COALESCE(SUM(first_team_score), 0)
      FROM   "MATCH_PERIOD"
      WHERE  match_id  = p_match_id
        AND  is_deleted = false
    ),
    second_team_total = (
      SELECT COALESCE(SUM(second_team_score), 0)
      FROM   "MATCH_PERIOD"
      WHERE  match_id  = p_match_id
        AND  is_deleted = false
    ),
    updated_at = NOW()
  WHERE match_id = p_match_id;
END;
$$;

-- ── 2. Recompute a team's full standing in a league ───────────────────────────
--
--  Considers only matches whose end_time has passed (finished matches).
--  Recalculates from scratch to avoid drift on edits/deletes.
--

CREATE OR REPLACE FUNCTION recompute_team_standing(p_team_id INTEGER, p_league_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_gp  INTEGER := 0;
  v_w   INTEGER := 0;
  v_d   INTEGER := 0;
  v_l   INTEGER := 0;
  v_gf  INTEGER := 0;
  v_ga  INTEGER := 0;
  v_pts INTEGER := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      m.first_team_id,
      m.second_team_id,
      COALESCE(m.first_team_total,  0) AS ft,
      COALESCE(m.second_team_total, 0) AS st
    FROM  "MATCH" m
    WHERE m.league_id = p_league_id
      AND m.is_deleted = false
      AND (m.first_team_id = p_team_id OR m.second_team_id = p_team_id)
      AND m.end_time <= NOW()
  LOOP
    v_gp := v_gp + 1;

    IF r.first_team_id = p_team_id THEN
      v_gf := v_gf + r.ft;
      v_ga := v_ga + r.st;
      IF    r.ft > r.st THEN v_w := v_w + 1; v_pts := v_pts + 3;
      ELSIF r.ft = r.st THEN v_d := v_d + 1; v_pts := v_pts + 1;
      ELSE                   v_l := v_l + 1;
      END IF;
    ELSE
      v_gf := v_gf + r.st;
      v_ga := v_ga + r.ft;
      IF    r.st > r.ft THEN v_w := v_w + 1; v_pts := v_pts + 3;
      ELSIF r.st = r.ft THEN v_d := v_d + 1; v_pts := v_pts + 1;
      ELSE                   v_l := v_l + 1;
      END IF;
    END IF;
  END LOOP;

  UPDATE "TEAM_LEAGUE"
  SET
    points       = v_pts,
    games_played = v_gp,
    wins         = v_w,
    draws        = v_d,
    losses       = v_l,
    goals_for    = v_gf,
    goals_against = v_ga,
    updated_at   = NOW()
  WHERE team_id  = p_team_id
    AND league_id = p_league_id
    AND is_deleted = false;
END;
$$;

-- ── 3. Trigger function ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_match_period_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match_id  INTEGER;
  v_league_id INTEGER;
  v_team1     INTEGER;
  v_team2     INTEGER;
BEGIN
  v_match_id := COALESCE(NEW.match_id, OLD.match_id);

  -- 1. Recalculate running totals on the MATCH row
  PERFORM sync_match_totals(v_match_id);

  -- 2. Recalculate TEAM_LEAGUE standings for both teams (only for finished matches)
  SELECT league_id, first_team_id, second_team_id
  INTO   v_league_id, v_team1, v_team2
  FROM   "MATCH"
  WHERE  match_id = v_match_id;

  IF v_team1 IS NOT NULL THEN
    PERFORM recompute_team_standing(v_team1, v_league_id);
  END IF;
  IF v_team2 IS NOT NULL THEN
    PERFORM recompute_team_standing(v_team2, v_league_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ── 4. Attach trigger to MATCH_PERIOD ────────────────────────────────────────

DROP TRIGGER IF EXISTS trigger_match_period_sync ON "MATCH_PERIOD";
CREATE TRIGGER trigger_match_period_sync
  AFTER INSERT OR UPDATE OR DELETE ON "MATCH_PERIOD"
  FOR EACH ROW EXECUTE FUNCTION trg_match_period_sync();

-- ── 5. Realtime for MATCH_PERIOD (scoreboard live updates) ───────────────────

ALTER TABLE "MATCH_PERIOD" REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE "MATCH_PERIOD";

-- ── 6. Grant execute so Supabase roles can call the helpers manually ─────────

GRANT EXECUTE ON FUNCTION sync_match_totals(INTEGER)              TO authenticated;
GRANT EXECUTE ON FUNCTION recompute_team_standing(INTEGER, INTEGER) TO authenticated;

-- ── 7. Migration log ──────────────────────────────────────────────────────────

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.18',
  'match-period-trigger',
  'Trigger on MATCH_PERIOD: auto-sync MATCH totals + recompute TEAM_LEAGUE standings on every score change',
  'db/script/v3.18-match-period-trigger.sql',
  NOW(),
  'applied'
);
