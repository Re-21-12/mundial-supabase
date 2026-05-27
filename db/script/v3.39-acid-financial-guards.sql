-- v3.39: ACID guards for financial and points tables
--
-- Fixes:
--   A) CHECK constraints enforce non-negative balances/amounts at the DB layer,
--      independent of application logic.
--   B) settle_league_rewards() re-queries payment_date AFTER the UPSERT so
--      the idempotency guard uses committed state, not a pre-UPSERT snapshot.
--      An advisory lock serialises concurrent calls for the same league.
--   C) accumulated_points constrained >= 0.

-- ─── A. CHECK constraints ──────────────────────────────────────────────────────

ALTER TABLE "WALLET"
  ADD CONSTRAINT ck_wallet_balance_nonneg
    CHECK (balance >= 0);

ALTER TABLE "LEAGUE"
  ADD CONSTRAINT ck_league_buy_in_nonneg
    CHECK (buy_in_amount >= 0);

ALTER TABLE "LEAGUE_REWARD"
  ADD CONSTRAINT ck_league_reward_collected_nonneg
    CHECK (total_collected_amount >= 0);

ALTER TABLE "USER_LEAGUE_REWARD"
  ADD CONSTRAINT ck_user_league_reward_amount_nonneg
    CHECK (amount >= 0);

ALTER TABLE "USER_LEAGUE"
  ADD CONSTRAINT ck_user_league_points_nonneg
    CHECK (accumulated_points >= 0);

ALTER TABLE "PREDICTION"
  ADD CONSTRAINT ck_prediction_wager_nonneg
    CHECK (wager_amount >= 0);

-- TRANSACTION.amount is intentionally signed: negative = debit, positive = credit.
-- Enforce that zero-amount records are not created.
ALTER TABLE "TRANSACTION"
  ADD CONSTRAINT ck_transaction_amount_nonzero
    CHECK (amount <> 0);

-- ─── B. Fix settle_league_rewards() double-credit race ────────────────────────
--
-- Root cause: v_existing_payment was read BEFORE the UPSERT. Two concurrent
-- calls could both see NULL and both proceed to credit the wallet.
--
-- Fix 1: pg_advisory_xact_lock serialises concurrent calls for the same league.
--        The lock is released automatically when the transaction ends.
-- Fix 2: Re-query payment_date AFTER the UPSERT so the guard reads committed
--        state from the row that was just inserted/updated.

