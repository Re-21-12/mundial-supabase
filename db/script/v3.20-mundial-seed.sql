-- ═══════════════════════════════════════════════════════════════════════
-- v3.20 · FIFA World Cup 2026 — Full Data Seed
--
-- Inserts (idempotente — safe to re-run):
--   CATALOG     → 26 nuevos países
--   WORLD_LEAGUE→ FIFA World Cup 2026
--   STADIUM     → 16 sedes anfitrionas
--   TEAM        → 48 selecciones
--   GRUPO       → 12 grupos (A–L)
--   LEAGUE      → Liga de quinielas del Mundial
--   MATCH       → 72 fase de grupos + 32 eliminatorias = 104 partidos
--   TEAM_LEAGUE → 48 filas (una por selección)
--   GRUPO_STANDING → 48 filas (una por selección por grupo)
--
-- Requisito previo: v3.20-mundial-schema.sql ya ejecutado.
--
-- Round numbering (aligned with frontend ROUND_LABELS):
--   Group stage:  round = NULL, grupo_id = <id>
--   R32:          round = 1, bracket_position 1–16
--   R16:          round = 2, bracket_position 1–8
--   QF:           round = 3, bracket_position 1–4
--   SF:           round = 4, bracket_position 1–2
--   Final:        round = 5, bracket_position = 1
--   Tercer Lugar: round = 5, bracket_position = 2
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════
-- 1. CATALOG — nuevos países (table_id = 50)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO "CATALOG" (table_id, table_name, neumonic, description, value, created_by, created_at, is_deleted)
VALUES
  (50,'country','COUNTRY_CA','Canadá',               'CA',1,NOW(),false),
  (50,'country','COUNTRY_JP','Japón',                'JP',1,NOW(),false),
  (50,'country','COUNTRY_CV','Cabo Verde',           'CV',1,NOW(),false),
  (50,'country','COUNTRY_MA','Marruecos',            'MA',1,NOW(),false),
  (50,'country','COUNTRY_TN','Túnez',                'TN',1,NOW(),false),
  (50,'country','COUNTRY_UZ','Uzbekistán',           'UZ',1,NOW(),false),
  (50,'country','COUNTRY_SA','Arabia Saudita',       'SA',1,NOW(),false),
  (50,'country','COUNTRY_JO','Jordania',             'JO',1,NOW(),false),
  (50,'country','COUNTRY_EG','Egipto',               'EG',1,NOW(),false),
  (50,'country','COUNTRY_GT','Guatemala',            'GT',1,NOW(),false),
  (50,'country','COUNTRY_GH','Ghana',                'GH',1,NOW(),false),
  (50,'country','COUNTRY_IS','Islandia',             'IS',1,NOW(),false),
  (50,'country','COUNTRY_PA','Panamá',               'PA',1,NOW(),false),
  (50,'country','COUNTRY_QA','Qatar',                'QA',1,NOW(),false),
  (50,'country','COUNTRY_NZ','Nueva Zelanda',        'NZ',1,NOW(),false),
  (50,'country','COUNTRY_DZ','Argelia',              'DZ',1,NOW(),false),
  (50,'country','COUNTRY_CZ','República Checa',      'CZ',1,NOW(),false),
  (50,'country','COUNTRY_KR','Corea del Sur',        'KR',1,NOW(),false),
  (50,'country','COUNTRY_IQ','Irak',                 'IQ',1,NOW(),false),
  (50,'country','COUNTRY_SN','Senegal',              'SN',1,NOW(),false),
  (50,'country','COUNTRY_BA','Bosnia y Herzegovina', 'BA',1,NOW(),false),
  (50,'country','COUNTRY_AU','Australia',            'AU',1,NOW(),false),
  (50,'country','COUNTRY_RS','Serbia',               'RS',1,NOW(),false),
  (50,'country','COUNTRY_AT','Austria',              'AT',1,NOW(),false),
  (50,'country','COUNTRY_CI','Costa de Marfil',      'CI',1,NOW(),false),
  (50,'country','COUNTRY_HT','Haití',                'HT',1,NOW(),false)
