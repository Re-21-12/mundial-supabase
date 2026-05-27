-- v3.37: RLS policies for MIGRATION_LOG, BROWSER_NOTIFICATION_LOG, PREDICTION_LOCK
--
-- Same root cause as v3.36: RLS enabled but no policies → default deny for
-- the authenticated role.

-- ─── MIGRATION_LOG ────────────────────────────────────────────────────────────
-- Admin-only read. Inserts come from migration scripts (service_role bypasses RLS).

CREATE POLICY "migration_log_select_admin"
  ON "MIGRATION_LOG"
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'user_role') = 'admin');

CREATE POLICY "migration_log_insert_admin"
  ON "MIGRATION_LOG"
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'user_role') = 'admin');

-- ─── BROWSER_NOTIFICATION_LOG ─────────────────────────────────────────────────
-- Users can read/write logs for their own notifications.

CREATE POLICY "browser_notification_log_select_own"
  ON "BROWSER_NOTIFICATION_LOG"
  FOR SELECT
  TO authenticated
  USING (user_id = get_my_user_id());

CREATE POLICY "browser_notification_log_insert_own"
  ON "BROWSER_NOTIFICATION_LOG"
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = get_my_user_id());

-- ─── PREDICTION_LOCK ──────────────────────────────────────────────────────────
-- All authenticated users need SELECT to check if a match is locked before
-- making a prediction.
-- INSERT/UPDATE restricted to admins (only operators lock predictions).

CREATE POLICY "prediction_lock_select_authenticated"
  ON "PREDICTION_LOCK"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "prediction_lock_insert_admin"
  ON "PREDICTION_LOCK"
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'user_role') = 'admin');

CREATE POLICY "prediction_lock_update_admin"
  ON "PREDICTION_LOCK"
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'user_role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_role') = 'admin');

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.37',
  'missing-rls-policies',
  'Adds RLS policies for MIGRATION_LOG (admin-only), BROWSER_NOTIFICATION_LOG (own rows), and PREDICTION_LOCK (select all-auth, write admin-only). All three had RLS enabled with zero policies.',
  'db/script/v3.37-missing-rls-policies.sql',
  NOW(),
  'applied'
)
ON CONFLICT (version) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      applied_at  = EXCLUDED.applied_at,
      status      = EXCLUDED.status;