CREATE OR REPLACE FUNCTION settle_league_rewards(p_league_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_league_reward_id    INTEGER;
  v_total_collected     NUMERIC(12,2);
  v_platform_fee        NUMERIC(12,2);
  v_global_prize        NUMERIC(12,2);
  v_distributable       NUMERIC(12,2);
  v_now                 TIMESTAMP := NOW();
  v_catalog_id          INTEGER;
  v_tied_first_count    INTEGER;
  v_tied_second_count   INTEGER;
  v_tied_third_count    INTEGER;
  v_tied_last_count     INTEGER;
  v_committed_payment   TIMESTAMP;   -- read AFTER upsert, not before
  v_row                 RECORD;
BEGIN
  -- Serialise concurrent settle calls for the same league to prevent
  -- duplicate wallet credits. Lock is released on transaction end.
  PERFORM pg_advisory_xact_lock(hashtext('settle_league:' || p_league_id::TEXT));

  SELECT lr.league_reward_id,
         COALESCE(lr.total_collected_amount, 0)
  INTO   v_league_reward_id,
         v_total_collected
  FROM   "LEAGUE_REWARD" lr
  WHERE  lr.league_id  = p_league_id
    AND  lr.is_deleted = false
  ORDER  BY lr.league_reward_id DESC
  LIMIT  1;

  IF v_league_reward_id IS NULL THEN
    PERFORM setval(
      pg_get_serial_sequence('"LEAGUE_REWARD"', 'league_reward_id'),
      COALESCE((SELECT MAX(league_reward_id) FROM "LEAGUE_REWARD"), 0),
      true
    );

    INSERT INTO "LEAGUE_REWARD" (
      league_id, mundial_id, total_collected_amount,
      platform_fee_5pct, global_prize_1pct,
      created_by, created_at, is_deleted
    )
    VALUES (p_league_id, 1, 0, 0, 0, 1, v_now, false)
    RETURNING league_reward_id INTO v_league_reward_id;
  END IF;

  IF COALESCE(v_total_collected, 0) = 0 THEN
    SELECT COALESCE(SUM(p.wager_amount), 0)
    INTO   v_total_collected
    FROM   "PREDICTION" p
    JOIN   "MATCH" m ON m.match_id = p.match_id AND m.is_deleted = false
    WHERE  m.league_id  = p_league_id
      AND  p.is_deleted = false;
  END IF;

  v_total_collected := ROUND(COALESCE(v_total_collected, 0), 2);
  v_platform_fee    := ROUND(v_total_collected * 0.05, 2);
  v_global_prize    := ROUND(v_total_collected * 0.01, 2);
  v_distributable   := GREATEST(v_total_collected - v_platform_fee, 0);

  UPDATE "LEAGUE_REWARD"
  SET    total_collected_amount = v_total_collected,
         platform_fee_5pct      = v_platform_fee,
         global_prize_1pct      = v_global_prize,
         updated_at             = v_now,
         updated_by             = 1
  WHERE  league_reward_id = v_league_reward_id;

  SELECT catalog_id
  INTO   v_catalog_id
  FROM   "CATALOG"
  WHERE  table_name = 'transaction_type'
    AND  neumonic   = 'TRX_PREMIO'
    AND  is_deleted = false
  ORDER  BY catalog_id
  LIMIT  1;

  IF v_catalog_id IS NULL THEN
    RAISE EXCEPTION 'No se encontro CATALOG.TRX_PREMIO para registrar premios.';
  END IF;

  CREATE TEMP TABLE tmp_league_rewards ON COMMIT DROP AS
  SELECT
    ul.user_league_id,
    ul.user_id,
    COALESCE(ul.accumulated_points, 0) AS accumulated_points,
    DENSE_RANK() OVER (ORDER BY COALESCE(ul.accumulated_points, 0) DESC) AS rank_pos,
    DENSE_RANK() OVER (ORDER BY COALESCE(ul.accumulated_points, 0) ASC)  AS rank_last,
    0::NUMERIC(12,2) AS reward_amount
  FROM "USER_LEAGUE" ul
  WHERE ul.league_id  = p_league_id
    AND ul.is_deleted = false;

  IF NOT EXISTS (SELECT 1 FROM tmp_league_rewards) THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_tied_first_count  FROM tmp_league_rewards WHERE rank_pos  = 1;
  SELECT COUNT(*) INTO v_tied_last_count   FROM tmp_league_rewards WHERE rank_last = 1;

  IF v_tied_first_count > 1 THEN
    UPDATE tmp_league_rewards
    SET reward_amount = ROUND((v_distributable * 0.85) / v_tied_first_count, 2)
    WHERE rank_pos = 1;
  ELSE
    UPDATE tmp_league_rewards
    SET reward_amount = ROUND(v_distributable * 0.50, 2)
    WHERE rank_pos = 1;

    SELECT COUNT(*) INTO v_tied_second_count FROM tmp_league_rewards WHERE rank_pos = 2;

    IF v_tied_second_count > 1 THEN
      UPDATE tmp_league_rewards
      SET reward_amount = reward_amount + ROUND((v_distributable * 0.35) / v_tied_second_count, 2)
      WHERE rank_pos = 2;
    ELSE
      UPDATE tmp_league_rewards
      SET reward_amount = reward_amount + ROUND(v_distributable * 0.25, 2)
      WHERE rank_pos = 2;

      SELECT COUNT(*) INTO v_tied_third_count FROM tmp_league_rewards WHERE rank_pos = 3;

      IF v_tied_third_count > 1 THEN
        UPDATE tmp_league_rewards
        SET reward_amount = reward_amount + ROUND((v_distributable * 0.10) / v_tied_third_count, 2)
        WHERE rank_pos = 3;
      ELSE
        UPDATE tmp_league_rewards
        SET reward_amount = reward_amount + ROUND(v_distributable * 0.10, 2)
        WHERE rank_pos = 3;
      END IF;
    END IF;

    IF v_tied_last_count > 1 THEN
      UPDATE tmp_league_rewards
      SET reward_amount = reward_amount + ROUND((v_distributable * 0.10) / v_tied_last_count, 2)
      WHERE rank_last = 1;
    ELSE
      UPDATE tmp_league_rewards
      SET reward_amount = reward_amount + ROUND(v_distributable * 0.10, 2)
      WHERE rank_last = 1;
    END IF;
  END IF;

  FOR v_row IN
    SELECT user_league_id, user_id, reward_amount
    FROM tmp_league_rewards
  LOOP
    -- Upsert first, then read committed payment_date to decide on wallet credit.
    -- This prevents two concurrent calls from both seeing payment_date IS NULL
    -- before either has written it.
    INSERT INTO "USER_LEAGUE_REWARD" (
      league_reward_id, user_league_id, amount, payment_date,
      status, created_by, created_at, is_deleted
    )
    VALUES (
      v_league_reward_id,
      v_row.user_league_id,
      v_row.reward_amount,
      CASE WHEN v_row.reward_amount > 0 THEN v_now ELSE NULL END,
      CASE WHEN v_row.reward_amount > 0 THEN 'paid' ELSE 'calculated' END,
      1, v_now, false
    )
    ON CONFLICT (user_league_id) DO UPDATE
      SET league_reward_id = EXCLUDED.league_reward_id,
          amount           = EXCLUDED.amount,
          payment_date     = CASE
            WHEN "USER_LEAGUE_REWARD".payment_date IS NULL AND EXCLUDED.amount > 0
              THEN EXCLUDED.payment_date
            ELSE "USER_LEAGUE_REWARD".payment_date
          END,
          status           = CASE
            WHEN "USER_LEAGUE_REWARD".payment_date IS NULL AND EXCLUDED.amount > 0
              THEN 'paid'
            ELSE COALESCE("USER_LEAGUE_REWARD".status, EXCLUDED.status)
          END,
          updated_at       = v_now,
          updated_by       = 1;

    -- Re-read committed payment_date AFTER upsert.
    -- Only credit wallet if this call was the one that first set payment_date
    -- (i.e., payment_date now equals v_now, meaning we just set it).
    SELECT payment_date
    INTO   v_committed_payment
    FROM   "USER_LEAGUE_REWARD"
    WHERE  user_league_id = v_row.user_league_id
      AND  is_deleted     = false
    LIMIT  1;

    IF v_row.reward_amount > 0
       AND v_committed_payment IS NOT NULL
       AND v_committed_payment = v_now THEN
      PERFORM credit_wallet_by_user_id(
        v_row.user_id,
        v_row.reward_amount,
        v_catalog_id,
        'Premio Liga: ' || p_league_id,
        v_now
      );
    END IF;
  END LOOP;

  PERFORM distribute_global_prizes(v_global_prize, p_league_id, v_now, v_catalog_id);
END;
$$;

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.39',
  'acid-financial-guards',
  'Adds CHECK constraints (balance>=0, amounts>=0, points>=0, amount!=0 for TRANSACTION). Fixes settle_league_rewards() double-credit race: advisory lock serialises concurrent calls; wallet credit now uses post-UPSERT payment_date instead of pre-UPSERT snapshot.',
  'db/script/v3.39-acid-financial-guards.sql',
  NOW(),
  'applied'
)
ON CONFLICT (version) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      applied_at  = EXCLUDED.applied_at,
      status      = EXCLUDED.status;
