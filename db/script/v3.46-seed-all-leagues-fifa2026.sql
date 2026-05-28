-- ============================================================
-- v3.46 — Seed all leagues with FIFA 2026 groups + 16avos
-- ============================================================
-- Applied: 2026-05-28
--
-- What this does:
--   1. Points all leagues to world_league_id=4 (FIFA WC 2026)
--      so they show the same 12 grupos (A-L) in the UI.
--   2. Copies the 72 group-stage MATCH records from league 4 to
--      any league that has none.
--   3. Assigns teams to round=1 (16avos) knockout matches using
--      league 1 as template (leagues 4 and 5 had null teams).
--   4. Copies TEAM_LEAGUE rows (48 teams, stats = 0) for leagues
--      that had none.
--   5. Creates scaffold_league_full(p_league_id) for future leagues.
--   6. Fixes the MATCH_match_id_seq if it fell behind.
-- ============================================================

-- Fix sequence
SELECT setval(
  pg_get_serial_sequence('"MATCH"', 'match_id'),
  (SELECT max(match_id) + 1 FROM "MATCH"),
  false
);

-- 1. Normalize world_league_id
UPDATE "LEAGUE"
SET world_league_id = 4
WHERE league_id IN (1, 5);

-- 2. Group-stage matches: league 4 → leagues 1 and 5
INSERT INTO "MATCH" (
  start_time, end_time, stadium_id, league_id,
  first_team_id, second_team_id,
  first_team_total, second_team_total,
  round, bracket_position, grupo_id, phase, is_deleted
)
SELECT
  m.start_time, m.end_time, m.stadium_id, t.league_id,
  m.first_team_id, m.second_team_id,
  0, 0,
  m.round, m.bracket_position, m.grupo_id, m.phase, false
FROM "MATCH" m
CROSS JOIN (SELECT unnest(ARRAY[1, 5]) AS league_id) t
WHERE m.league_id = 4
  AND m.grupo_id IS NOT NULL
  AND m.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM "MATCH" x
    WHERE x.league_id = t.league_id AND x.grupo_id IS NOT NULL AND x.is_deleted = false
  );

-- 3. Assign teams to round=1 knockout matches for leagues 4 and 5
UPDATE "MATCH" tgt
SET
  first_team_id  = src.first_team_id,
  second_team_id = src.second_team_id,
  updated_at     = now()
FROM "MATCH" src
WHERE src.league_id        = 1
  AND src.round            = 1
  AND src.grupo_id         IS NULL
  AND src.is_deleted       = false
  AND tgt.league_id        IN (4, 5)
  AND tgt.round            = 1
  AND tgt.grupo_id         IS NULL
  AND tgt.is_deleted       = false
  AND tgt.bracket_position = src.bracket_position;

-- 4. TEAM_LEAGUE rows: league 4 → leagues 1 and 5
INSERT INTO "TEAM_LEAGUE" (
  league_id, team_id,
  points, games_played, wins, draws, losses, goals_for, goals_against,
  is_deleted
)
SELECT
  t.league_id, tl.team_id,
  0, 0, 0, 0, 0, 0, 0, false
FROM "TEAM_LEAGUE" tl
CROSS JOIN (SELECT unnest(ARRAY[1, 5]) AS league_id) t
WHERE tl.league_id = 4
  AND tl.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM "TEAM_LEAGUE" x
    WHERE x.league_id = t.league_id AND x.team_id = tl.team_id AND x.is_deleted = false
  );

-- 5. Helper function for future leagues
CREATE OR REPLACE FUNCTION scaffold_league_full(p_league_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_stadium_id integer;
BEGIN
  -- Ensure sequence is ahead of existing rows
  PERFORM setval(
    pg_get_serial_sequence('"MATCH"', 'match_id'),
    (SELECT max(match_id) + 1 FROM "MATCH"),
    false
  );

  SELECT stadium_id INTO v_stadium_id FROM "STADIUM" WHERE is_deleted = false LIMIT 1;
  IF v_stadium_id IS NULL THEN
    RAISE EXCEPTION 'scaffold_league_full: no stadiums found';
  END IF;

  -- Set world_league to FIFA WC 2026
  UPDATE "LEAGUE" SET world_league_id = 4 WHERE league_id = p_league_id;

  -- Group-stage matches (72 partidos — mismo calendario que liga 4)
  INSERT INTO "MATCH" (
    start_time, end_time, stadium_id, league_id,
    first_team_id, second_team_id,
    first_team_total, second_team_total,
    round, bracket_position, grupo_id, phase, is_deleted
  )
  SELECT
    m.start_time, m.end_time, COALESCE(m.stadium_id, v_stadium_id), p_league_id,
    m.first_team_id, m.second_team_id,
    0, 0,
    m.round, m.bracket_position, m.grupo_id, m.phase, false
  FROM "MATCH" m
  WHERE m.league_id = 4
    AND m.grupo_id IS NOT NULL
    AND m.is_deleted = false
    AND NOT EXISTS (
      SELECT 1 FROM "MATCH" x
      WHERE x.league_id = p_league_id AND x.grupo_id IS NOT NULL AND x.is_deleted = false
    );

  -- Knockout matches rounds 1-5 (con equipos pre-asignados de liga 1)
  INSERT INTO "MATCH" (
    start_time, end_time, stadium_id, league_id,
    first_team_id, second_team_id,
    first_team_total, second_team_total,
    round, bracket_position, grupo_id, phase, is_deleted
  )
  SELECT
    m.start_time, m.end_time, COALESCE(m.stadium_id, v_stadium_id), p_league_id,
    m.first_team_id, m.second_team_id,
    0, 0,
    m.round, m.bracket_position, NULL, m.phase, false
  FROM "MATCH" m
  WHERE m.league_id = 1
    AND m.grupo_id IS NULL
    AND m.round IS NOT NULL
    AND m.is_deleted = false
    AND NOT EXISTS (
      SELECT 1 FROM "MATCH" x
      WHERE x.league_id = p_league_id AND x.grupo_id IS NULL AND x.round IS NOT NULL AND x.is_deleted = false
    );

  -- TEAM_LEAGUE (48 equipos, stats en cero)
  INSERT INTO "TEAM_LEAGUE" (
    league_id, team_id, points, games_played, wins, draws, losses, goals_for, goals_against, is_deleted
  )
  SELECT
    p_league_id, tl.team_id, 0, 0, 0, 0, 0, 0, 0, false
  FROM "TEAM_LEAGUE" tl
  WHERE tl.league_id = 4
    AND tl.is_deleted = false
    AND NOT EXISTS (
      SELECT 1 FROM "TEAM_LEAGUE" x
      WHERE x.league_id = p_league_id AND x.team_id = tl.team_id AND x.is_deleted = false
    );
END;
$$;