ON CONFLICT (neumonic) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. WORLD_LEAGUE
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO "WORLD_LEAGUE" (name, created_by, created_at, is_deleted)
SELECT 'FIFA World Cup 2026', 1, NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM "WORLD_LEAGUE" WHERE name = 'FIFA World Cup 2026');

-- ═══════════════════════════════════════════════════════════════════════
-- 3. STADIUM — 16 sedes anfitrionas
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO "STADIUM" (name, catalog_id, created_by, created_at, is_deleted)
SELECT s.sname,
       (SELECT catalog_id FROM "CATALOG" WHERE neumonic = s.country_nem LIMIT 1),
       1, NOW(), false
FROM (VALUES
  ('Estadio Azteca',          'COUNTRY_MX'),
  ('Estadio BBVA',            'COUNTRY_MX'),
  ('Estadio Akron',           'COUNTRY_MX'),
  ('AT&T Stadium',            'COUNTRY_US'),
  ('MetLife Stadium',         'COUNTRY_US'),
  ('Mercedes-Benz Stadium',   'COUNTRY_US'),
  ('Arrowhead Stadium',       'COUNTRY_US'),
  ('NRG Stadium',             'COUNTRY_US'),
  ('Levi''s Stadium',         'COUNTRY_US'),
  ('SoFi Stadium',            'COUNTRY_US'),
  ('Lincoln Financial Field', 'COUNTRY_US'),
  ('Lumen Field',             'COUNTRY_US'),
  ('Gillette Stadium',        'COUNTRY_US'),
  ('Hard Rock Stadium',       'COUNTRY_US'),
  ('BC Place',                'COUNTRY_CA'),
  ('BMO Field',               'COUNTRY_CA')
) AS s(sname, country_nem)
WHERE NOT EXISTS (
  SELECT 1 FROM "STADIUM" WHERE name = s.sname AND is_deleted = false
);

-- ═══════════════════════════════════════════════════════════════════════
-- 4. TEAM — 48 selecciones nacionales
--    TBD-X = plazas de repesca intercontinental aún por definir
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO "TEAM" (name, catalog_id, created_by, created_at, is_deleted)
SELECT t.tname,
       (SELECT catalog_id FROM "CATALOG" WHERE neumonic = 'TEAM_CAT_SELECCION' LIMIT 1),
       1, NOW(), false
FROM (VALUES
  -- Grupo A
  ('México'),('Francia'),('Japón'),('Cabo Verde'),
  -- Grupo B
  ('Canadá'),('Bélgica'),('Marruecos'),('Colombia'),
  -- Grupo C
  ('España'),('Túnez'),('Uzbekistán'),('TBD-Grupo C'),
  -- Grupo D
  ('Estados Unidos'),('Arabia Saudita'),('Paraguay'),('Jordania'),
  -- Grupo E
  ('Argentina'),('Egipto'),('Guatemala'),('TBD-Grupo E'),
  -- Grupo F
  ('Inglaterra'),('Ghana'),('Islandia'),('Panamá'),
  -- Grupo G
  ('Brasil'),('Qatar'),('Nueva Zelanda'),('TBD-Grupo G'),
  -- Grupo H
  ('Alemania'),('Argelia'),('República Checa'),('TBD-Grupo H'),
  -- Grupo I
  ('Portugal'),('Corea del Sur'),('Uruguay'),('TBD-Grupo I'),
  -- Grupo J
  ('Países Bajos'),('Senegal'),('Irak'),('Perú'),
  -- Grupo K
  ('Croacia'),('Ecuador'),('Bosnia y Herzegovina'),('Australia'),
  -- Grupo L
  ('Serbia'),('Austria'),('Costa de Marfil'),('Haití')
) AS t(tname)
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- 5. GRUPO — grupos A–L ligados al Mundial 2026
-- ═══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_wl_id INT;
BEGIN
  SELECT world_league_id INTO v_wl_id FROM "WORLD_LEAGUE" WHERE name = 'FIFA World Cup 2026' LIMIT 1;

  INSERT INTO "GRUPO" (world_league_id, host_stadium_id, name, created_by, created_at, is_deleted)
  SELECT v_wl_id,
         (SELECT stadium_id FROM "STADIUM" WHERE name = g.host_stadium LIMIT 1),
         g.gname, 1, NOW(), false
  FROM (VALUES
    ('A', 'Estadio Azteca'),
    ('B', 'BC Place'),
    ('C', 'SoFi Stadium'),
    ('D', 'AT&T Stadium'),
    ('E', 'MetLife Stadium'),
    ('F', 'Gillette Stadium'),
    ('G', 'Mercedes-Benz Stadium'),
    ('H', 'Hard Rock Stadium'),
    ('I', 'Levi''s Stadium'),
    ('J', 'Lumen Field'),
    ('K', 'Arrowhead Stadium'),
    ('L', 'NRG Stadium')
  ) AS g(gname, host_stadium)
  ON CONFLICT (world_league_id, name) DO NOTHING;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 6. LEAGUE — liga de quinielas del Mundial
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO "LEAGUE" (world_league_id, user_id, name, catalog_id, invitation_code, status, created_by, created_at, is_deleted)
SELECT
  (SELECT world_league_id FROM "WORLD_LEAGUE" WHERE name = 'FIFA World Cup 2026' LIMIT 1),
  1,
  'Mundial FIFA 2026 — Quiniela Global',
  (SELECT catalog_id FROM "CATALOG" WHERE neumonic = 'LEAGUE_TYPE_COPA' LIMIT 1),
  'MUNDIAL2026',
  'active',
  1, NOW(), false
