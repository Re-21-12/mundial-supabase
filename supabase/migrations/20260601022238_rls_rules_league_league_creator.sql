-- Allow the league creator to insert rules for their own leagues.
-- Previously the only INSERT policy required 'rules_league:create' (admin-only),
-- so regular users got a 42501 RLS violation when creating a league.
CREATE POLICY "policy_league_creator_insert"
ON public."RULES_LEAGUE"
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public."LEAGUE" l
    WHERE l.league_id = "RULES_LEAGUE".league_id
      AND l.created_by = public.get_my_user_id()
      AND l.is_deleted = false
  )
);

-- Allow league creators and members to read the rules of their leagues.
-- Previously the only SELECT policy required 'rules_league:read' (admin-only).
CREATE POLICY "policy_league_member_select"
ON public."RULES_LEAGUE"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public."LEAGUE" l
    WHERE l.league_id = "RULES_LEAGUE".league_id
      AND l.is_deleted = false
      AND (
        l.created_by = public.get_my_user_id()
        OR EXISTS (
          SELECT 1
          FROM public."USER_LEAGUE" ul
          WHERE ul.league_id = l.league_id
            AND ul.user_id = public.get_my_user_id()
            AND ul.is_deleted = false
        )
      )
  )
);
