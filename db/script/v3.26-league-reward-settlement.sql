-- v3.26: League reward settlement when a league is marked as finished

ALTER TABLE "USER_LEAGUE_REWARD"
  ADD COLUMN IF NOT EXISTS league_reward_id INTEGER NULL
    REFERENCES "LEAGUE_REWARD"(league_reward_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_league_reward_league_reward_id
  ON "USER_LEAGUE_REWARD" (league_reward_id)
  WHERE is_deleted = false;

CREATE OR REPLACE FUNCTION settle_league_rewards(p_league_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_league_reward_id   INTEGER;
  v_total_collected     NUMERIC(12,2);
  v_platform_fee       NUMERIC(12,2);
  v_global_prize       NUMERIC(12,2);
  v_distributable      NUMERIC(12,2);
  v_points_sum         NUMERIC(12,2);
  v_participant_count   INTEGER;
  v_catalog_id         INTEGER;
  v_now                TIMESTAMP := NOW();
  v_wallet_id          INTEGER;
  v_existing_payment   TIMESTAMP;
  v_base_share         NUMERIC(12,2);
  v_bonus              NUMERIC(12,2);
  v_amount             NUMERIC(12,2);
  v_row                RECORD;
BEGIN
  SELECT lr.league_reward_id,
         COALESCE(lr.total_collected_amount, 0)
  INTO   v_league_reward_id,
         v_total_collected
  FROM   "LEAGUE_REWARD" lr
  WHERE  lr.league_id = p_league_id
    AND  lr.is_deleted = false
  ORDER  BY lr.league_reward_id DESC
  LIMIT  1;

  IF v_league_reward_id IS NULL THEN
    RAISE EXCEPTION 'Liga % no tiene LEAGUE_REWARD configurado.', p_league_id;
  END IF;

  IF v_total_collected = 0 THEN
    SELECT COALESCE(SUM(p.wager_amount), 0)
    INTO   v_total_collected
    FROM   "PREDICTION" p
    JOIN   "MATCH" m ON m.match_id = p.match_id
    WHERE  m.league_id = p_league_id
      AND  m.is_deleted = false
      AND  p.is_deleted = false;
  END IF;

  v_platform_fee := ROUND(v_total_collected * 0.05, 2);
  v_global_prize := ROUND(v_total_collected * 0.01, 2);
  v_distributable := GREATEST(v_total_collected - v_platform_fee - v_global_prize, 0);

  UPDATE "LEAGUE_REWARD"
  SET    total_collected_amount = v_total_collected,
         platform_fee_5pct = v_platform_fee,
         global_prize_1pct = v_global_prize,
         updated_at = v_now
  WHERE  league_reward_id = v_league_reward_id;

  SELECT catalog_id
  INTO   v_catalog_id
  FROM   "CATALOG"
  WHERE  table_name = 'transaction_type'
    AND  neumonic = 'TRX_PREMIO'
    AND  is_deleted = false
  ORDER  BY catalog_id
  LIMIT  1;

  IF v_catalog_id IS NULL THEN
    RAISE EXCEPTION 'No se encontro CATALOG.TRX_PREMIO para registrar premios.';
  END IF;

  SELECT COUNT(*), COALESCE(SUM(accumulated_points), 0)
  INTO   v_participant_count, v_points_sum
  FROM   "USER_LEAGUE"
  WHERE  league_id = p_league_id
    AND  is_deleted = false;

  IF v_participant_count = 0 THEN
    RETURN;
  END IF;

  FOR v_row IN
    SELECT ul.user_league_id,
           ul.user_id,
           COALESCE(ul.accumulated_points, 0) AS accumulated_points,
           ROW_NUMBER() OVER (
             ORDER BY COALESCE(ul.accumulated_points, 0) DESC, ul.user_league_id ASC
           ) AS rn
    FROM   "USER_LEAGUE" ul
    WHERE  ul.league_id = p_league_id
      AND  ul.is_deleted = false
    ORDER  BY COALESCE(ul.accumulated_points, 0) DESC, ul.user_league_id ASC
  LOOP
    v_bonus := CASE WHEN v_row.rn = 1 THEN v_global_prize ELSE 0 END;

    IF v_points_sum > 0 THEN
      v_base_share := v_distributable * (v_row.accumulated_points / v_points_sum);
    ELSE
      v_base_share := v_distributable / v_participant_count;
    END IF;

    v_amount := ROUND(v_base_share + v_bonus, 2);

    v_existing_payment := NULL;
    SELECT payment_date
    INTO   v_existing_payment
    FROM   "USER_LEAGUE_REWARD"
    WHERE  user_league_id = v_row.user_league_id
      AND  is_deleted = false
    LIMIT  1;

    INSERT INTO "USER_LEAGUE_REWARD" (
      league_reward_id,
      user_league_id,
      amount,
      payment_date,
      status,
      created_by,
      created_at,
      is_deleted
    )
    VALUES (
      v_league_reward_id,
      v_row.user_league_id,
      v_amount,
      CASE WHEN v_amount > 0 THEN v_now ELSE NULL END,
      CASE WHEN v_amount > 0 THEN 'paid' ELSE 'calculated' END,
      1,
      v_now,
      false
    )
    ON CONFLICT (user_league_id) DO UPDATE
      SET league_reward_id = EXCLUDED.league_reward_id,
          amount = EXCLUDED.amount,
          payment_date = CASE
            WHEN "USER_LEAGUE_REWARD".payment_date IS NULL AND EXCLUDED.amount > 0 THEN EXCLUDED.payment_date
            ELSE "USER_LEAGUE_REWARD".payment_date
          END,
          status = CASE
            WHEN "USER_LEAGUE_REWARD".payment_date IS NULL AND EXCLUDED.amount > 0 THEN 'paid'
            ELSE COALESCE("USER_LEAGUE_REWARD".status, EXCLUDED.status)
          END,
          updated_at = v_now,
          updated_by = 1;

    IF v_amount > 0 AND v_existing_payment IS NULL THEN
          v_wallet_id := NULL;
      SELECT wallet_id
      INTO   v_wallet_id
      FROM   "WALLET"
      WHERE  user_id = v_row.user_id
        AND  is_deleted = false
      LIMIT  1;

      IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'No se encontro WALLET para user_id=% al pagar la liga %.', v_row.user_id, p_league_id;
      END IF;

      INSERT INTO "TRANSACTION" (
        wallet_id,
        amount,
        transaction_date,
        catalog_id,
        description,
        created_by,
        created_at,
        is_deleted
      )
      VALUES (
        v_wallet_id,
        v_amount,
        v_now,
        v_catalog_id,
        'Premio Liga: ' || p_league_id,
        1,
        v_now,
        false
      );

      UPDATE "WALLET"
      SET    balance = balance + v_amount,
             updated_at = v_now,
             updated_by = 1
      WHERE  wallet_id = v_wallet_id;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION settle_league_rewards(INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION trigger_settle_league_rewards()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'finished' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM settle_league_rewards(NEW.league_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_settle_league_rewards ON "LEAGUE";
CREATE TRIGGER trigger_settle_league_rewards
  AFTER UPDATE OF status ON "LEAGUE"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_settle_league_rewards();

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.26',
  'league-reward-settlement',
  'Adds league reward settlement when a league is marked finished; stores payouts in USER_LEAGUE_REWARD and credits wallets',
  'db/script/v3.26-league-reward-settlement.sql',
  NOW(),
  'applied'
);