WHERE NOT EXISTS (
  SELECT 1 FROM "LEAGUE" WHERE name = 'Mundial FIFA 2026 — Quiniela Global'
);

-- ═══════════════════════════════════════════════════════════════════════
-- 7. MATCH — 72 partidos de fase de grupos
--
--   round = NULL  → fase de grupos (identificados por grupo_id)
--   bracket_position = número de partido dentro del grupo (1–6)
--
--   Horarios en UTC:
--     02:00 → 20:00 hora centro México / 21:00 ET
--     01:00 → 19:00 ET (prime time USA)
--     23:00 → 17:00 ET (tarde USA)
--     22:00 → 16:00 ET (tarde USA)
--     20:00 → 14:00 ET (mediodía USA)
--     18:00 → 12:00 ET (mañana USA)
-- ═══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_league_id INT;
BEGIN
  SELECT league_id INTO v_league_id
  FROM "LEAGUE" WHERE name = 'Mundial FIFA 2026 — Quiniela Global' LIMIT 1;

  IF v_league_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "MATCH" WHERE league_id = v_league_id AND grupo_id IS NOT NULL LIMIT 1
  ) THEN
    INSERT INTO "MATCH" (
      start_time, end_time, stadium_id, league_id,
      first_team_id, second_team_id,
      first_team_total, second_team_total,
      round, bracket_position, grupo_id,
      created_by, created_at, is_deleted
    )
    SELECT
      m.start_ts,
      m.start_ts + INTERVAL '2 hours',
      (SELECT stadium_id FROM "STADIUM" WHERE name = m.stad    AND is_deleted = false LIMIT 1),
      v_league_id,
      (SELECT team_id    FROM "TEAM"    WHERE name = m.t1      AND is_deleted = false LIMIT 1),
      (SELECT team_id    FROM "TEAM"    WHERE name = m.t2      AND is_deleted = false LIMIT 1),
      0, 0,
      NULL,
      m.bpos,
      (SELECT g.grupo_id FROM "GRUPO" g
         JOIN "WORLD_LEAGUE" wl ON g.world_league_id = wl.world_league_id
       WHERE wl.name = 'FIFA World Cup 2026' AND g.name = m.grp AND g.is_deleted = false LIMIT 1),
      1, NOW(), false
    FROM (VALUES
      /* ── GRUPO A ── */
      ('2026-06-12 02:00:00+00'::TIMESTAMPTZ,'Estadio Azteca',          'México',           'Japón',               'A',1),
      ('2026-06-11 22:00:00+00'::TIMESTAMPTZ,'Estadio Akron',           'Francia',          'Cabo Verde',          'A',2),
      ('2026-06-16 02:00:00+00'::TIMESTAMPTZ,'Estadio BBVA',            'México',           'Cabo Verde',          'A',3),
      ('2026-06-15 22:00:00+00'::TIMESTAMPTZ,'Estadio Azteca',          'Francia',          'Japón',               'A',4),
      ('2026-06-20 02:00:00+00'::TIMESTAMPTZ,'Estadio Azteca',          'México',           'Francia',             'A',5),
      ('2026-06-20 02:00:00+00'::TIMESTAMPTZ,'Estadio Akron',           'Japón',            'Cabo Verde',          'A',6),
      /* ── GRUPO B ── */
      ('2026-06-12 23:00:00+00'::TIMESTAMPTZ,'BC Place',                'Canadá',           'Marruecos',           'B',1),
      ('2026-06-13 02:00:00+00'::TIMESTAMPTZ,'MetLife Stadium',         'Bélgica',          'Colombia',            'B',2),
      ('2026-06-17 02:00:00+00'::TIMESTAMPTZ,'BMO Field',               'Canadá',           'Colombia',            'B',3),
      ('2026-06-16 23:00:00+00'::TIMESTAMPTZ,'Gillette Stadium',        'Bélgica',          'Marruecos',           'B',4),
      ('2026-06-20 23:00:00+00'::TIMESTAMPTZ,'BC Place',                'Canadá',           'Bélgica',             'B',5),
      ('2026-06-20 23:00:00+00'::TIMESTAMPTZ,'BMO Field',               'Marruecos',        'Colombia',            'B',6),
      /* ── GRUPO C ── */
      ('2026-06-13 22:00:00+00'::TIMESTAMPTZ,'SoFi Stadium',            'España',           'Uzbekistán',          'C',1),
      ('2026-06-14 01:00:00+00'::TIMESTAMPTZ,'Lincoln Financial Field', 'Túnez',            'TBD-Grupo C',         'C',2),
      ('2026-06-17 22:00:00+00'::TIMESTAMPTZ,'SoFi Stadium',            'España',           'TBD-Grupo C',         'C',3),
      ('2026-06-18 01:00:00+00'::TIMESTAMPTZ,'Levi''s Stadium',         'Túnez',            'Uzbekistán',          'C',4),
      ('2026-06-21 22:00:00+00'::TIMESTAMPTZ,'SoFi Stadium',            'España',           'Túnez',               'C',5),
      ('2026-06-21 22:00:00+00'::TIMESTAMPTZ,'Lumen Field',             'Uzbekistán',       'TBD-Grupo C',         'C',6),
      /* ── GRUPO D ── */
      ('2026-06-13 22:00:00+00'::TIMESTAMPTZ,'AT&T Stadium',            'Estados Unidos',   'Paraguay',            'D',1),
      ('2026-06-14 01:00:00+00'::TIMESTAMPTZ,'Arrowhead Stadium',       'Arabia Saudita',   'Jordania',            'D',2),
      ('2026-06-18 01:00:00+00'::TIMESTAMPTZ,'MetLife Stadium',         'Estados Unidos',   'Jordania',            'D',3),
      ('2026-06-17 22:00:00+00'::TIMESTAMPTZ,'NRG Stadium',             'Arabia Saudita',   'Paraguay',            'D',4),
      ('2026-06-22 01:00:00+00'::TIMESTAMPTZ,'AT&T Stadium',            'Estados Unidos',   'Arabia Saudita',      'D',5),
      ('2026-06-22 01:00:00+00'::TIMESTAMPTZ,'Arrowhead Stadium',       'Paraguay',         'Jordania',            'D',6),
      /* ── GRUPO E ── */
      ('2026-06-14 22:00:00+00'::TIMESTAMPTZ,'MetLife Stadium',         'Argentina',        'Guatemala',           'E',1),
      ('2026-06-15 01:00:00+00'::TIMESTAMPTZ,'Mercedes-Benz Stadium',   'Egipto',           'TBD-Grupo E',         'E',2),
      ('2026-06-18 22:00:00+00'::TIMESTAMPTZ,'Hard Rock Stadium',       'Argentina',        'TBD-Grupo E',         'E',3),
      ('2026-06-19 01:00:00+00'::TIMESTAMPTZ,'Mercedes-Benz Stadium',   'Egipto',           'Guatemala',           'E',4),
      ('2026-06-22 22:00:00+00'::TIMESTAMPTZ,'MetLife Stadium',         'Argentina',        'Egipto',              'E',5),
      ('2026-06-22 22:00:00+00'::TIMESTAMPTZ,'Mercedes-Benz Stadium',   'Guatemala',        'TBD-Grupo E',         'E',6),
      /* ── GRUPO F ── */
      ('2026-06-14 18:00:00+00'::TIMESTAMPTZ,'Gillette Stadium',        'Inglaterra',       'Islandia',            'F',1),
      ('2026-06-14 22:00:00+00'::TIMESTAMPTZ,'Lincoln Financial Field', 'Ghana',            'Panamá',              'F',2),
      ('2026-06-18 18:00:00+00'::TIMESTAMPTZ,'Gillette Stadium',        'Inglaterra',       'Panamá',              'F',3),
      ('2026-06-19 01:00:00+00'::TIMESTAMPTZ,'Lumen Field',             'Ghana',            'Islandia',            'F',4),
      ('2026-06-22 18:00:00+00'::TIMESTAMPTZ,'Gillette Stadium',        'Inglaterra',       'Ghana',               'F',5),
      ('2026-06-22 18:00:00+00'::TIMESTAMPTZ,'Levi''s Stadium',         'Islandia',         'Panamá',              'F',6),
      /* ── GRUPO G ── */
      ('2026-06-15 22:00:00+00'::TIMESTAMPTZ,'Mercedes-Benz Stadium',   'Brasil',           'Nueva Zelanda',       'G',1),
      ('2026-06-16 01:00:00+00'::TIMESTAMPTZ,'NRG Stadium',             'Qatar',            'TBD-Grupo G',         'G',2),
      ('2026-06-19 22:00:00+00'::TIMESTAMPTZ,'Mercedes-Benz Stadium',   'Brasil',           'TBD-Grupo G',         'G',3),
      ('2026-06-20 01:00:00+00'::TIMESTAMPTZ,'Hard Rock Stadium',       'Qatar',            'Nueva Zelanda',       'G',4),
      ('2026-06-23 22:00:00+00'::TIMESTAMPTZ,'Mercedes-Benz Stadium',   'Brasil',           'Qatar',               'G',5),
      ('2026-06-23 22:00:00+00'::TIMESTAMPTZ,'NRG Stadium',             'Nueva Zelanda',    'TBD-Grupo G',         'G',6),
      /* ── GRUPO H ── */
      ('2026-06-15 18:00:00+00'::TIMESTAMPTZ,'Hard Rock Stadium',       'Alemania',         'República Checa',     'H',1),
      ('2026-06-16 01:00:00+00'::TIMESTAMPTZ,'Lincoln Financial Field', 'Argelia',          'TBD-Grupo H',         'H',2),
      ('2026-06-19 18:00:00+00'::TIMESTAMPTZ,'AT&T Stadium',            'Alemania',         'TBD-Grupo H',         'H',3),
      ('2026-06-20 01:00:00+00'::TIMESTAMPTZ,'Hard Rock Stadium',       'Argelia',          'República Checa',     'H',4),
      ('2026-06-23 18:00:00+00'::TIMESTAMPTZ,'Hard Rock Stadium',       'Alemania',         'Argelia',             'H',5),
      ('2026-06-23 18:00:00+00'::TIMESTAMPTZ,'Lincoln Financial Field', 'República Checa',  'TBD-Grupo H',         'H',6),
      /* ── GRUPO I ── */
      ('2026-06-16 22:00:00+00'::TIMESTAMPTZ,'Levi''s Stadium',         'Portugal',         'Uruguay',             'I',1),
      ('2026-06-17 01:00:00+00'::TIMESTAMPTZ,'SoFi Stadium',            'Corea del Sur',    'TBD-Grupo I',         'I',2),
      ('2026-06-20 22:00:00+00'::TIMESTAMPTZ,'Levi''s Stadium',         'Portugal',         'TBD-Grupo I',         'I',3),
      ('2026-06-21 01:00:00+00'::TIMESTAMPTZ,'SoFi Stadium',            'Corea del Sur',    'Uruguay',             'I',4),
      ('2026-06-24 22:00:00+00'::TIMESTAMPTZ,'Levi''s Stadium',         'Portugal',         'Corea del Sur',       'I',5),
      ('2026-06-24 22:00:00+00'::TIMESTAMPTZ,'SoFi Stadium',            'Uruguay',          'TBD-Grupo I',         'I',6),
      /* ── GRUPO J ── */
      ('2026-06-16 18:00:00+00'::TIMESTAMPTZ,'Lumen Field',             'Países Bajos',     'Irak',                'J',1),
      ('2026-06-17 01:00:00+00'::TIMESTAMPTZ,'Arrowhead Stadium',       'Senegal',          'Perú',                'J',2),
      ('2026-06-20 18:00:00+00'::TIMESTAMPTZ,'Lumen Field',             'Países Bajos',     'Perú',                'J',3),
      ('2026-06-21 01:00:00+00'::TIMESTAMPTZ,'Arrowhead Stadium',       'Senegal',          'Irak',                'J',4),
      ('2026-06-24 18:00:00+00'::TIMESTAMPTZ,'Lumen Field',             'Países Bajos',     'Senegal',             'J',5),
      ('2026-06-24 18:00:00+00'::TIMESTAMPTZ,'Arrowhead Stadium',       'Irak',             'Perú',                'J',6),
      /* ── GRUPO K ── */
      ('2026-06-17 22:00:00+00'::TIMESTAMPTZ,'Arrowhead Stadium',       'Croacia',          'Bosnia y Herzegovina','K',1),
      ('2026-06-18 01:00:00+00'::TIMESTAMPTZ,'NRG Stadium',             'Ecuador',          'Australia',           'K',2),
      ('2026-06-21 22:00:00+00'::TIMESTAMPTZ,'Arrowhead Stadium',       'Croacia',          'Australia',           'K',3),
      ('2026-06-22 01:00:00+00'::TIMESTAMPTZ,'NRG Stadium',             'Ecuador',          'Bosnia y Herzegovina','K',4),
      ('2026-06-25 22:00:00+00'::TIMESTAMPTZ,'Arrowhead Stadium',       'Croacia',          'Ecuador',             'K',5),
      ('2026-06-25 22:00:00+00'::TIMESTAMPTZ,'NRG Stadium',             'Bosnia y Herzegovina','Australia',         'K',6),
      /* ── GRUPO L ── */
      ('2026-06-17 18:00:00+00'::TIMESTAMPTZ,'NRG Stadium',             'Serbia',           'Costa de Marfil',     'L',1),
      ('2026-06-18 01:00:00+00'::TIMESTAMPTZ,'Mercedes-Benz Stadium',   'Austria',          'Haití',               'L',2),
      ('2026-06-21 18:00:00+00'::TIMESTAMPTZ,'NRG Stadium',             'Serbia',           'Haití',               'L',3),
      ('2026-06-22 01:00:00+00'::TIMESTAMPTZ,'Mercedes-Benz Stadium',   'Austria',          'Costa de Marfil',     'L',4),
      ('2026-06-25 18:00:00+00'::TIMESTAMPTZ,'NRG Stadium',             'Serbia',           'Austria',             'L',5),
      ('2026-06-25 18:00:00+00'::TIMESTAMPTZ,'Mercedes-Benz Stadium',   'Costa de Marfil',  'Haití',               'L',6)
    ) AS m(start_ts, stad, t1, t2, grp, bpos);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 8. MATCH — 32 partidos de fase eliminatoria (placeholders)
