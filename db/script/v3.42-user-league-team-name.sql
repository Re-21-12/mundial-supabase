-- v3.42: Team name per user per league
--
-- Requirement: "Cada usuario deberá colocarle un nombre distintivo al equipo
-- que forma parte de una liga."
--
-- Adds a nullable TEXT column to USER_LEAGUE. Nullable because existing records
-- were created before this requirement was enforced; new joins will prompt for it.

ALTER TABLE "USER_LEAGUE"
  ADD COLUMN IF NOT EXISTS team_name TEXT;

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.42',
  'user-league-team-name',
  'Adds USER_LEAGUE.team_name TEXT column so each participant can give their team a distinctive name within a league.',
  'db/script/v3.42-user-league-team-name.sql',
  NOW(),
  'applied'
)
ON CONFLICT (version) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      applied_at  = EXCLUDED.applied_at,
      status      = EXCLUDED.status;
