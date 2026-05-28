-- ============================================================
-- v3.47 — Auto match periods + bracket winner advancement
-- ============================================================
-- Applied: 2026-05-28
--
-- Changes:
--   1. Fix MATCH_PERIOD sequence
--   2. Trigger trg_create_match_periods: auto-creates 4 periods
--      (1T, 2T, TE, PEN) on every MATCH INSERT
--   3. sync_match_totals_from_periods: excludes PEN (catalog_id=94)
--      from totals so penalty goals don't inflate the score
--   4. handle_match_extra_time: extra_time expired + tied →
--      phase='penalty' instead of 'finished'
--   5. wire_bracket_next_match(league_id): sets next_match_id using
--      formula next_pos = ceil(current_pos / 2), next_round = round+1
--   6. Trigger trg_advance_bracket_winner: fires on scored_at set,
--      determines winner (totals, then penalties), calls report_winner
--   7. Backfill 4 periods for all existing matches
--   8. scaffold_league_full updated to call wire_bracket_next_match
-- ============================================================

-- 1. Fix sequence
SELECT setval('public."MATCH_PERIOD_period_id_seq"', (SELECT max(period_id) + 1 FROM "MATCH_PERIOD"), false);

-- 2. Auto-create 4 periods on MATCH INSERT
CREATE OR REPLACE FUNCTION trg_create_match_periods()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF NEW.is_deleted THEN RETURN NEW; END IF;
  INSERT INTO "MATCH_PERIOD" (match_id, catalog_id, first_team_score, second_team_score, is_deleted)
  VALUES
    (NEW.match_id, 90, 0, 0, false),
    (NEW.match_id, 91, 0, 0, false),
    (NEW.match_id, 92, 0, 0, false),
    (NEW.match_id, 94, 0, 0, false);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_match_periods ON "MATCH";
CREATE TRIGGER trg_create_match_periods
  AFTER INSERT ON "MATCH"
  FOR EACH ROW EXECUTE FUNCTION trg_create_match_periods();

