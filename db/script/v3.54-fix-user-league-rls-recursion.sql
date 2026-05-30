-- v3.54: Fix infinite recursion in USER_LEAGUE RLS policies
--
-- ROOT CAUSE:
--   league_owner_select_members queries LEAGUE with RLS active.
--   LEAGUE's user_select_own_league policy queries USER_LEAGUE with RLS active.
--   → USER_LEAGUE policy → LEAGUE policy → USER_LEAGUE policy → infinite loop.
--
-- FIX:
--   Wrap the LEAGUE ownership check in a SECURITY DEFINER function.
--   SECURITY DEFINER runs as the function owner (postgres/superuser), so its
--   SELECT against LEAGUE bypasses LEAGUE's RLS, breaking the cycle.
--   get_my_user_id() still returns the correct caller's user ID because it
--   reads from the JWT/session context, which is preserved in SECURITY DEFINER.

-- ── Drop broken policies ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "league_owner_select_members" ON "USER_LEAGUE";
DROP POLICY IF EXISTS "league_owner_update_members" ON "USER_LEAGUE";

-- ── SECURITY DEFINER helper — bypasses LEAGUE RLS to check ownership ──────────
CREATE OR REPLACE FUNCTION user_owns_league(p_league_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   "LEAGUE"
    WHERE  league_id  = p_league_id
      AND  user_id    = get_my_user_id()
      AND  is_deleted = false
  );
$$;

GRANT EXECUTE ON FUNCTION user_owns_league(integer) TO authenticated;

-- ── Recreate policies using the helper ───────────────────────────────────────
CREATE POLICY "league_owner_select_members"
  ON "USER_LEAGUE"
  FOR SELECT
  TO authenticated
  USING (user_owns_league(league_id));

CREATE POLICY "league_owner_update_members"
  ON "USER_LEAGUE"
  FOR UPDATE
  TO authenticated
  USING     (user_owns_league(league_id))
  WITH CHECK (user_owns_league(league_id));

-- ── Migration log ─────────────────────────────────────────────────────────────
INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.54',
  'fix-user-league-rls-recursion',
  'Fixes infinite recursion in league_owner_select/update_members policies by replacing the inline EXISTS(SELECT FROM LEAGUE) with a SECURITY DEFINER helper function user_owns_league() that bypasses LEAGUE RLS and breaks the cycle.',
  'db/script/v3.54-fix-user-league-rls-recursion.sql',
  NOW(),
  'applied'
)
ON CONFLICT (version) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description,
      applied_at = EXCLUDED.applied_at, status = EXCLUDED.status;
