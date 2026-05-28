-- v3.45: Restrict MATCH visibility to approved league members
--
-- PROBLEM:
--   user_select_own_match allows any USER_LEAGUE row (is_deleted = false) to see
--   matches, including members whose approval_status is 'pending_approval' or
--   'rejected'. Pending users could see all match data for leagues they haven't
--   been approved to join.
--
-- SOLUTION:
--   Add approval_status = 'approved' to the USER_LEAGUE EXISTS check.
--   The LEAGUE owner fallback (l.user_id = get_my_user_id()) is kept so league
--   creators can always see their own league matches regardless of USER_LEAGUE state.

DROP POLICY IF EXISTS user_select_own_match ON "MATCH";

CREATE POLICY user_select_own_match ON "MATCH"
  FOR SELECT
  USING (
    -- Approved league member
    EXISTS (
      SELECT 1
      FROM "USER_LEAGUE" ul
      WHERE ul.league_id       = "MATCH".league_id
        AND ul.user_id         = get_my_user_id()
        AND ul.is_deleted      = false
        AND ul.approval_status = 'approved'
    )
    OR
    -- League owner always has access
    EXISTS (
      SELECT 1
      FROM "LEAGUE" l
      WHERE l.league_id = "MATCH".league_id
        AND l.user_id   = get_my_user_id()
    )
  );

-- ─── Migration log ────────────────────────────────────────────────────────────

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.45',
  'match-rls-approved-only',
  'Adds approval_status = ''approved'' check to user_select_own_match RLS policy so pending/rejected members cannot see league match data.',
  'db/script/v3.45-match-rls-approved-only.sql',
  NOW(),
  'applied'
)
ON CONFLICT (version) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      applied_at  = EXCLUDED.applied_at,
      status      = EXCLUDED.status;
