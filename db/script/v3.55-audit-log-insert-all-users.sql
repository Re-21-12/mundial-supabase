-- v3.55: Allow all authenticated users to insert into AUDIT_LOG
--
-- PROBLEM:
--   The only INSERT policy on AUDIT_LOG is policy_admin_insert which requires
--   the 'audit_log:create' permission. Regular client users don't have this
--   permission → error 42501 when any user action triggers an audit log write.
--
-- SOLUTION:
--   Replace policy_admin_insert with a policy that lets ALL authenticated
--   users insert their own audit rows. Reads/updates/deletes remain admin-only.

DROP POLICY IF EXISTS "policy_admin_insert" ON "AUDIT_LOG";
DROP POLICY IF EXISTS "audit_log_insert"    ON "AUDIT_LOG";

CREATE POLICY "audit_log_insert_authenticated"
  ON "AUDIT_LOG"
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.55',
  'audit-log-insert-all-users',
  'Replaces admin-only audit_log INSERT policy with one that allows all authenticated users to write audit rows. Read/update/delete remain restricted to permissioned roles.',
  'db/script/v3.55-audit-log-insert-all-users.sql',
  NOW(),
  'applied'
)
ON CONFLICT (version) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description,
      applied_at = EXCLUDED.applied_at, status = EXCLUDED.status;
