-- qa-league-flow-fixture.sql
-- Idempotent test data for:
-- - paid league join with wallet charge
-- - 15 minute prediction lock reminder
-- - automatic league close when no active matches remain
-- - prediction scoring (1 point correct result, 3 points exact score)
-- - reward payout settlement
--
-- Assumes the base schema already exists.

BEGIN;

-- -----------------------------------------------------------------------------
-- 0) Clean up previous fixture rows so the script can be re-run safely
-- -----------------------------------------------------------------------------
DELETE FROM "BROWSER_NOTIFICATION_LOG"
WHERE browser_notif_log_id IN (1);

DELETE FROM "NOTIFICATION_INBOX"
WHERE notification_id IN (1, 2);

DELETE FROM "PREDICTION"
WHERE prediction_id IN (9901, 9902);

DELETE FROM "MATCH_PERIOD"
WHERE period_id IN (1, 2);

DELETE FROM "PREDICTION_LOCK"
WHERE prediction_lock_id IN (1);

DELETE FROM "INVITATION"
WHERE invitation_id IN (1);

DELETE FROM "MAGIC_LINK"
WHERE magic_link_id IN (1);

DELETE FROM "USER_LEAGUE_REWARD"
WHERE league_user_reward_id IN (1);

DELETE FROM "USER_LEAGUE"
WHERE user_league_id IN (9601, 9602, 9603, 9604, 9605, 9606, 9607, 9608, 9609);

DELETE FROM "RULES_LEAGUE"
WHERE rules_league_id IN (9701, 9702, 9703, 9704);

DELETE FROM "LEAGUE_REWARD"
WHERE league_reward_id IN (9501, 9502);

DELETE FROM "MATCH"
WHERE match_id IN (9801, 9802, 9803);

DELETE FROM "LEAGUE"
WHERE league_id IN (9401, 9402, 9403)
  OR name IN ('Liga Apuesta Demo', 'Liga Diversion Cierre Demo', 'Liga Premio Demo');

DELETE FROM "WALLET"
WHERE wallet_id IN (9301, 9302, 9303, 9304, 9305)
  OR user_id IN (9201, 9202, 9203, 9204, 9205);

DELETE FROM "USER_ROLE"
WHERE user_id IN (9201, 9202, 9203, 9204, 9205);

DELETE FROM "USER"
WHERE user_id IN (9201, 9202, 9203, 9204, 9205)
  OR email IN (
    'admin.test@mundial.local',
    'player.one@mundial.local',
    'player.two@mundial.local',
    'player.three@mundial.local',
    'player.four@mundial.local'
  );

-- -----------------------------------------------------------------------------
-- 1) Catalog rows needed by the fixture
-- -----------------------------------------------------------------------------
INSERT INTO "CATALOG" (
  table_id, table_name, neumonic, description, value,
  created_by, created_at, is_deleted
)
VALUES
  (10, 'team_category', 'TEAM_CAT_SELECCION', 'National team', 'seleccion', 1, NOW(), false),
  (20, 'league_type', 'LEAGUE_TYPE_COPA', 'Paid league', 'copa', 1, NOW(), false),
  (20, 'league_type', 'LEAGUE_TYPE_AMISTOSO', 'Fun league', 'amistoso', 1, NOW(), false),
  (40, 'transaction_type', 'TRX_CUOTA', 'Join fee', 'cuota', 1, NOW(), false),
  (40, 'transaction_type', 'TRX_PREMIO', 'League prize', 'premio', 1, NOW(), false),
  (40, 'transaction_type', 'TRX_AJUSTE', 'Manual adjustment', 'ajuste', 1, NOW(), false),
  (50, 'country', 'COUNTRY_MX', 'Mexico', 'MX', 1, NOW(), false),
  (50, 'country', 'COUNTRY_US', 'United States', 'US', 1, NOW(), false),
  (50, 'country', 'COUNTRY_AR', 'Argentina', 'AR', 1, NOW(), false),
  (50, 'country', 'COUNTRY_FR', 'France', 'FR', 1, NOW(), false)
ON CONFLICT (neumonic) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2) Core world seed rows used by matches and leagues
-- -----------------------------------------------------------------------------
INSERT INTO "WORLD_LEAGUE" (
  world_league_id, name, created_by, created_at, is_deleted
)
VALUES
  (9200, 'World Cup 2026 Test', 1, NOW(), false)
ON CONFLICT (world_league_id) DO NOTHING;

