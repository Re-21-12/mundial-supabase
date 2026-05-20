-- v3.17: TEAM_LEAGUE — proper RLS, audit trigger + Realtime for USER_LEAGUE & TEAM_LEAGUE

-- ── 1. Replace v3.16 basic RLS with per-permission policies ──────────────────

-- Drop the broad policies created in v3.16
DROP POLICY IF EXISTS "TEAM_LEAGUE: public read"        ON "TEAM_LEAGUE";
DROP POLICY IF EXISTS "TEAM_LEAGUE: authenticated write" ON "TEAM_LEAGUE";

-- SELECT: any anon/public user (needed for home standings) + permissioned users
CREATE POLICY "team_league_anon_read" ON "TEAM_LEAGUE"
  FOR SELECT TO anon
  USING (is_deleted = false);

CREATE POLICY "team_league_auth_read" ON "TEAM_LEAGUE"
  FOR SELECT TO authenticated
  USING (has_permission('team_league:read') OR is_deleted = false);

-- INSERT: requires team_league:create
CREATE POLICY "team_league_insert" ON "TEAM_LEAGUE"
  FOR INSERT TO authenticated
  WITH CHECK (has_permission('team_league:create'));

-- UPDATE: requires team_league:update
CREATE POLICY "team_league_update" ON "TEAM_LEAGUE"
  FOR UPDATE TO authenticated
  USING     (has_permission('team_league:update'))
  WITH CHECK (has_permission('team_league:update'));

-- DELETE: requires team_league:delete
CREATE POLICY "team_league_delete" ON "TEAM_LEAGUE"
  FOR DELETE TO authenticated
  USING (has_permission('team_league:delete'));

-- ── 2. Audit log trigger for TEAM_LEAGUE ─────────────────────────────────────

CREATE OR REPLACE FUNCTION audit_team_league()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "AUDIT_LOG" (
    "table_name", "operation_type", "old_values", "new_values",
    "created_by", "created_at", "user_session_id"
  ) VALUES (
    'TEAM_LEAGUE',
    CASE
      WHEN TG_OP = 'INSERT' THEN 'I'
      WHEN TG_OP = 'UPDATE' THEN 'U'
      WHEN TG_OP = 'DELETE' THEN 'D'
    END,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::text ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::text ELSE NULL END,
    COALESCE(NEW.created_by, OLD.created_by),
    CURRENT_TIMESTAMP,
    NULL
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_audit_team_league ON "TEAM_LEAGUE";
CREATE TRIGGER trigger_audit_team_league
  AFTER INSERT OR UPDATE OR DELETE ON "TEAM_LEAGUE"
  FOR EACH ROW EXECUTE FUNCTION audit_team_league();

-- ── 3. Enable Supabase Realtime ───────────────────────────────────────────────
-- REPLICA IDENTITY FULL emits old row data on UPDATE/DELETE so the client
-- receives the full previous record (needed to diff/remove items from signals).

ALTER TABLE "USER_LEAGUE"  REPLICA IDENTITY FULL;
ALTER TABLE "TEAM_LEAGUE"  REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE "USER_LEAGUE";
ALTER PUBLICATION supabase_realtime ADD TABLE "TEAM_LEAGUE";

-- ── 4. Migration log ──────────────────────────────────────────────────────────

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.17',
  'team-league-rls-audit-realtime',
  'Granular RLS + audit trigger for TEAM_LEAGUE; Realtime enabled for USER_LEAGUE and TEAM_LEAGUE',
  'db/script/v3.17-team-league-rls-audit-realtime.sql',
  NOW(),
  'applied'
);
