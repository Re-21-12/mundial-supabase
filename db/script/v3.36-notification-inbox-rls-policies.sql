-- v3.36: RLS policies for NOTIFICATION_INBOX
--
-- Problem: RLS was enabled on NOTIFICATION_INBOX but no policies existed,
-- so the authenticated role was fully blocked (default deny).
-- Notifications inserted by SECURITY DEFINER functions (notify_league_finished)
-- were saved, but Angular-initiated inserts failed silently and all SELECTs
-- returned empty for every user.
--
-- Pattern: get_my_user_id() maps auth.uid() → internal USER.user_id (integer),
-- matching the pattern used by USER, USER_LEAGUE, LEAGUE, etc.

-- SELECT: users can only read their own notifications
CREATE POLICY "notification_inbox_select_own"
  ON "NOTIFICATION_INBOX"
  FOR SELECT
  TO authenticated
  USING (user_id = get_my_user_id());

-- INSERT: authenticated users can create notifications (may be for other users,
-- e.g. notifying a league owner when someone accepts an invitation)
CREATE POLICY "notification_inbox_insert_authenticated"
  ON "NOTIFICATION_INBOX"
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = get_my_user_id());

-- UPDATE: users can only update their own notifications (mark as read, soft delete)
CREATE POLICY "notification_inbox_update_own"
  ON "NOTIFICATION_INBOX"
  FOR UPDATE
  TO authenticated
  USING (user_id = get_my_user_id())
  WITH CHECK (user_id = get_my_user_id());

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.36',
  'notification-inbox-rls-policies',
  'Adds SELECT/INSERT/UPDATE RLS policies on NOTIFICATION_INBOX. Without these, RLS was enabled but no policies existed, blocking all authenticated reads and writes.',
  'db/script/v3.36-notification-inbox-rls-policies.sql',
  NOW(),
  'applied'
)
ON CONFLICT (version) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      applied_at  = EXCLUDED.applied_at,
      status      = EXCLUDED.status;