--
--   round = 1 → Ronda de 32  / Dieciseisavos (16 partidos · Jul 2–7)
--   round = 2 → Octavos de final (8 partidos · Jul 8–10)
--   round = 3 → Cuartos de final (4 partidos · Jul 11–12)
--   round = 4 → Semifinales (2 partidos · Jul 14–15)
--   round = 5, bracket_position = 1 → Final (Jul 19)
--   round = 5, bracket_position = 2 → Tercer Lugar (Jul 18)
-- ═══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_league_id INT;
BEGIN
  SELECT league_id INTO v_league_id
  FROM "LEAGUE" WHERE name = 'Mundial FIFA 2026 — Quiniela Global' LIMIT 1;

  IF v_league_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "MATCH"
    WHERE league_id = v_league_id AND round IS NOT NULL AND grupo_id IS NULL
    LIMIT 1
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
      /* ── Ronda de 32 / Dieciseisavos (round=1 · Jul 2–7) ── */
      ('2026-07-02 18:00:00+00'::TIMESTAMPTZ,'MetLife Stadium',        1, 1),
      ('2026-07-02 22:00:00+00'::TIMESTAMPTZ,'AT&T Stadium',           1, 2),
      ('2026-07-03 01:00:00+00'::TIMESTAMPTZ,'Mercedes-Benz Stadium',  1, 3),
      ('2026-07-03 18:00:00+00'::TIMESTAMPTZ,'Levi''s Stadium',        1, 4),
      ('2026-07-03 22:00:00+00'::TIMESTAMPTZ,'Hard Rock Stadium',      1, 5),
      ('2026-07-04 01:00:00+00'::TIMESTAMPTZ,'Gillette Stadium',       1, 6),
      ('2026-07-04 18:00:00+00'::TIMESTAMPTZ,'SoFi Stadium',           1, 7),
      ('2026-07-04 22:00:00+00'::TIMESTAMPTZ,'Lumen Field',            1, 8),
      ('2026-07-05 01:00:00+00'::TIMESTAMPTZ,'NRG Stadium',            1, 9),
      ('2026-07-05 18:00:00+00'::TIMESTAMPTZ,'Arrowhead Stadium',      1,10),
      ('2026-07-05 22:00:00+00'::TIMESTAMPTZ,'BC Place',               1,11),
      ('2026-07-06 01:00:00+00'::TIMESTAMPTZ,'Lincoln Financial Field',1,12),
      ('2026-07-06 18:00:00+00'::TIMESTAMPTZ,'BMO Field',              1,13),
      ('2026-07-06 22:00:00+00'::TIMESTAMPTZ,'Estadio Azteca',         1,14),
      ('2026-07-07 01:00:00+00'::TIMESTAMPTZ,'Estadio BBVA',           1,15),
      ('2026-07-07 18:00:00+00'::TIMESTAMPTZ,'Estadio Akron',          1,16),
      /* ── Octavos de final (round=2 · Jul 8–10) ── */
      ('2026-07-08 18:00:00+00'::TIMESTAMPTZ,'MetLife Stadium',        2, 1),
      ('2026-07-08 22:00:00+00'::TIMESTAMPTZ,'AT&T Stadium',           2, 2),
      ('2026-07-09 01:00:00+00'::TIMESTAMPTZ,'Mercedes-Benz Stadium',  2, 3),
      ('2026-07-09 18:00:00+00'::TIMESTAMPTZ,'SoFi Stadium',           2, 4),
      ('2026-07-09 22:00:00+00'::TIMESTAMPTZ,'Hard Rock Stadium',      2, 5),
      ('2026-07-10 01:00:00+00'::TIMESTAMPTZ,'Lumen Field',            2, 6),
      ('2026-07-10 18:00:00+00'::TIMESTAMPTZ,'Gillette Stadium',       2, 7),
      ('2026-07-10 22:00:00+00'::TIMESTAMPTZ,'Estadio Azteca',         2, 8),
      /* ── Cuartos de final (round=3 · Jul 11–12) ── */
      ('2026-07-11 18:00:00+00'::TIMESTAMPTZ,'MetLife Stadium',        3, 1),
      ('2026-07-11 22:00:00+00'::TIMESTAMPTZ,'AT&T Stadium',           3, 2),
      ('2026-07-12 01:00:00+00'::TIMESTAMPTZ,'Mercedes-Benz Stadium',  3, 3),
      ('2026-07-12 22:00:00+00'::TIMESTAMPTZ,'Levi''s Stadium',        3, 4),
      /* ── Semifinales (round=4 · Jul 14–15) ── */
      ('2026-07-14 22:00:00+00'::TIMESTAMPTZ,'AT&T Stadium',           4, 1),
      ('2026-07-15 22:00:00+00'::TIMESTAMPTZ,'MetLife Stadium',        4, 2),
      /* ── Final (round=5, pos=1 · Jul 19) ── */
      ('2026-07-19 22:00:00+00'::TIMESTAMPTZ,'MetLife Stadium',        5, 1),
      /* ── Tercer Lugar (round=5, pos=2 · Jul 18) ── */
      ('2026-07-18 18:00:00+00'::TIMESTAMPTZ,'Hard Rock Stadium',      5, 2)
    ) AS m(start_ts, stad, rnd, bpos);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 9. TEAM_LEAGUE — una fila por selección en la liga de quinielas
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO "TEAM_LEAGUE" (league_id, team_id, points, games_played, wins, draws, losses, goals_for, goals_against, created_by, created_at, is_deleted)
SELECT
  (SELECT league_id FROM "LEAGUE" WHERE name = 'Mundial FIFA 2026 — Quiniela Global' LIMIT 1),
  t.team_id,
  0, 0, 0, 0, 0, 0, 0,
  1, NOW(), false
