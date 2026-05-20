-- v3.16: TEAM_LEAGUE — links teams to leagues for scheduling and standings

-- ── 1. Table ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "TEAM_LEAGUE" (
  team_league_id  SERIAL       PRIMARY KEY,
  league_id       INTEGER      NOT NULL REFERENCES "LEAGUE"(league_id)  ON DELETE CASCADE,
  team_id         INTEGER      NOT NULL REFERENCES "TEAM"(team_id)      ON DELETE CASCADE,
  points          SMALLINT     NOT NULL DEFAULT 0,
  games_played    SMALLINT     NOT NULL DEFAULT 0,
  wins            SMALLINT     NOT NULL DEFAULT 0,
  draws           SMALLINT     NOT NULL DEFAULT 0,
  losses          SMALLINT     NOT NULL DEFAULT 0,
  goals_for       SMALLINT     NOT NULL DEFAULT 0,
  goals_against   SMALLINT     NOT NULL DEFAULT 0,
  is_deleted      BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_by      INTEGER      NULL REFERENCES "USER"(user_id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ  NULL,
  updated_by      INTEGER      NULL REFERENCES "USER"(user_id) ON DELETE SET NULL,
  deleted_at      TIMESTAMPTZ  NULL,
  deleted_by      INTEGER      NULL REFERENCES "USER"(user_id) ON DELETE SET NULL
);

-- ── 2. Indexes ────────────────────────────────────────────────────────────────

-- Unique team per league (ignores soft-deleted rows)
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_league_unique
  ON "TEAM_LEAGUE" (league_id, team_id)
  WHERE is_deleted = false;

-- Fast lookup by league for standings queries
CREATE INDEX IF NOT EXISTS idx_team_league_league
  ON "TEAM_LEAGUE" (league_id, points DESC)
  WHERE is_deleted = false;

-- ── 3. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE "TEAM_LEAGUE" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'TEAM_LEAGUE' AND policyname = 'TEAM_LEAGUE: public read'
  ) THEN
    EXECUTE 'CREATE POLICY "TEAM_LEAGUE: public read" ON "TEAM_LEAGUE" FOR SELECT USING (is_deleted = false)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'TEAM_LEAGUE' AND policyname = 'TEAM_LEAGUE: authenticated write'
  ) THEN
    EXECUTE 'CREATE POLICY "TEAM_LEAGUE: authenticated write" ON "TEAM_LEAGUE" FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END;
$$;

-- ── 4. Migration log ──────────────────────────────────────────────────────────

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.16',
  'team-league',
  'TEAM_LEAGUE table: associates teams to leagues for match scheduling and team standings',
  'db/script/v3.16-team-league.sql',
  NOW(),
  'applied'
);
