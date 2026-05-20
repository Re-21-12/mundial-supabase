-- Allow anonymous (unauthenticated) users to read standings data
-- Required for the public /league-preview/:id page

-- USER_LEAGUE: anon can read rows (points, league membership) — no sensitive columns
ALTER TABLE "USER_LEAGUE" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "standings_anon_read" ON "USER_LEAGUE";
CREATE POLICY "standings_anon_read"
  ON "USER_LEAGUE"
  FOR SELECT
  TO anon
  USING (true);

-- USER: anon can read public profile columns (name, login) used in the standings table
ALTER TABLE "USER" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_public_profile_read" ON "USER";
CREATE POLICY "user_public_profile_read"
  ON "USER"
  FOR SELECT
  TO anon
  USING (true);

-- LEAGUE: anon can read league name (used by getLeagueFromToken)
ALTER TABLE "LEAGUE" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "league_anon_read" ON "LEAGUE";
CREATE POLICY "league_anon_read"
  ON "LEAGUE"
  FOR SELECT
  TO anon
  USING (true);
