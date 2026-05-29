-- v3.49: Allow recipients of pending invitations to see the invited league name
--
-- PROBLEM:
--   When a user receives an invitation they are not yet a league member.
--   The existing user_select_own_league policy only covers creators and members,
--   so the LEAGUE join in getPendingForUser returns null → no league name shown.
--
-- SOLUTION:
--   Add a new permissive SELECT policy so invited users can see league info
--   for leagues they have a pending invitation to.
--   Permissive policies use OR logic in Postgres — the row is visible if any
--   policy passes, so this co-exists safely with user_select_own_league.

CREATE POLICY "user_select_invited_league" ON "LEAGUE"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   "INVITATION" i
      JOIN   "USER"       u ON u.user_id = get_my_user_id()
      WHERE  i.league_id   = "LEAGUE".league_id
        AND  i.email       = u.email
        AND  i.status      = 'pending'
        AND  i.is_deleted  = false
    )
  );

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.49',
  'invitation-league-rls',
  'Adds user_select_invited_league RLS policy so users with pending invitations can see league name in the /invitaciones page.',
  'db/script/v3.49-invitation-league-rls.sql',
  NOW(),
  'applied'
)
ON CONFLICT (version) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      applied_at  = EXCLUDED.applied_at,
      status      = EXCLUDED.status;
