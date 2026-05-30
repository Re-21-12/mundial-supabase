-- v3.52: Allow league owners to manage their league members
--
-- PROBLEM:
--   A client who creates a league is the owner (LEAGUE.user_id = their user_id).
--   When they try to approve/reject pending USER_LEAGUE rows for their league,
--   the update silently fails because no existing policy covers this case:
--     · policy_user_update:  only allows updating the user's OWN row (user_id = self)
--     · policy_admin_update: requires 'user_league:update' permission (admin only)
--
-- SOLUTION:
--   Add SELECT + UPDATE policies so league owners can read and manage
--   all USER_LEAGUE rows that belong to their leagues.

-- ── SELECT: owner can see all members of their leagues ───────────────────────
CREATE POLICY "league_owner_select_members"
  ON "USER_LEAGUE"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "LEAGUE" l
      WHERE  l.league_id  = "USER_LEAGUE".league_id
        AND  l.user_id    = get_my_user_id()
        AND  l.is_deleted = false
    )
  );

-- ── UPDATE: owner can approve / reject members ────────────────────────────────
CREATE POLICY "league_owner_update_members"
  ON "USER_LEAGUE"
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "LEAGUE" l
      WHERE  l.league_id  = "USER_LEAGUE".league_id
        AND  l.user_id    = get_my_user_id()
        AND  l.is_deleted = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "LEAGUE" l
      WHERE  l.league_id  = "USER_LEAGUE".league_id
        AND  l.user_id    = get_my_user_id()
        AND  l.is_deleted = false
    )
  );

-- ── Migration log ─────────────────────────────────────────────────────────────
INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.52',
  'league-owner-manage-members',
  'Adds league_owner_select_members and league_owner_update_members RLS policies so the creator of a league can read and approve/reject pending USER_LEAGUE rows without needing the admin user_league:update permission.',
  'db/script/v3.52-league-owner-manage-members.sql',
  NOW(),
  'applied'
)
ON CONFLICT (version) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description,
      applied_at = EXCLUDED.applied_at, status = EXCLUDED.status;
