-- v3.25 · Re-insertar partidos eliminatorios de liga 4 (Quiniela Global)
--
-- Contexto: v3.23 borró todos los knockouts corruptos de liga 4.
-- Este script verifica el estado actual y re-inserta los 32 shells
-- (rounds 1–5) que deben existir para el bracket del Mundial 2026.
--
-- Counts esperados tras ejecutar:
--   round=1  → 16 partidos (Dieciseisavos, 2–7 Jul)
--   round=2  → 8 partidos  (Octavos,       8–10 Jul)
--   round=3  → 4 partidos  (Cuartos,       11–12 Jul)
--   round=4  → 2 partidos  (Semifinales,   14–15 Jul)
--   round=5  → 2 partidos  (Final + 3er Lugar, 18–19 Jul)
-- ──────────────────────────────────────────────────────────────────────

-- 1. Diagnóstico previo
SELECT round,
       COUNT(*) AS total,
       CASE WHEN COUNT(*) % 2 = 1 THEN '⚠️ IMPAR' ELSE 'OK' END AS parity
FROM   "MATCH"
WHERE  league_id = 4
AND    round IS NOT NULL
AND    grupo_id IS NULL
AND    is_deleted = false
GROUP  BY round
ORDER  BY round;

-- 2. Re-insertar solo si no existen knockouts para liga 4
DO $$
DECLARE
  v_league_id INT := 4;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "MATCH"
    WHERE  league_id = v_league_id
    AND    round IS NOT NULL
    AND    grupo_id IS NULL
    AND    is_deleted = false
    LIMIT  1
  ) THEN
    INSERT INTO "MATCH" (
      start_time, end_time, stadium_id, league_id,
      first_team_id, second_team_id,
      first_team_total, second_team_total,
      round, bracket_position,
      created_by, created_at, is_deleted
    )
    SELECT
      m.start_ts,
      m.start_ts + INTERVAL '2 hours',
      (SELECT stadium_id FROM "STADIUM" WHERE name = m.stad AND is_deleted = false LIMIT 1),
      v_league_id,
      NULL, NULL,
      0, 0,
      m.rnd, m.bpos,
      1, NOW(), false
    FROM (VALUES
      /* ── Dieciseisavos / Ronda de 32 (round=1 · Jul 2–7) ── */
      ('2026-07-02 18:00:00+00'::TIMESTAMPTZ,'MetLife Stadium',        1,  1),
      ('2026-07-02 22:00:00+00'::TIMESTAMPTZ,'AT&T Stadium',           1,  2),
      ('2026-07-03 01:00:00+00'::TIMESTAMPTZ,'Mercedes-Benz Stadium',  1,  3),
      ('2026-07-03 18:00:00+00'::TIMESTAMPTZ,'Levi''s Stadium',        1,  4),
      ('2026-07-03 22:00:00+00'::TIMESTAMPTZ,'Hard Rock Stadium',      1,  5),
      ('2026-07-04 01:00:00+00'::TIMESTAMPTZ,'Gillette Stadium',       1,  6),
      ('2026-07-04 18:00:00+00'::TIMESTAMPTZ,'SoFi Stadium',           1,  7),
      ('2026-07-04 22:00:00+00'::TIMESTAMPTZ,'Lumen Field',            1,  8),
      ('2026-07-05 01:00:00+00'::TIMESTAMPTZ,'NRG Stadium',            1,  9),
      ('2026-07-05 18:00:00+00'::TIMESTAMPTZ,'Arrowhead Stadium',      1, 10),
      ('2026-07-05 22:00:00+00'::TIMESTAMPTZ,'BC Place',               1, 11),
      ('2026-07-06 01:00:00+00'::TIMESTAMPTZ,'Lincoln Financial Field',1, 12),
      ('2026-07-06 18:00:00+00'::TIMESTAMPTZ,'BMO Field',              1, 13),
      ('2026-07-06 22:00:00+00'::TIMESTAMPTZ,'Estadio Azteca',         1, 14),
      ('2026-07-07 01:00:00+00'::TIMESTAMPTZ,'Estadio BBVA',           1, 15),
      ('2026-07-07 18:00:00+00'::TIMESTAMPTZ,'Estadio Akron',          1, 16),
      /* ── Octavos de final (round=2 · Jul 8–10) ── */
      ('2026-07-08 18:00:00+00'::TIMESTAMPTZ,'MetLife Stadium',        2,  1),
      ('2026-07-08 22:00:00+00'::TIMESTAMPTZ,'AT&T Stadium',           2,  2),
      ('2026-07-09 01:00:00+00'::TIMESTAMPTZ,'Mercedes-Benz Stadium',  2,  3),
      ('2026-07-09 18:00:00+00'::TIMESTAMPTZ,'SoFi Stadium',           2,  4),
      ('2026-07-09 22:00:00+00'::TIMESTAMPTZ,'Hard Rock Stadium',      2,  5),
      ('2026-07-10 01:00:00+00'::TIMESTAMPTZ,'Lumen Field',            2,  6),
      ('2026-07-10 18:00:00+00'::TIMESTAMPTZ,'Gillette Stadium',       2,  7),
      ('2026-07-10 22:00:00+00'::TIMESTAMPTZ,'Estadio Azteca',         2,  8),
      /* ── Cuartos de final (round=3 · Jul 11–12) ── */
      ('2026-07-11 18:00:00+00'::TIMESTAMPTZ,'MetLife Stadium',        3,  1),
      ('2026-07-11 22:00:00+00'::TIMESTAMPTZ,'AT&T Stadium',           3,  2),
      ('2026-07-12 01:00:00+00'::TIMESTAMPTZ,'Mercedes-Benz Stadium',  3,  3),
      ('2026-07-12 22:00:00+00'::TIMESTAMPTZ,'Levi''s Stadium',        3,  4),
      /* ── Semifinales (round=4 · Jul 14–15) ── */
      ('2026-07-14 22:00:00+00'::TIMESTAMPTZ,'AT&T Stadium',           4,  1),
      ('2026-07-15 22:00:00+00'::TIMESTAMPTZ,'MetLife Stadium',        4,  2),
      /* ── Final (round=5, pos=1 · Jul 19) ── */
      ('2026-07-19 22:00:00+00'::TIMESTAMPTZ,'MetLife Stadium',        5,  1),
      /* ── Tercer Lugar (round=5, pos=2 · Jul 18) ── */
      ('2026-07-18 18:00:00+00'::TIMESTAMPTZ,'Hard Rock Stadium',      5,  2)
    ) AS m(start_ts, stad, rnd, bpos);

    RAISE NOTICE 'Insertados 32 partidos eliminatorios para liga_id=%', v_league_id;
  ELSE
    RAISE NOTICE 'Ya existen knockouts para liga_id=% — no se insertó nada.', v_league_id;
  END IF;
END $$;

-- 3. Verificación final
SELECT round,
       COUNT(*) AS total,
       CASE WHEN COUNT(*) % 2 = 1 THEN '⚠️ IMPAR' ELSE 'OK' END AS parity
FROM   "MATCH"
WHERE  league_id = 4
AND    round IS NOT NULL
AND    grupo_id IS NULL
AND    is_deleted = false
GROUP  BY round
ORDER  BY round;