-- 3. Exclude PEN from match totals
CREATE OR REPLACE FUNCTION sync_match_totals_from_periods()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_match_id INTEGER;
BEGIN
  v_match_id := COALESCE(NEW.match_id, OLD.match_id);
  IF v_match_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  UPDATE "MATCH"
  SET
    first_team_total  = COALESCE((SELECT SUM(COALESCE(first_team_score,0)) FROM "MATCH_PERIOD"
      WHERE match_id = v_match_id AND is_deleted = false AND catalog_id <> 94), 0),
    second_team_total = COALESCE((SELECT SUM(COALESCE(second_team_score,0)) FROM "MATCH_PERIOD"
      WHERE match_id = v_match_id AND is_deleted = false AND catalog_id <> 94), 0),
    updated_at = NOW()
  WHERE match_id = v_match_id;
  PERFORM handle_match_extra_time(v_match_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Extra time expired + tied → penalty phase
CREATE OR REPLACE FUNCTION handle_match_extra_time(p_match_id integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_match RECORD;
BEGIN
  SELECT match_id, end_time, first_team_total, second_team_total, scored_at, phase
  INTO v_match FROM "MATCH"
  WHERE match_id = p_match_id AND is_deleted = false;

  IF v_match.match_id IS NULL THEN RETURN; END IF;
  IF v_match.scored_at IS NOT NULL THEN RETURN; END IF;
  IF v_match.phase IN ('finished','penalty') THEN RETURN; END IF;
  IF NOW() < v_match.end_time THEN RETURN; END IF;
  IF COALESCE(v_match.first_team_total,0) <> COALESCE(v_match.second_team_total,0) THEN RETURN; END IF;

  IF v_match.phase = 'regulation' THEN
    UPDATE "MATCH" SET end_time = v_match.end_time + INTERVAL '30 minutes',
      phase = 'extra_time', updated_at = NOW() WHERE match_id = p_match_id;
  ELSIF v_match.phase = 'extra_time' THEN
    UPDATE "MATCH" SET phase = 'penalty', updated_at = NOW() WHERE match_id = p_match_id;
  END IF;
END;
$$;

-- 5. Wire next_match_id for bracket rounds
CREATE OR REPLACE FUNCTION wire_bracket_next_match(p_league_id integer)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE v_count integer;
BEGIN
  UPDATE "MATCH" cur
  SET next_match_id = nxt.match_id, updated_at = NOW()
  FROM "MATCH" nxt
  WHERE cur.league_id = p_league_id AND cur.grupo_id IS NULL
    AND cur.round BETWEEN 1 AND 4 AND cur.is_deleted = false
    AND nxt.league_id = p_league_id AND nxt.grupo_id IS NULL
    AND nxt.round = cur.round + 1
    AND nxt.bracket_position = CEIL(cur.bracket_position / 2.0)
    AND nxt.is_deleted = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

SELECT league_id, wire_bracket_next_match(league_id) FROM "LEAGUE" WHERE is_deleted = false;

-- 6. Auto-advance bracket winner when scored_at is set
CREATE OR REPLACE FUNCTION trg_advance_bracket_winner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_winner_id  INTEGER;
  v_pen_first  INTEGER;
  v_pen_second INTEGER;
BEGIN
  IF OLD.scored_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.scored_at IS NULL     THEN RETURN NEW; END IF;
  IF COALESCE(NEW.round, 0) < 1   THEN RETURN NEW; END IF;
  IF NEW.grupo_id IS NOT NULL      THEN RETURN NEW; END IF;
  IF NEW.winner_team_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.first_team_id IS NULL OR NEW.second_team_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.first_team_total > NEW.second_team_total THEN
    v_winner_id := NEW.first_team_id;
  ELSIF NEW.second_team_total > NEW.first_team_total THEN
    v_winner_id := NEW.second_team_id;
  ELSE
    SELECT COALESCE(first_team_score,0), COALESCE(second_team_score,0)
    INTO v_pen_first, v_pen_second
    FROM "MATCH_PERIOD"
    WHERE match_id = NEW.match_id AND catalog_id = 94 AND is_deleted = false
    ORDER BY period_id DESC LIMIT 1;

    IF COALESCE(v_pen_first,0) > COALESCE(v_pen_second,0) THEN
      v_winner_id := NEW.first_team_id;
    ELSIF COALESCE(v_pen_second,0) > COALESCE(v_pen_first,0) THEN
      v_winner_id := NEW.second_team_id;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  PERFORM report_winner(NEW.match_id, v_winner_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_advance_bracket_winner ON "MATCH";
CREATE TRIGGER trg_advance_bracket_winner
  AFTER UPDATE ON "MATCH"
  FOR EACH ROW EXECUTE FUNCTION trg_advance_bracket_winner();

-- 7. Backfill missing periods for existing matches
INSERT INTO "MATCH_PERIOD" (match_id, catalog_id, first_team_score, second_team_score, is_deleted)
SELECT m.match_id, c.catalog_id, 0, 0, false
FROM "MATCH" m
CROSS JOIN (VALUES (90), (91), (92), (94)) AS c(catalog_id)
WHERE m.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM "MATCH_PERIOD" mp
    WHERE mp.match_id = m.match_id AND mp.catalog_id = c.catalog_id AND mp.is_deleted = false
  );

-- 8. scaffold_league_full updated (see v3.46 for full body; now includes wire_bracket_next_match)
CREATE OR REPLACE FUNCTION scaffold_league_full(p_league_id integer)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE v_stadium_id integer;
BEGIN
  PERFORM setval(pg_get_serial_sequence('"MATCH"', 'match_id'),
    (SELECT max(match_id) + 1 FROM "MATCH"), false);

  SELECT stadium_id INTO v_stadium_id FROM "STADIUM" WHERE is_deleted = false LIMIT 1;
  IF v_stadium_id IS NULL THEN RAISE EXCEPTION 'scaffold_league_full: no stadiums found'; END IF;

  UPDATE "LEAGUE" SET world_league_id = 4 WHERE league_id = p_league_id;

  INSERT INTO "MATCH" (start_time, end_time, stadium_id, league_id,
    first_team_id, second_team_id, first_team_total, second_team_total,
    round, bracket_position, grupo_id, phase, is_deleted)
  SELECT m.start_time, m.end_time, COALESCE(m.stadium_id, v_stadium_id), p_league_id,
    m.first_team_id, m.second_team_id, 0, 0,
    m.round, m.bracket_position, m.grupo_id, m.phase, false
  FROM "MATCH" m
  WHERE m.league_id = 4 AND m.grupo_id IS NOT NULL AND m.is_deleted = false
    AND NOT EXISTS (SELECT 1 FROM "MATCH" x WHERE x.league_id = p_league_id AND x.grupo_id IS NOT NULL AND x.is_deleted = false);

  INSERT INTO "MATCH" (start_time, end_time, stadium_id, league_id,
    first_team_id, second_team_id, first_team_total, second_team_total,
    round, bracket_position, grupo_id, phase, is_deleted)
  SELECT m.start_time, m.end_time, COALESCE(m.stadium_id, v_stadium_id), p_league_id,
    m.first_team_id, m.second_team_id, 0, 0,
    m.round, m.bracket_position, NULL, m.phase, false
  FROM "MATCH" m
  WHERE m.league_id = 1 AND m.grupo_id IS NULL AND m.round IS NOT NULL AND m.is_deleted = false
    AND NOT EXISTS (SELECT 1 FROM "MATCH" x WHERE x.league_id = p_league_id AND x.grupo_id IS NULL AND x.round IS NOT NULL AND x.is_deleted = false);

  INSERT INTO "TEAM_LEAGUE" (league_id, team_id, points, games_played, wins, draws, losses, goals_for, goals_against, is_deleted)
  SELECT p_league_id, tl.team_id, 0, 0, 0, 0, 0, 0, 0, false
  FROM "TEAM_LEAGUE" tl WHERE tl.league_id = 4 AND tl.is_deleted = false
    AND NOT EXISTS (SELECT 1 FROM "TEAM_LEAGUE" x WHERE x.league_id = p_league_id AND x.team_id = tl.team_id AND x.is_deleted = false);

  PERFORM wire_bracket_next_match(p_league_id);
END;
$$;