FROM "TEAM" t
WHERE t.name IN (
  'México','Francia','Japón','Cabo Verde',
  'Canadá','Bélgica','Marruecos','Colombia',
  'España','Túnez','Uzbekistán','TBD-Grupo C',
  'Estados Unidos','Arabia Saudita','Paraguay','Jordania',
  'Argentina','Egipto','Guatemala','TBD-Grupo E',
  'Inglaterra','Ghana','Islandia','Panamá',
  'Brasil','Qatar','Nueva Zelanda','TBD-Grupo G',
  'Alemania','Argelia','República Checa','TBD-Grupo H',
  'Portugal','Corea del Sur','Uruguay','TBD-Grupo I',
  'Países Bajos','Senegal','Irak','Perú',
  'Croacia','Ecuador','Bosnia y Herzegovina','Australia',
  'Serbia','Austria','Costa de Marfil','Haití'
)
AND t.is_deleted = false
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- 10. GRUPO_STANDING — una fila por equipo por grupo (stats en cero)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO "GRUPO_STANDING" (grupo_id, team_id, created_by, created_at, is_deleted)
SELECT
  g.grupo_id,
  t.team_id,
  1, NOW(), false
FROM (VALUES
  ('A','México'),('A','Francia'),('A','Japón'),('A','Cabo Verde'),
  ('B','Canadá'),('B','Bélgica'),('B','Marruecos'),('B','Colombia'),
  ('C','España'),('C','Túnez'),('C','Uzbekistán'),('C','TBD-Grupo C'),
  ('D','Estados Unidos'),('D','Arabia Saudita'),('D','Paraguay'),('D','Jordania'),
  ('E','Argentina'),('E','Egipto'),('E','Guatemala'),('E','TBD-Grupo E'),
  ('F','Inglaterra'),('F','Ghana'),('F','Islandia'),('F','Panamá'),
  ('G','Brasil'),('G','Qatar'),('G','Nueva Zelanda'),('G','TBD-Grupo G'),
  ('H','Alemania'),('H','Argelia'),('H','República Checa'),('H','TBD-Grupo H'),
  ('I','Portugal'),('I','Corea del Sur'),('I','Uruguay'),('I','TBD-Grupo I'),
  ('J','Países Bajos'),('J','Senegal'),('J','Irak'),('J','Perú'),
  ('K','Croacia'),('K','Ecuador'),('K','Bosnia y Herzegovina'),('K','Australia'),
  ('L','Serbia'),('L','Austria'),('L','Costa de Marfil'),('L','Haití')
) AS gs(grp, tname)
JOIN "GRUPO" g ON g.name = gs.grp
  AND g.world_league_id = (SELECT world_league_id FROM "WORLD_LEAGUE" WHERE name = 'FIFA World Cup 2026' LIMIT 1)
  AND g.is_deleted = false
JOIN "TEAM" t ON t.name = gs.tname AND t.is_deleted = false
ON CONFLICT (grupo_id, team_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- 11. Migration log
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.20-seed',
  'mundial-seed',
  'Seed completo del Mundial FIFA 2026: 26 países, 16 stadiums, 48 equipos, 12 grupos, 1 liga, 104 partidos, TEAM_LEAGUE y GRUPO_STANDING',
  'db/script/v3.20-mundial-seed.sql',
  NOW(),
  'applied'
)
ON CONFLICT DO NOTHING;

COMMIT;
