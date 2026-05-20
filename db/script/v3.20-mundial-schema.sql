-- ═══════════════════════════════════════════════════════════════════════
-- v3.20 · FIFA World Cup 2026 — Schema (DDL only)
--
-- New tables:
--   GRUPO          → master table for groups A–L
--   GRUPO_STANDING → per-team group standings
--     = Pasa de ronda   → advances
--     PJ Partidos Jugados→ games_played
--     G  Victorias       → wins
--     E  Empates         → draws
--     P  Derrotas        → losses
--     DG Diferencia Goles→ goal_diff
--     Pts Puntos         → points
--
-- Altered table:
--   MATCH → grupo_id FK (nullable; set for group-stage matches)
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- 1. GRUPO
-- ───────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "GRUPO" (
  grupo_id        SERIAL       PRIMARY KEY,
  world_league_id INT          NOT NULL REFERENCES "WORLD_LEAGUE"(world_league_id),
  host_stadium_id INT          REFERENCES "STADIUM"(stadium_id),   -- país anfitrión del grupo
  name            VARCHAR(2)   NOT NULL,
  created_by      INT          REFERENCES "USER"(user_id),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_by      INT          REFERENCES "USER"(user_id),
  updated_at      TIMESTAMPTZ,
  deleted_by      INT          REFERENCES "USER"(user_id),
  deleted_at      TIMESTAMPTZ,
  is_deleted      BOOLEAN      NOT NULL DEFAULT false,
  UNIQUE(world_league_id, name)
);

CREATE INDEX IF NOT EXISTS idx_grupo_world_league ON "GRUPO"(world_league_id) WHERE is_deleted = false;

-- ───────────────────────────────────────────────────────────────────────
-- 2. GRUPO_STANDING  (una fila por equipo por grupo)
-- ───────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "GRUPO_STANDING" (
  grupo_standing_id SERIAL      PRIMARY KEY,
  grupo_id          INT         NOT NULL REFERENCES "GRUPO"(grupo_id),
  team_id           INT         NOT NULL REFERENCES "TEAM"(team_id),
  advances          BOOLEAN,                          -- =  Pasa de ronda
  games_played      SMALLINT    NOT NULL DEFAULT 0,   -- PJ Partidos Jugados
  wins              SMALLINT    NOT NULL DEFAULT 0,   -- G  Victorias
  draws             SMALLINT    NOT NULL DEFAULT 0,   -- E  Empates
  losses            SMALLINT    NOT NULL DEFAULT 0,   -- P  Derrotas
  goals_for         SMALLINT    NOT NULL DEFAULT 0,
  goals_against     SMALLINT    NOT NULL DEFAULT 0,
  goal_diff         SMALLINT    NOT NULL DEFAULT 0,   -- DG Diferencia de Goles
  points            SMALLINT    NOT NULL DEFAULT 0,   -- Pts Puntos
  position          SMALLINT,
  created_by        INT         REFERENCES "USER"(user_id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        INT         REFERENCES "USER"(user_id),
  updated_at        TIMESTAMPTZ,
  deleted_by        INT         REFERENCES "USER"(user_id),
  deleted_at        TIMESTAMPTZ,
  is_deleted        BOOLEAN     NOT NULL DEFAULT false,
  UNIQUE(grupo_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_grupo_standing_grupo
  ON "GRUPO_STANDING"(grupo_id, points DESC, goal_diff DESC)
  WHERE is_deleted = false;

-- ───────────────────────────────────────────────────────────────────────
-- 3. ALTER MATCH → add grupo_id
-- ───────────────────────────────────────────────────────────────────────

ALTER TABLE "MATCH"
  ADD COLUMN IF NOT EXISTS grupo_id INT REFERENCES "GRUPO"(grupo_id);

CREATE INDEX IF NOT EXISTS idx_match_grupo ON "MATCH"(grupo_id) WHERE grupo_id IS NOT NULL AND is_deleted = false;

-- ───────────────────────────────────────────────────────────────────────
-- 4. RLS — allow authenticated to read both new tables
-- ───────────────────────────────────────────────────────────────────────

ALTER TABLE "GRUPO"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GRUPO_STANDING" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'GRUPO' AND policyname = 'grupo_read') THEN
    CREATE POLICY grupo_read ON "GRUPO" FOR SELECT TO authenticated USING (is_deleted = false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'GRUPO_STANDING' AND policyname = 'grupo_standing_read') THEN
    CREATE POLICY grupo_standing_read ON "GRUPO_STANDING" FOR SELECT TO authenticated USING (is_deleted = false);
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- 5. Realtime
-- ───────────────────────────────────────────────────────────────────────

ALTER TABLE "GRUPO_STANDING" REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE "GRUPO_STANDING";

-- ───────────────────────────────────────────────────────────────────────
-- 6. Migration log
-- ───────────────────────────────────────────────────────────────────────

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.20',
  'mundial-schema',
  'New GRUPO + GRUPO_STANDING tables; ALTER MATCH add grupo_id; RLS + realtime for standings',
  'db/script/v3.20-mundial-schema.sql',
  NOW(),
  'applied'
)
ON CONFLICT DO NOTHING;

COMMIT;
