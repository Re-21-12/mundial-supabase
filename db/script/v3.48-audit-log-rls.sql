-- v3.48: RLS policies for AUDIT_LOG
--
-- Goal:
--   Keep audit writes working for authenticated client sessions and trigger
--   functions, while restricting manual read/update/delete access to users with
--   the corresponding audit_log permissions.

ALTER TABLE "AUDIT_LOG" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_select" ON "AUDIT_LOG";
DROP POLICY IF EXISTS "audit_log_insert" ON "AUDIT_LOG";
DROP POLICY IF EXISTS "audit_log_update" ON "AUDIT_LOG";
DROP POLICY IF EXISTS "audit_log_delete" ON "AUDIT_LOG";

CREATE POLICY "audit_log_select"
  ON "AUDIT_LOG"
  FOR SELECT
  USING (has_permission('audit_log:read'));

CREATE POLICY "audit_log_insert"
  ON "AUDIT_LOG"
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "audit_log_update"
  ON "AUDIT_LOG"
  FOR UPDATE
  USING (has_permission('audit_log:update'))
  WITH CHECK (has_permission('audit_log:update'));

CREATE POLICY "audit_log_delete"
  ON "AUDIT_LOG"
  FOR DELETE
  USING (has_permission('audit_log:delete'));

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.48',
  'audit-log-rls',
  'Adds RLS policies for AUDIT_LOG so authenticated sessions can insert audit rows while read/update/delete remain permissioned.',
  'db/script/v3.48-audit-log-rls.sql',
  NOW(),
  'applied'
)
ON CONFLICT (version) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      applied_at   = EXCLUDED.applied_at,
      status       = EXCLUDED.status;
