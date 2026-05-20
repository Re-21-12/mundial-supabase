-- v3.15: Bracket system — columns + report_winner function

-- ── 1. New columns ────────────────────────────────────────────────────────────

ALTER TABLE "MATCH"
  ADD COLUMN IF NOT EXISTS round            SMALLINT NULL,
  ADD COLUMN IF NOT EXISTS bracket_position SMALLINT NULL,
  ADD COLUMN IF NOT EXISTS next_match_id    INTEGER  NULL
    REFERENCES "MATCH"(match_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS winner_team_id   INTEGER  NULL
    REFERENCES "TEAM"(team_id)  ON DELETE SET NULL;

-- Future bracket matches are created as placeholders (no teams yet)
ALTER TABLE "MATCH" ALTER COLUMN first_team_id  DROP NOT NULL;
ALTER TABLE "MATCH" ALTER COLUMN second_team_id DROP NOT NULL;

-- ── 2. Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_match_round_pos
  ON "MATCH" (league_id, round, bracket_position)
  WHERE is_deleted = false;

-- ── 3. report_winner function ─────────────────────────────────────────────────
--
--  Rules:
--    • bracket_position is 1-based within each round (1, 2, 3, 4, …)
--    • ODD  position → winner goes to first_team_id  of the next match
--    • EVEN position → winner goes to second_team_id of the next match
--
--  Example for 8-team bracket:
--    Round 1: positions 1-4
--      pos 1 (odd)  → R2 match (pos 1) first_team_id
--      pos 2 (even) → R2 match (pos 1) second_team_id
--      pos 3 (odd)  → R2 match (pos 2) first_team_id
--      pos 4 (even) → R2 match (pos 2) second_team_id
--    Round 2: positions 1-2
--      pos 1 (odd)  → Final first_team_id
--      pos 2 (even) → Final second_team_id
--

CREATE OR REPLACE FUNCTION report_winner(
  p_match_id       INTEGER,
  p_winner_team_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_first_team_id   INTEGER;
  v_second_team_id  INTEGER;
  v_winner_team_id  INTEGER;
  v_next_match_id   INTEGER;
  v_bracket_pos     SMALLINT;
BEGIN
  -- ── Fetch current match ───────────────────────────────────────────────────
  SELECT first_team_id, second_team_id, winner_team_id,
         next_match_id, bracket_position
  INTO   v_first_team_id, v_second_team_id, v_winner_team_id,
         v_next_match_id, v_bracket_pos
  FROM   "MATCH"
  WHERE  match_id = p_match_id
    AND  is_deleted = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partido % no encontrado o eliminado.', p_match_id;
  END IF;

  -- ── Idempotency: skip if winner already recorded ──────────────────────────
  IF v_winner_team_id IS NOT NULL THEN
    RETURN;
  END IF;

  -- ── Validate winner belongs to the match ─────────────────────────────────
  IF v_first_team_id IS NOT NULL AND v_second_team_id IS NOT NULL THEN
    IF p_winner_team_id <> v_first_team_id
       AND p_winner_team_id <> v_second_team_id THEN
      RAISE EXCEPTION
        'El equipo % no es participante del partido %.', p_winner_team_id, p_match_id;
    END IF;
  END IF;

  -- ── 1. Record winner in current match ─────────────────────────────────────
  UPDATE "MATCH"
  SET    winner_team_id = p_winner_team_id,
         updated_at     = NOW()
  WHERE  match_id = p_match_id;

  -- ── 2. Advance winner to the next match ───────────────────────────────────
  IF v_next_match_id IS NULL THEN
    RETURN; -- Final round, no next match
  END IF;

  IF v_bracket_pos IS NULL THEN
    RAISE EXCEPTION
      'El partido % no tiene bracket_position definido. '
      'Definilo antes de llamar a report_winner.', p_match_id;
  END IF;

  IF (v_bracket_pos % 2) = 1 THEN
    -- Odd position → first team slot of the next match
    UPDATE "MATCH"
    SET    first_team_id = p_winner_team_id,
           updated_at    = NOW()
    WHERE  match_id = v_next_match_id;
  ELSE
    -- Even position → second team slot of the next match
    UPDATE "MATCH"
    SET    second_team_id = p_winner_team_id,
           updated_at     = NOW()
    WHERE  match_id = v_next_match_id;
  END IF;
END;
$$;

-- Allow authenticated users (admins) to call this function
GRANT EXECUTE ON FUNCTION report_winner(INTEGER, INTEGER) TO authenticated;

-- ── 4. Helper: scaffold bracket matches for a league ─────────────────────────
--
--  Creates placeholder matches for all rounds beyond round 1.
--  Call once after inserting round-1 matches with their bracket_positions.
--
--  Usage:
--    SELECT scaffold_bracket(league_id := 42, stadium_id := 1);
--
CREATE OR REPLACE FUNCTION scaffold_bracket(
  p_league_id  INTEGER,
  p_stadium_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_round            SMALLINT;
  v_max_round        SMALLINT;
  v_count_in_round   INTEGER;
  v_count_next_round INTEGER;
  v_pos              SMALLINT;
  v_match_id_a       INTEGER;
  v_match_id_b       INTEGER;
  v_next_id          INTEGER;
BEGIN
  -- Determine round 1 match count
  SELECT COALESCE(MAX(bracket_position), 0)
  INTO   v_count_in_round
  FROM   "MATCH"
  WHERE  league_id = p_league_id AND round = 1 AND is_deleted = false;

  IF v_count_in_round < 2 THEN
    RAISE EXCEPTION 'Liga % necesita al menos 2 partidos en ronda 1.', p_league_id;
  END IF;

  -- Calculate total rounds needed
  v_max_round := CEIL(LOG(2, v_count_in_round)) + 1;
  v_round := 2;

  WHILE v_round <= v_max_round LOOP
    v_count_next_round := CEIL(v_count_in_round::NUMERIC / 2);
    v_pos := 1;

    WHILE v_pos <= v_count_next_round LOOP
      -- Insert placeholder match
      INSERT INTO "MATCH" (
        league_id, stadium_id, round, bracket_position,
        first_team_total, second_team_total,
        start_time, created_at, is_deleted
      )
      VALUES (
        p_league_id, p_stadium_id, v_round, v_pos,
        0, 0,
        NOW(), NOW(), false
      )
      RETURNING match_id INTO v_next_id;

      -- Link its two feeder matches from the previous round
      UPDATE "MATCH"
      SET    next_match_id = v_next_id, updated_at = NOW()
      WHERE  league_id = p_league_id
        AND  round = v_round - 1
        AND  bracket_position IN ((v_pos * 2) - 1, v_pos * 2)
        AND  is_deleted = false;

      v_pos := v_pos + 1;
    END LOOP;

    v_count_in_round := v_count_next_round;
    v_round := v_round + 1;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION scaffold_bracket(INTEGER, INTEGER) TO authenticated;

-- ── 5. Migration log ──────────────────────────────────────────────────────────

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.15',
  'bracket-system',
  'Adds round, bracket_position, next_match_id, winner_team_id to MATCH; report_winner and scaffold_bracket functions',
  'db/script/v3.15-bracket-system.sql',
  NOW(),
  'applied'
);
