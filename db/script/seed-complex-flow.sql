-- ===================================================================
-- Seed: Complex league flow for Postgres/Supabase
-- Includes auth, permissions, league setup, invites, matches, predictions,
-- notifications, prediction lock, and error registry samples.
-- ===================================================================

BEGIN;

-- -------------------------------------------------------------------
-- 1. Core access model
-- -------------------------------------------------------------------
INSERT INTO "ROLE" ("role_id", "name", "description", "created_by", "created_at", "is_deleted")
VALUES
  (1, 'admin', 'Full access for administrators', 1, CURRENT_TIMESTAMP, false),
  (2, 'support', 'Read-only support access', 1, CURRENT_TIMESTAMP, false),
  (3, 'player', 'Standard league participant', 1, CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

INSERT INTO "USER" (
  "user_id", "uuid", "login", "name", "email", "password_hash", "registration_date",
  "status", "created_by", "created_at", "is_deleted"
)
VALUES
  (1, '00000000-0000-0000-0000-000000000001', 'admin', 'Admin User', 'admin@mundial.test', 'SEED_HASH_ADMIN', CURRENT_TIMESTAMP, 'active', 1, CURRENT_TIMESTAMP, false),
  (2, '00000000-0000-0000-0000-000000000002', 'player1', 'Player One', 'player1@mundial.test', 'SEED_HASH_PLAYER', CURRENT_TIMESTAMP, 'active', 1, CURRENT_TIMESTAMP, false),
  (3, '00000000-0000-0000-0000-000000000003', 'support', 'Support Agent', 'support@mundial.test', 'SEED_HASH_SUPPORT', CURRENT_TIMESTAMP, 'active', 1, CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

INSERT INTO "PERMISSION" ("permission_id", "name", "description", "created_by", "created_at", "is_deleted")
VALUES
  (1, 'audit_log:read', 'Read audit logs', 1, CURRENT_TIMESTAMP, false),
  (2, 'audit_log:create', 'Create audit logs', 1, CURRENT_TIMESTAMP, false),
  (3, 'audit_log:update', 'Update audit logs', 1, CURRENT_TIMESTAMP, false),
  (4, 'audit_log:delete', 'Delete audit logs', 1, CURRENT_TIMESTAMP, false),
  (5, 'league:read', 'Read leagues', 1, CURRENT_TIMESTAMP, false),
  (6, 'match:read', 'Read matches', 1, CURRENT_TIMESTAMP, false),
  (7, 'invitation:read', 'Read invitations', 1, CURRENT_TIMESTAMP, false),
  (8, 'prediction:read', 'Read predictions', 1, CURRENT_TIMESTAMP, false),
  (9, 'user:read', 'Read users', 1, CURRENT_TIMESTAMP, false),
  (10, 'team:read', 'Read teams', 1, CURRENT_TIMESTAMP, false),
  (11, 'stadium:read', 'Read stadiums', 1, CURRENT_TIMESTAMP, false),
  (12, 'world_league:read', 'Read world leagues', 1, CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

INSERT INTO "ROLE_PERMISSION" ("role_permission_id", "role_id", "permission_id", "created_by", "created_at", "is_deleted")
VALUES
  (1, 1, 1, 1, CURRENT_TIMESTAMP, false),
  (2, 1, 2, 1, CURRENT_TIMESTAMP, false),
  (3, 1, 3, 1, CURRENT_TIMESTAMP, false),
  (4, 1, 4, 1, CURRENT_TIMESTAMP, false),
  (5, 1, 5, 1, CURRENT_TIMESTAMP, false),
  (6, 1, 6, 1, CURRENT_TIMESTAMP, false),
  (7, 1, 7, 1, CURRENT_TIMESTAMP, false),
  (8, 1, 8, 1, CURRENT_TIMESTAMP, false),
  (9, 1, 9, 1, CURRENT_TIMESTAMP, false),
  (10, 1, 10, 1, CURRENT_TIMESTAMP, false),
  (11, 1, 11, 1, CURRENT_TIMESTAMP, false),
  (12, 1, 12, 1, CURRENT_TIMESTAMP, false),
  (13, 2, 1, 1, CURRENT_TIMESTAMP, false),
  (14, 2, 5, 1, CURRENT_TIMESTAMP, false),
  (15, 2, 6, 1, CURRENT_TIMESTAMP, false),
  (16, 2, 11, 1, CURRENT_TIMESTAMP, false),
  (17, 3, 5, 1, CURRENT_TIMESTAMP, false),
  (18, 3, 6, 1, CURRENT_TIMESTAMP, false),
  (19, 3, 7, 1, CURRENT_TIMESTAMP, false),
  (20, 3, 8, 1, CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

INSERT INTO "USER_ROLE" ("user_role_id", "user_id", "role_id", "created_by", "created_at", "is_deleted")
VALUES
  (1, 1, 1, 1, CURRENT_TIMESTAMP, false),
  (2, 2, 3, 1, CURRENT_TIMESTAMP, false),
  (3, 3, 2, 1, CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------
-- 2. Catalog-driven entities
-- -------------------------------------------------------------------
INSERT INTO "WORLD_LEAGUE" (
  "world_league_id", "name", "created_by", "created_at", "is_deleted"
)
VALUES
  (1, 'World Cup 2026', 1, CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

INSERT INTO "CATALOG" (
  "catalog_id", "table_id", "table_name", "neumonic", "description", "value",
  "created_by", "created_at", "is_deleted"
)
VALUES
  (1, 1, 'LEAGUE', 'LEAGUE_DEFAULT', 'Default catalog record for league creation', 'default', 1, CURRENT_TIMESTAMP, false),
  (2, 2, 'TEAM', 'TEAM_DEFAULT', 'Default catalog record for teams', 'default', 1, CURRENT_TIMESTAMP, false),
  (3, 3, 'STADIUM', 'STADIUM_DEFAULT', 'Default catalog record for stadiums', 'default', 1, CURRENT_TIMESTAMP, false),
  (4, 4, 'MATCH_PERIOD', 'MATCH_PERIOD_DEFAULT', 'Default catalog record for match periods', 'default', 1, CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

INSERT INTO "TEAM" (
  "team_id", "name", "catalog_id", "created_by", "created_at", "is_deleted"
)
VALUES
  (1, 'Mexico', 2, 1, CURRENT_TIMESTAMP, false),
  (2, 'Argentina', 2, 1, CURRENT_TIMESTAMP, false),
  (3, 'Brazil', 2, 1, CURRENT_TIMESTAMP, false),
  (4, 'France', 2, 1, CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

INSERT INTO "STADIUM" (
  "stadium_id", "catalog_id", "created_by", "created_at", "is_deleted"
)
VALUES
  (1, 3, 1, CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

INSERT INTO "LEAGUE" (
  "league_id", "world_league_id", "user_id", "name", "catalog_id", "invitation_code",
  "status", "created_by", "created_at", "is_deleted"
)
VALUES
  (1, 1, 1, 'Mundial Demo League', 1, 'MUNDIAL-DEMO-2026', 'active', 1, CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

INSERT INTO "RULES_LEAGUE" (
  "rules_league_id", "league_id", "description", "value", "dimension", "created_by", "created_at", "is_deleted"
)
VALUES
  (1, 1, 'Prediction lock window', '15', 'minutes', 1, CURRENT_TIMESTAMP, false),
  (2, 1, 'Allowed invitation type', 'magic_link', 'workflow', 1, CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

INSERT INTO "LEAGUE_REWARD" (
  "league_reward_id", "league_id", "mundial_id", "total_collected_amount",
  "platform_fee_5pct", "global_prize_1pct", "created_by", "created_at", "is_deleted"
)
VALUES
  (1, 1, 2026, 1000, 50, 10, 1, CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

INSERT INTO "USER_LEAGUE" (
  "user_league_id", "league_id", "user_id", "created_by", "created_at", "is_deleted", "accumulated_points"
)
VALUES
  (1, 1, 1, 1, CURRENT_TIMESTAMP, false, 0),
  (2, 1, 2, 1, CURRENT_TIMESTAMP, false, 15)
ON CONFLICT DO NOTHING;

INSERT INTO "INVITATION" (
  "invitation_id", "user_league_id", "token", "status", "send_date", "expiration_date",
  "created_by", "created_at", "is_deleted"
)
VALUES
  (1, 2, 'invite-demo-player-1', 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days', 1, CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

INSERT INTO "MAGIC_LINK" (
  "magic_link_id", "token", "email", "league_id", "created_by", "created_at",
  "expires_at", "status", "is_deleted"
)
VALUES
  (1, 'magic-link-demo-player-1', 'anonymous1@mundial.test', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '48 hours', 'pending', false)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------
-- 3. Match / prediction flow
-- -------------------------------------------------------------------
INSERT INTO "MATCH" (
  "match_id", "start_time", "stadium_id", "league_id", "first_team_id", "second_team_id",
  "first_team_total", "second_team_total", "created_by", "created_at", "is_deleted"
)
VALUES
  (1, CURRENT_TIMESTAMP + INTERVAL '10 minutes', 1, 1, 1, 2, 0, 0, 1, CURRENT_TIMESTAMP, false),
  (2, CURRENT_TIMESTAMP + INTERVAL '1 day', 1, 1, 3, 4, 0, 0, 1, CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

INSERT INTO "MATCH_PERIOD" (
  "period_id", "match_id", "catalog_id", "first_team_score", "second_team_score",
  "created_by", "created_at", "is_deleted"
)
VALUES
  (1, 1, 4, 0, 0, 1, CURRENT_TIMESTAMP, false),
  (2, 2, 4, 0, 0, 1, CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

INSERT INTO "PREDICTION" (
  "prediction_id", "user_league_id", "match_id", "turn", "first_team_score", "second_team_score",
  "created_by", "created_at", "is_deleted"
)
VALUES
  (1, 2, 2, 1, 2, 1, 2, CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

INSERT INTO "PREDICTION_LOCK" (
  "prediction_lock_id", "match_id", "locked_at", "lock_reason", "locked_by", "created_by",
  "created_at", "is_deleted"
)
VALUES
  (1, 1, CURRENT_TIMESTAMP, 'auto_15min', 1, 1, CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------
-- 4. In-app and browser notifications
-- -------------------------------------------------------------------
INSERT INTO "NOTIFICATION_INBOX" (
  "notification_id", "user_id", "league_id", "match_id", "notification_type", "title", "body",
  "action_url", "payload", "priority", "created_by", "created_at", "is_deleted"
)
VALUES
  (1, 2, 1, 1, 'match_reminder', 'Tu partido empieza en 15 minutos', 'Bloquea tus predicciones antes del cierre.', '/match/1', '{"matchId":1,"minutesLeft":15}'::jsonb, 'high', 1, CURRENT_TIMESTAMP, false),
  (2, 2, 1, NULL, 'invitation_received', 'Te invitaron a una liga', 'Acepta el enlace mágico para unirte como invitado.', '/invitation', '{"leagueId":1,"mode":"magic-link"}'::jsonb, 'normal', 1, CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

INSERT INTO "BROWSER_NOTIFICATION_LOG" (
  "browser_notif_log_id", "notification_id", "user_id", "browser_title", "browser_body",
  "browser_icon", "browser_badge", "browser_tag", "sent_at", "success", "created_by",
  "created_at", "is_deleted"
)
VALUES
  (1, 1, 2, 'Tu partido empieza en 15 minutos', 'Bloquea tus predicciones antes del cierre.', NULL, NULL, 'match-reminder', CURRENT_TIMESTAMP, true, 1, CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------
-- 5. Error registry samples
-- -------------------------------------------------------------------
INSERT INTO "ERROR_CATALOG" (
  "error_number", "integration", "description", "severity", "resolution", "created_by", "created_at", "is_deleted"
)
VALUES
  (9001, 'global-error-handler', 'Unhandled application error', 'critical', 'Persistir el stack, revisar la ruta y reproducir en consola.', 1, CURRENT_TIMESTAMP, false),
  (1001, 'core/services/supabase-auth-service.ts', 'Auth initialization never resolved', 'high', 'Arrancar stateAuthChanges en el servicio y aplicar timeout de espera.', 1, CURRENT_TIMESTAMP, false),
  (1002, 'shared/layouts/layout.html', 'Sidebar list contains invalid text nodes', 'medium', 'Mantener solo li directos dentro del ul y agregar accesibilidad al botón de salida.', 1, CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

INSERT INTO "ERROR_LOG" (
  "error_log_id", "error_number", "title", "description", "stack_trace", "source_file", "source_line",
  "route", "browser_user_agent", "context", "severity", "created_by", "created_at", "is_deleted"
)
VALUES
  (1, 9001, 'Unhandled navigation error', 'Auth guard left the app waiting for auth readiness.', 'Error: Guard timed out\n    at authGuard', 'src/app/shared/features/auth/guard/auth-guard.ts', 1, '/home', 'SeedAgent/1.0', '{"guard":"authGuard","status":"timed_out"}'::jsonb, 'critical', 1, CURRENT_TIMESTAMP, false)
ON CONFLICT DO NOTHING;

COMMIT;
