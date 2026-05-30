-- v3.56: Add missing permissions, roles, and role-permission assignments
--
-- GAPS FOUND:
--   PERMISSIONS: 9 special permissions used in RLS but missing from PERMISSION table
--   ROLES:       'client' (checked in isClientUser()) and 'support' missing
--   ROLE_PERMS:  admin_league=0, user/user_league missing several, client/support unassigned
--   RLS FIX:     INVITATION/MAGIC_LINK policies use uppercase 'INVITATION:admin' — normalize

-- ── 1. Missing special permissions ───────────────────────────────────────────

INSERT INTO "PERMISSION" (name, description, is_deleted)
VALUES
  ('league:admin',       'Control total de ligas (RLS admin)',         false),
  ('match:admin',        'Control total de partidos (RLS admin)',       false),
  ('stadium:admin',      'Control total de estadios (RLS admin)',       false),
  ('team:admin',         'Control total de equipos (RLS admin)',        false),
  ('transaction:admin',  'Control total de transacciones (RLS admin)', false),
  ('invitation:admin',   'Control total de invitaciones (RLS admin)',  false),
  ('magic_link:admin',   'Control total de magic links (RLS admin)',   false),
  ('prediction:read_all','Ver todas las predicciones de cualquier liga',false),
  ('support:view',       'Vista de soporte: lectura de datos activos', false)
ON CONFLICT DO NOTHING;

-- ── 2. Missing roles ──────────────────────────────────────────────────────────

INSERT INTO "ROLE" (name, description, is_deleted)
VALUES
  ('client',  'Cliente estándar: hace predicciones y gestiona sus ligas', false),
  ('support', 'Soporte técnico: lectura amplia, sin escritura destructiva', false)
ON CONFLICT DO NOTHING;

-- ── 3. Role-permission assignments ───────────────────────────────────────────

WITH pairs(role_name, perm_name) AS (VALUES
  -- admin: new special permissions
  ('admin', 'league:admin'),
  ('admin', 'match:admin'),
  ('admin', 'stadium:admin'),
  ('admin', 'team:admin'),
  ('admin', 'transaction:admin'),
  ('admin', 'invitation:admin'),
  ('admin', 'magic_link:admin'),
  ('admin', 'prediction:read_all'),
  ('admin', 'support:view'),

  -- admin_league: league manager / score operator
  ('admin_league', 'bracket:read'),
  ('admin_league', 'bracket:update'),
  ('admin_league', 'catalog:read'),
  ('admin_league', 'league:admin'),
  ('admin_league', 'league:create'),
  ('admin_league', 'league:read'),
  ('admin_league', 'league:update'),
  ('admin_league', 'league_reward:read'),
  ('admin_league', 'match:admin'),
  ('admin_league', 'match:create'),
  ('admin_league', 'match:read'),
  ('admin_league', 'match:update'),
  ('admin_league', 'match_period:create'),
  ('admin_league', 'match_period:read'),
  ('admin_league', 'match_period:update'),
  ('admin_league', 'prediction:read_all'),
  ('admin_league', 'rules_league:read'),
  ('admin_league', 'stadium:read'),
  ('admin_league', 'team:read'),
  ('admin_league', 'team_league:read'),
  ('admin_league', 'team_league:update'),
  ('admin_league', 'user_league:read'),
  ('admin_league', 'world_league:read'),

  -- user: add missing permissions
  ('user', 'invitation:create'),
  ('user', 'invitation:read'),
  ('user', 'league_reward:read'),
  ('user', 'rules_league:read'),
  ('user', 'team_league:read'),
  ('user', 'user_league:create'),
  ('user', 'user_league:read'),

  -- user_league: add missing permissions
  ('user_league', 'league_reward:read'),
  ('user_league', 'rules_league:read'),
  ('user_league', 'team_league:read'),

  -- client: full client permissions
  ('client', 'catalog:read'),
  ('client', 'invitation:create'),
  ('client', 'invitation:read'),
  ('client', 'league:create'),
  ('client', 'league:read'),
  ('client', 'league:update'),
  ('client', 'league_reward:read'),
  ('client', 'match:read'),
  ('client', 'match_period:read'),
  ('client', 'prediction:create'),
  ('client', 'prediction:delete'),
  ('client', 'prediction:read'),
  ('client', 'prediction:restore'),
  ('client', 'prediction:update'),
  ('client', 'rules_league:read'),
  ('client', 'stadium:read'),
  ('client', 'team:read'),
  ('client', 'team_league:read'),
  ('client', 'transaction:create'),
  ('client', 'transaction:read'),
  ('client', 'user_league:create'),
  ('client', 'user_league:read'),
  ('client', 'wallet:read'),
  ('client', 'world_league:read'),

  -- support: read-only + special view permissions
  ('support', 'audit_log:read'),
  ('support', 'bracket:read'),
  ('support', 'catalog:read'),
  ('support', 'invitation:read'),
  ('support', 'league:read'),
  ('support', 'league_reward:read'),
  ('support', 'match:read'),
  ('support', 'match_period:read'),
  ('support', 'permission:read'),
  ('support', 'prediction:read'),
  ('support', 'prediction:read_all'),
  ('support', 'role:read'),
  ('support', 'role_permission:read'),
  ('support', 'rules_league:read'),
  ('support', 'stadium:read'),
  ('support', 'support:view'),
  ('support', 'team:read'),
  ('support', 'team_league:read'),
  ('support', 'transaction:read'),
  ('support', 'user:read'),
  ('support', 'user_league:read'),
  ('support', 'user_league_reward:read'),
  ('support', 'user_role:read'),
  ('support', 'user_session:read'),
  ('support', 'wallet:read'),
  ('support', 'world_league:read')
)
INSERT INTO "ROLE_PERMISSION" (role_id, permission_id, is_deleted, created_at)
SELECT r.role_id, p.permission_id, false, NOW()
FROM   pairs
JOIN   "ROLE"       r ON r.name = pairs.role_name AND r.is_deleted = false
JOIN   "PERMISSION" p ON p.name = pairs.perm_name AND p.is_deleted = false
WHERE  NOT EXISTS (
  SELECT 1 FROM "ROLE_PERMISSION" rp2
  WHERE  rp2.role_id       = r.role_id
    AND  rp2.permission_id = p.permission_id
    AND  rp2.is_deleted    = false
);

-- ── 4. Fix RLS: normalize uppercase INVITATION:admin → invitation:admin ───────

DROP POLICY IF EXISTS "magic_link_admin_all" ON "MAGIC_LINK";
CREATE POLICY "magic_link_admin_all" ON "MAGIC_LINK"
  FOR ALL TO authenticated
  USING     (has_permission('magic_link:admin'))
  WITH CHECK(has_permission('magic_link:admin'));

DROP POLICY IF EXISTS "invitation_admin_all" ON "INVITATION";
CREATE POLICY "invitation_admin_all" ON "INVITATION"
  FOR ALL TO authenticated
  USING     (has_permission('invitation:admin'))
  WITH CHECK(has_permission('invitation:admin'));

-- ── Migration log ─────────────────────────────────────────────────────────────
INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.56',
  'seed-missing-permissions-roles',
  'Adds 9 missing RLS-used permissions, client and support roles, and full role-permission assignments for all roles. Fixes INVITATION/MAGIC_LINK RLS policies to use lowercase permission names.',
  'db/script/v3.56-seed-missing-permissions-roles.sql',
  NOW(),
  'applied'
)
ON CONFLICT (version) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description,
      applied_at = EXCLUDED.applied_at, status = EXCLUDED.status;