INSERT INTO "TEAM" (
  team_id, name, catalog_id, created_by, created_at, is_deleted
)
SELECT *
FROM (
  VALUES
    (9210, 'Mexico', (SELECT catalog_id FROM "CATALOG" WHERE neumonic = 'TEAM_CAT_SELECCION' LIMIT 1), 1, NOW(), false),
    (9211, 'Argentina', (SELECT catalog_id FROM "CATALOG" WHERE neumonic = 'TEAM_CAT_SELECCION' LIMIT 1), 1, NOW(), false),
    (9212, 'Brazil', (SELECT catalog_id FROM "CATALOG" WHERE neumonic = 'TEAM_CAT_SELECCION' LIMIT 1), 1, NOW(), false),
    (9213, 'France', (SELECT catalog_id FROM "CATALOG" WHERE neumonic = 'TEAM_CAT_SELECCION' LIMIT 1), 1, NOW(), false)
) AS t(team_id, name, catalog_id, created_by, created_at, is_deleted)
  ON CONFLICT (name) DO NOTHING;

INSERT INTO "STADIUM" (
  stadium_id, name, catalog_id, logo_url, created_by, created_at, is_deleted
)
SELECT *
FROM (
  VALUES
    (9220, 'Demo Stadium MX', (SELECT catalog_id FROM "CATALOG" WHERE neumonic = 'COUNTRY_MX' LIMIT 1), NULL, 1, NOW(), false),
    (9221, 'Demo Stadium US', (SELECT catalog_id FROM "CATALOG" WHERE neumonic = 'COUNTRY_US' LIMIT 1), NULL, 1, NOW(), false),
    (9222, 'Demo Stadium FR', (SELECT catalog_id FROM "CATALOG" WHERE neumonic = 'COUNTRY_FR' LIMIT 1), NULL, 1, NOW(), false)
) AS s(stadium_id, name, catalog_id, logo_url, created_by, created_at, is_deleted)
ON CONFLICT (stadium_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3) Test users and wallets
-- -----------------------------------------------------------------------------
INSERT INTO "USER" (
  user_id, uuid, login, name, email, password_hash, registration_date,
  status, created_by, created_at, is_deleted
)
VALUES
  (9201, '00000000-0000-0000-0000-000000009201', 'admin.test', 'Admin Test', 'admin.test@mundial.local', 'HASH_ADMIN_TEST', NOW(), 'active', 1, NOW(), false),
  (9202, '00000000-0000-0000-0000-000000009202', 'player.one', 'Player One', 'player.one@mundial.local', 'HASH_PLAYER_ONE', NOW(), 'active', 1, NOW(), false),
  (9203, '00000000-0000-0000-0000-000000009203', 'player.two', 'Player Two', 'player.two@mundial.local', 'HASH_PLAYER_TWO', NOW(), 'active', 1, NOW(), false),
  (9204, '00000000-0000-0000-0000-000000009204', 'player.three', 'Player Three', 'player.three@mundial.local', 'HASH_PLAYER_THREE', NOW(), 'active', 1, NOW(), false),
  (9205, '00000000-0000-0000-0000-000000009205', 'player.four', 'Player Four', 'player.four@mundial.local', 'HASH_PLAYER_FOUR', NOW(), 'active', 1, NOW(), false)
ON CONFLICT (email) DO NOTHING;

INSERT INTO "WALLET" (
  wallet_id, user_id, balance, status, created_by, created_at, is_deleted
)
VALUES
  (9301, 9201, 100.00, 'active', 1, NOW(), false),
  (9302, 9202, 500.00, 'active', 1, NOW(), false),
  (9303, 9203, 500.00, 'active', 1, NOW(), false),
  (9304, 9204, 500.00, 'active', 1, NOW(), false),
  (9305, 9205, 500.00, 'active', 1, NOW(), false)
ON CONFLICT (wallet_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4) Leagues
-- -----------------------------------------------------------------------------
INSERT INTO "LEAGUE" (
  league_id, world_league_id, user_id, name, catalog_id, invitation_code,
  buy_in_amount, status, created_by, created_at, is_deleted
)
VALUES
  (
    9401,
    9200,
    9201,
    'Liga Apuesta Demo',
    (SELECT catalog_id FROM "CATALOG" WHERE neumonic = 'LEAGUE_TYPE_COPA' LIMIT 1),
    'TEST-APUESTA-2026',
    250.00,
    'active',
    9201,
    NOW(),
    false
  ),
  (
    9402,
    9200,
    9201,
    'Liga Diversion Cierre Demo',
    (SELECT catalog_id FROM "CATALOG" WHERE neumonic = 'LEAGUE_TYPE_AMISTOSO' LIMIT 1),
    'TEST-DIVERSION-CIERRE-2026',
    0.00,
    'active',
    9201,
    NOW(),
    false
  ),
  (
    9403,
    9200,
    9201,
    'Liga Premio Demo',
    (SELECT catalog_id FROM "CATALOG" WHERE neumonic = 'LEAGUE_TYPE_COPA' LIMIT 1),
    'TEST-PREMIO-2026',
    100.00,
    'finished',
    9201,
    NOW(),
    false
  )
ON CONFLICT (name) DO NOTHING;

INSERT INTO "LEAGUE_REWARD" (
  league_reward_id, league_id, mundial_id, total_collected_amount,
  platform_fee_5pct, global_prize_1pct, created_by, created_at, is_deleted
)
VALUES
  (9501, 9401, 9200, 0.00, 0.00, 0.00, 9201, NOW(), false),
  (9502, 9403, 9200, 1000.00, 50.00, 10.00, 9201, NOW(), false)
