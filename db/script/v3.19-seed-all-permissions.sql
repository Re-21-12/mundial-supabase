-- v3.19: Seed all permissions from the app's PERMISSIONS enum
-- and assign them to the admin role (role_id = 1).
-- Uses ON CONFLICT DO NOTHING — safe to run multiple times.

-- ── 1. Insert all permissions ─────────────────────────────────────────────────

INSERT INTO "PERMISSION" (name, description, created_by, created_at, is_deleted)
VALUES
  -- AUDIT_LOG
  ('audit_log:create',  'Create audit logs',                1, NOW(), false),
  ('audit_log:read',    'Read audit logs',                  1, NOW(), false),
  ('audit_log:update',  'Update audit logs',                1, NOW(), false),
  ('audit_log:delete',  'Delete audit logs',                1, NOW(), false),
  ('audit_log:restore', 'Restore audit logs',               1, NOW(), false),
  -- CATALOG
  ('catalog:create',    'Create catalogs',                  1, NOW(), false),
  ('catalog:read',      'Read catalogs',                    1, NOW(), false),
  ('catalog:update',    'Update catalogs',                  1, NOW(), false),
  ('catalog:delete',    'Delete catalogs',                  1, NOW(), false),
  ('catalog:restore',   'Restore catalogs',                 1, NOW(), false),
  -- INVITATION
  ('invitation:create', 'Create invitations',               1, NOW(), false),
  ('invitation:read',   'Read invitations',                 1, NOW(), false),
  ('invitation:update', 'Update invitations',               1, NOW(), false),
  ('invitation:delete', 'Delete invitations',               1, NOW(), false),
  ('invitation:restore','Restore invitations',              1, NOW(), false),
  -- LEAGUE
  ('league:create',     'Create leagues',                   1, NOW(), false),
  ('league:read',       'Read leagues',                     1, NOW(), false),
  ('league:update',     'Update leagues',                   1, NOW(), false),
  ('league:delete',     'Delete leagues',                   1, NOW(), false),
  ('league:restore',    'Restore leagues',                  1, NOW(), false),
  -- LEAGUE_REWARD
  ('league_reward:create',  'Create league rewards',        1, NOW(), false),
  ('league_reward:read',    'Read league rewards',          1, NOW(), false),
  ('league_reward:update',  'Update league rewards',        1, NOW(), false),
  ('league_reward:delete',  'Delete league rewards',        1, NOW(), false),
  ('league_reward:restore', 'Restore league rewards',       1, NOW(), false),
  -- MATCH
  ('match:create',      'Create matches',                   1, NOW(), false),
  ('match:read',        'Read matches',                     1, NOW(), false),
  ('match:update',      'Update matches',                   1, NOW(), false),
  ('match:delete',      'Delete matches',                   1, NOW(), false),
  ('match:restore',     'Restore matches',                  1, NOW(), false),
  -- MATCH_PERIOD
  ('match_period:create',  'Create match periods',          1, NOW(), false),
  ('match_period:read',    'Read match periods',            1, NOW(), false),
  ('match_period:update',  'Update match periods',          1, NOW(), false),
  ('match_period:delete',  'Delete match periods',          1, NOW(), false),
  ('match_period:restore', 'Restore match periods',         1, NOW(), false),
  -- PERMISSION
  ('permission:create', 'Create permissions',               1, NOW(), false),
  ('permission:read',   'Read permissions',                 1, NOW(), false),
  ('permission:update', 'Update permissions',               1, NOW(), false),
  ('permission:delete', 'Delete permissions',               1, NOW(), false),
  ('permission:restore','Restore permissions',              1, NOW(), false),
  -- PREDICTION
  ('prediction:create', 'Create predictions',               1, NOW(), false),
  ('prediction:read',   'Read predictions',                 1, NOW(), false),
  ('prediction:update', 'Update predictions',               1, NOW(), false),
  ('prediction:delete', 'Delete predictions',               1, NOW(), false),
  ('prediction:restore','Restore predictions',              1, NOW(), false),
  -- ROLE
  ('role:create',       'Create roles',                     1, NOW(), false),
  ('role:read',         'Read roles',                       1, NOW(), false),
  ('role:update',       'Update roles',                     1, NOW(), false),
  ('role:delete',       'Delete roles',                     1, NOW(), false),
  ('role:restore',      'Restore roles',                    1, NOW(), false),
  -- ROLE_PERMISSION
  ('role_permission:create',  'Create role permissions',    1, NOW(), false),
  ('role_permission:read',    'Read role permissions',      1, NOW(), false),
  ('role_permission:update',  'Update role permissions',    1, NOW(), false),
  ('role_permission:delete',  'Delete role permissions',    1, NOW(), false),
  ('role_permission:restore', 'Restore role permissions',   1, NOW(), false),
  -- RULES_LEAGUE
  ('rules_league:create',  'Create league rules',           1, NOW(), false),
  ('rules_league:read',    'Read league rules',             1, NOW(), false),
  ('rules_league:update',  'Update league rules',           1, NOW(), false),
  ('rules_league:delete',  'Delete league rules',           1, NOW(), false),
  ('rules_league:restore', 'Restore league rules',          1, NOW(), false),
  -- STADIUM
  ('stadium:create',    'Create stadiums',                  1, NOW(), false),
  ('stadium:read',      'Read stadiums',                    1, NOW(), false),
  ('stadium:update',    'Update stadiums',                  1, NOW(), false),
  ('stadium:delete',    'Delete stadiums',                  1, NOW(), false),
  ('stadium:restore',   'Restore stadiums',                 1, NOW(), false),
  -- TEAM
  ('team:create',       'Create teams',                     1, NOW(), false),
  ('team:read',         'Read teams',                       1, NOW(), false),
  ('team:update',       'Update teams',                     1, NOW(), false),
  ('team:delete',       'Delete teams',                     1, NOW(), false),
  ('team:restore',      'Restore teams',                    1, NOW(), false),
  -- TRANSACTION
  ('transaction:create',  'Create transactions',            1, NOW(), false),
  ('transaction:read',    'Read transactions',              1, NOW(), false),
  ('transaction:update',  'Update transactions',            1, NOW(), false),
  ('transaction:delete',  'Delete transactions',            1, NOW(), false),
  ('transaction:restore', 'Restore transactions',           1, NOW(), false),
  -- USER
  ('user:create',       'Create users',                     1, NOW(), false),
  ('user:read',         'Read users',                       1, NOW(), false),
  ('user:update',       'Update users',                     1, NOW(), false),
  ('user:delete',       'Delete users',                     1, NOW(), false),
  ('user:restore',      'Restore users',                    1, NOW(), false),
  -- USER_LEAGUE
  ('user_league:create',  'Create user leagues',            1, NOW(), false),
  ('user_league:read',    'Read user leagues',              1, NOW(), false),
  ('user_league:update',  'Update user leagues',            1, NOW(), false),
  ('user_league:delete',  'Delete user leagues',            1, NOW(), false),
  ('user_league:restore', 'Restore user leagues',           1, NOW(), false),
  -- USER_LEAGUE_REWARD
  ('user_league_reward:create',  'Create user league rewards', 1, NOW(), false),
  ('user_league_reward:read',    'Read user league rewards',   1, NOW(), false),
  ('user_league_reward:update',  'Update user league rewards', 1, NOW(), false),
  ('user_league_reward:delete',  'Delete user league rewards', 1, NOW(), false),
  ('user_league_reward:restore', 'Restore user league rewards',1, NOW(), false),
  -- USER_ROLE
  ('user_role:create',  'Create user roles',                1, NOW(), false),
  ('user_role:read',    'Read user roles',                  1, NOW(), false),
  ('user_role:update',  'Update user roles',                1, NOW(), false),
  ('user_role:delete',  'Delete user roles',                1, NOW(), false),
  ('user_role:restore', 'Restore user roles',               1, NOW(), false),
  -- USER_SESSION
  ('user_session:create',  'Create user sessions',          1, NOW(), false),
  ('user_session:read',    'Read user sessions',            1, NOW(), false),
  ('user_session:update',  'Update user sessions',          1, NOW(), false),
  ('user_session:delete',  'Delete user sessions',          1, NOW(), false),
  ('user_session:restore', 'Restore user sessions',         1, NOW(), false),
  -- WALLET
  ('wallet:create',     'Create wallets',                   1, NOW(), false),
  ('wallet:read',       'Read wallets',                     1, NOW(), false),
  ('wallet:update',     'Update wallets',                   1, NOW(), false),
  ('wallet:delete',     'Delete wallets',                   1, NOW(), false),
  ('wallet:restore',    'Restore wallets',                  1, NOW(), false),
  -- TEAM_LEAGUE
  ('team_league:create',  'Create team leagues',            1, NOW(), false),
  ('team_league:read',    'Read team leagues',              1, NOW(), false),
  ('team_league:update',  'Update team leagues',            1, NOW(), false),
  ('team_league:delete',  'Delete team leagues',            1, NOW(), false),
  ('team_league:restore', 'Restore team leagues',           1, NOW(), false),
  -- WORLD_LEAGUE
  ('world_league:create',  'Create world leagues',          1, NOW(), false),
  ('world_league:read',    'Read world leagues',            1, NOW(), false),
  ('world_league:update',  'Update world leagues',          1, NOW(), false),
  ('world_league:delete',  'Delete world leagues',          1, NOW(), false),
  ('world_league:restore', 'Restore world leagues',         1, NOW(), false)
ON CONFLICT (name) DO NOTHING;

-- ── 2. Assign ALL permissions to the admin role (role_id = 1) ────────────────

INSERT INTO "ROLE_PERMISSION" (role_id, permission_id, created_by, created_at, is_deleted)
SELECT
  1,
  p.permission_id,
  1,
  NOW(),
  false
FROM "PERMISSION" p
WHERE NOT EXISTS (
  SELECT 1 FROM "ROLE_PERMISSION" rp
  WHERE rp.role_id = 1
    AND rp.permission_id = p.permission_id
    AND rp.is_deleted = false
);

-- ── 3. Migration log ──────────────────────────────────────────────────────────

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.19',
  'seed-all-permissions',
  'Seeds all PERMISSIONS enum entries and assigns them to the admin role',
  'db/script/v3.19-seed-all-permissions.sql',
  NOW(),
  'applied'
);
