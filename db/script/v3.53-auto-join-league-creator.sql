-- v3.53: Auto-join league creator on LEAGUE INSERT
--
-- PROBLEM:
--   Leagues created via the admin /league page don't call addUserToLeague(),
--   so the creator is never added to USER_LEAGUE. This prevents them from:
--     · appearing in their own league standings
--     · seeing pending approval requests (approval RLS checks USER_LEAGUE membership)
--
-- SOLUTION:
--   1. Add UNIQUE partial index on (user_id, league_id) WHERE is_deleted=false
--      so duplicate active memberships are impossible regardless of insertion path.
--   2. AFTER INSERT trigger that inserts the creator into USER_LEAGUE as approved.
--   3. Backfill existing leagues where the owner is not yet a member.

-- ── 1. Unique partial index (active memberships only) ────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uidx_user_league_active
  ON "USER_LEAGUE" (user_id, league_id)
  WHERE is_deleted = false;

-- ── 2. Trigger: auto-join creator on LEAGUE INSERT ───────────────────────────
CREATE OR REPLACE FUNCTION trg_auto_join_league_creator()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.is_deleted      THEN RETURN NEW; END IF;

  INSERT INTO "USER_LEAGUE"
    (league_id, user_id, accumulated_points, approval_status, created_by, is_deleted)
  VALUES
    (NEW.league_id, NEW.user_id, 0, 'approved', NEW.user_id, false)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_join_league_creator ON "LEAGUE";
CREATE TRIGGER trg_auto_join_league_creator
  AFTER INSERT ON "LEAGUE"
  FOR EACH ROW
  EXECUTE FUNCTION trg_auto_join_league_creator();

-- ── 3. Backfill: insert owner into USER_LEAGUE for existing leagues ───────────
INSERT INTO "USER_LEAGUE"
  (league_id, user_id, accumulated_points, approval_status, created_by, is_deleted)
SELECT l.league_id, l.user_id, 0, 'approved', l.user_id, false
FROM   "LEAGUE" l
WHERE  l.is_deleted = false
  AND  l.user_id IS NOT NULL
  AND  NOT EXISTS (
    SELECT 1 FROM "USER_LEAGUE" ul
    WHERE  ul.league_id  = l.league_id
      AND  ul.user_id    = l.user_id
      AND  ul.is_deleted = false
  )
ON CONFLICT DO NOTHING;

-- ── Migration log ─────────────────────────────────────────────────────────────
INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.53',
  'auto-join-league-creator',
  'Adds UNIQUE partial index on USER_LEAGUE(user_id, league_id) WHERE is_deleted=false, AFTER INSERT trigger trg_auto_join_league_creator to auto-join league owners as approved members, and backfills existing leagues.',
  'db/script/v3.53-auto-join-league-creator.sql',
  NOW(),
  'applied'
)
ON CONFLICT (version) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description,
      applied_at = EXCLUDED.applied_at, status = EXCLUDED.status;
