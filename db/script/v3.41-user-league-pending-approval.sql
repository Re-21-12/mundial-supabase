-- v3.41: Participant approval flow
--
-- After a user accepts an invitation (magic link or existing-user invite), their
-- USER_LEAGUE row is created with approval_status = 'pending_approval'.
-- The league admin receives a notification_inbox entry of type
-- 'participant_approval' with an action payload containing userLeagueId.
-- The admin approves or rejects from the notification inbox.
--
-- Changes:
--   1. Adds 'pending_approval' as a valid approval_status value (CHECK constraint).
--   2. Ensures the existing-user invite flow also creates a MAGIC_LINK entry so
--      invite.ts can process the token via acceptMagicLink().

-- ─── 1. Update CHECK constraint on USER_LEAGUE.approval_status ────────────────

DO $$
BEGIN
  ALTER TABLE "USER_LEAGUE" DROP CONSTRAINT IF EXISTS ck_user_league_approval_status;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

ALTER TABLE "USER_LEAGUE"
  ADD CONSTRAINT ck_user_league_approval_status
    CHECK (approval_status IN ('approved', 'pending_approval', 'rejected'));

-- ─── 2. Default new rows to 'pending_approval' ────────────────────────────────
-- Existing rows keep their current approval_status (most will be 'approved').
-- The DEFAULT is set to 'pending_approval' so any INSERT without an explicit
-- value goes through the approval gate.

ALTER TABLE "USER_LEAGUE"
  ALTER COLUMN approval_status SET DEFAULT 'pending_approval';

-- ─── 3. Migration log ──────────────────────────────────────────────────────────

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.41',
  'user-league-pending-approval',
  'Adds CHECK constraint for USER_LEAGUE.approval_status including pending_approval. Changes default to pending_approval so invitation acceptances require admin approval before the user gains full membership.',
  'db/script/v3.41-user-league-pending-approval.sql',
  NOW(),
  'applied'
)
ON CONFLICT (version) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      applied_at  = EXCLUDED.applied_at,
      status      = EXCLUDED.status;