ON CONFLICT (league_reward_id) DO NOTHING;

-- Creator is member of every demo league.
-- League 9401 keeps player one out initially so the join flow can be tested.
INSERT INTO "USER_LEAGUE" (
  user_league_id, league_id, user_id, accumulated_points, approval_status,
  created_by, created_at, is_deleted
)
VALUES
  (9601, 9401, 9201, 0, 'approved', 9201, NOW(), false),
  (9602, 9402, 9201, 0, 'approved', 9201, NOW(), false),
  (9603, 9402, 9202, 3, 'approved', 9201, NOW(), false),
  (9604, 9402, 9203, 1, 'approved', 9201, NOW(), false),
  (9605, 9403, 9201, 18, 'approved', 9201, NOW(), false),
  (9606, 9403, 9202, 12, 'approved', 9201, NOW(), false),
  (9607, 9403, 9203, 7, 'approved', 9201, NOW(), false),
  (9608, 9403, 9204, 7, 'approved', 9201, NOW(), false),
  (9609, 9403, 9205, 1, 'approved', 9201, NOW(), false)
ON CONFLICT (user_league_id) DO NOTHING;

INSERT INTO "RULES_LEAGUE" (
  rules_league_id, league_id, description, value, dimension, created_by, created_at, is_deleted
)
VALUES
  (9701, 9401, 'Prediction lock window - fixture 9401', '15_minutes_before_match_end', 'prediction_window', 9201, NOW(), false),
  (9702, 9401, 'Scoring - fixture 9401', '1_point_correct_result_3_points_exact_score', 'scoring', 9201, NOW(), false),
  (9703, 9402, 'Prediction lock window - fixture 9402', '15_minutes_before_match_end', 'prediction_window', 9201, NOW(), false),
  (9704, 9403, 'Prize payout demo - fixture 9403', '50_25_10_10_with_global_pool', 'prize_rules', 9201, NOW(), false)
ON CONFLICT (rules_league_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5) Matches
-- -----------------------------------------------------------------------------
INSERT INTO "MATCH" (
  match_id, start_time, end_time, stadium_id, league_id,
  first_team_id, second_team_id, first_team_total, second_team_total,
  round, bracket_position, grupo_id, created_by, created_at, is_deleted
)
VALUES
  (
    9801,
    NOW() + INTERVAL '10 minutes',
    NOW() + INTERVAL '16 minutes',
    (SELECT stadium_id FROM "STADIUM" WHERE name = 'Demo Stadium MX' LIMIT 1),
    9401,
    (SELECT team_id FROM "TEAM" WHERE name = 'Mexico' LIMIT 1),
    (SELECT team_id FROM "TEAM" WHERE name = 'Argentina' LIMIT 1),
    0,
    0,
    NULL,
    1,
    NULL,
    9201,
    NOW(),
    false
  ),
  (
    9802,
    NOW() + INTERVAL '1 hour',
    NOW() + INTERVAL '2 hours',
    (SELECT stadium_id FROM "STADIUM" WHERE name = 'Demo Stadium US' LIMIT 1),
    9401,
    (SELECT team_id FROM "TEAM" WHERE name = 'Brazil' LIMIT 1),
    (SELECT team_id FROM "TEAM" WHERE name = 'France' LIMIT 1),
    0,
    0,
    NULL,
    2,
    NULL,
    9201,
    NOW(),
    false
  ),
  (
    9803,
    NOW() - INTERVAL '3 hours',
    NOW() - INTERVAL '1 hour',
    (SELECT stadium_id FROM "STADIUM" WHERE name = 'Demo Stadium FR' LIMIT 1),
    9402,
    (SELECT team_id FROM "TEAM" WHERE name = 'Mexico' LIMIT 1),
    (SELECT team_id FROM "TEAM" WHERE name = 'Brazil' LIMIT 1),
    2,
    1,
    NULL,
    1,
    NULL,
    9201,
    NOW(),
    false
  )
ON CONFLICT (match_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6) Predictions for scoring demo league
-- -----------------------------------------------------------------------------
INSERT INTO "PREDICTION" (
  prediction_id, user_league_id, match_id, turn,
  first_team_score, second_team_score, wager_amount,
  created_by, created_at, is_deleted
)
VALUES
  (9901, 9603, 9803, 1, 2, 1, 0.00, 9202, NOW(), false),
  (9902, 9604, 9803, 1, 1, 0, 0.00, 9203, NOW(), false)
ON CONFLICT (prediction_id) DO NOTHING;

COMMIT;

-- Suggested post-load checks:
-- SELECT close_finished_leagues();
-- SELECT settle_league_rewards(9403);
-- SELECT * FROM "LEAGUE" WHERE league_id IN (9401, 9402, 9403);
