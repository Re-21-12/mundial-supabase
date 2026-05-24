-- v3.27: League lifecycle + strict prize distribution + validated join flow + prediction scoring

ALTER TABLE "LEAGUE"
  ADD COLUMN IF NOT EXISTS buy_in_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE "PREDICTION"
  ADD COLUMN IF NOT EXISTS wager_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

-- -----------------------------------------------------------------------------
-- 1) Wallet helper to centralize credits/debits and keep balances in sync
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION credit_wallet_by_user_id(
  p_user_id INTEGER,
  p_amount NUMERIC,
  p_catalog_id INTEGER,
  p_description TEXT,
  p_now TIMESTAMP
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id INTEGER;
BEGIN
  IF COALESCE(p_amount, 0) = 0 THEN
    RETURN;
  END IF;

  SELECT wallet_id
  INTO   v_wallet_id
  FROM   "WALLET"
  WHERE  user_id = p_user_id
    AND  is_deleted = false
  LIMIT  1;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'No se encontro WALLET para user_id=%', p_user_id;
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
    p_amount,
    p_now,
    p_catalog_id,
    p_description,
    p_user_id,
    p_now,
    false
  );

  UPDATE "WALLET"
  SET    balance = balance + p_amount,
         updated_at = p_now,
         updated_by = p_user_id
  WHERE  wallet_id = v_wallet_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2) Global prizes funded by the 1% (included inside platform 5%)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION distribute_global_prizes(
  p_global_pool NUMERIC,
  p_source_league_id INTEGER,
  p_now TIMESTAMP,
  p_catalog_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_individual_pool NUMERIC(12,2);
  v_top_league_pool NUMERIC(12,2);
  v_tied_first_count INTEGER;
  v_tied_second_count INTEGER;
  v_tied_third_count INTEGER;
  v_rec RECORD;
  v_participants_count INTEGER;
BEGIN
  IF COALESCE(p_global_pool, 0) <= 0 THEN
    RETURN;
  END IF;

  v_individual_pool := ROUND(p_global_pool * 0.50, 2);
  v_top_league_pool := ROUND(p_global_pool - v_individual_pool, 2);

  CREATE TEMP TABLE tmp_global_individuals ON COMMIT DROP AS
  SELECT
    ul.user_league_id,
    ul.user_id,
    ul.accumulated_points,
    DENSE_RANK() OVER (
      ORDER BY COALESCE(ul.accumulated_points, 0) DESC
    ) AS rank_pos,
    0::NUMERIC(12,2) AS reward_amount
  FROM "USER_LEAGUE" ul
  JOIN "LEAGUE" l
    ON l.league_id = ul.league_id
   AND l.is_deleted = false
   AND l.status = 'finished'
   AND COALESCE(l.buy_in_amount, 0) > 0
  WHERE ul.is_deleted = false;

  IF EXISTS (SELECT 1 FROM tmp_global_individuals) AND v_individual_pool > 0 THEN
    SELECT COUNT(*) INTO v_tied_first_count
    FROM tmp_global_individuals
    WHERE rank_pos = 1;

    IF v_tied_first_count > 1 THEN
      UPDATE tmp_global_individuals
      SET reward_amount = ROUND((v_individual_pool * 0.85) / v_tied_first_count, 2)
      WHERE rank_pos = 1;
    ELSE
      UPDATE tmp_global_individuals
      SET reward_amount = ROUND(v_individual_pool * 0.50, 2)
      WHERE rank_pos = 1;

      SELECT COUNT(*) INTO v_tied_second_count
      FROM tmp_global_individuals
      WHERE rank_pos = 2;

      IF v_tied_second_count > 1 THEN
        UPDATE tmp_global_individuals
        SET reward_amount = reward_amount + ROUND((v_individual_pool * 0.35) / v_tied_second_count, 2)
        WHERE rank_pos = 2;
      ELSE
        UPDATE tmp_global_individuals
        SET reward_amount = reward_amount + ROUND(v_individual_pool * 0.25, 2)
        WHERE rank_pos = 2;

        SELECT COUNT(*) INTO v_tied_third_count
        FROM tmp_global_individuals
        WHERE rank_pos = 3;

        IF v_tied_third_count > 1 THEN
          UPDATE tmp_global_individuals
          SET reward_amount = reward_amount + ROUND((v_individual_pool * 0.10) / v_tied_third_count, 2)
          WHERE rank_pos = 3;
        ELSE
          UPDATE tmp_global_individuals
          SET reward_amount = reward_amount + ROUND(v_individual_pool * 0.10, 2)
          WHERE rank_pos = 3;
        END IF;
      END IF;
    END IF;

    FOR v_rec IN
      SELECT user_id, reward_amount
      FROM tmp_global_individuals
      WHERE reward_amount > 0
    LOOP
      PERFORM credit_wallet_by_user_id(
        v_rec.user_id,
        v_rec.reward_amount,
        p_catalog_id,
        'Premio global individual (liga origen ' || p_source_league_id || ')',
        p_now
      );
    END LOOP;
  END IF;

  IF v_top_league_pool <= 0 THEN
    RETURN;
  END IF;

  CREATE TEMP TABLE tmp_top_league ON COMMIT DROP AS
  SELECT
    ul.league_id,
    AVG(COALESCE(ul.accumulated_points, 0))::NUMERIC(12,4) AS avg_points
  FROM "USER_LEAGUE" ul
  JOIN "LEAGUE" l
    ON l.league_id = ul.league_id
   AND l.is_deleted = false
   AND l.status = 'finished'
   AND COALESCE(l.buy_in_amount, 0) > 0
  WHERE ul.is_deleted = false
  GROUP BY ul.league_id;

  IF NOT EXISTS (SELECT 1 FROM tmp_top_league) THEN
    RETURN;
  END IF;

  CREATE TEMP TABLE tmp_top_league_winners ON COMMIT DROP AS
  SELECT league_id
  FROM tmp_top_league
  WHERE avg_points = (SELECT MAX(avg_points) FROM tmp_top_league);

  SELECT COUNT(*) INTO v_participants_count
  FROM "USER_LEAGUE" ul
  JOIN tmp_top_league_winners w
    ON w.league_id = ul.league_id
  WHERE ul.is_deleted = false;

  IF v_participants_count = 0 THEN
    RETURN;
  END IF;

  FOR v_rec IN
    SELECT ul.user_id
    FROM "USER_LEAGUE" ul
    JOIN tmp_top_league_winners w
      ON w.league_id = ul.league_id
    WHERE ul.is_deleted = false
  LOOP
    PERFORM credit_wallet_by_user_id(
      v_rec.user_id,
      ROUND(v_top_league_pool / v_participants_count, 2),
      p_catalog_id,
      'Premio global liga top promedio (liga origen ' || p_source_league_id || ')',
      p_now
    );
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3) League settlement with fixed percentage rules and tie handling
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION settle_league_rewards(p_league_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_league_reward_id INTEGER;
  v_total_collected NUMERIC(12,2);
  v_platform_fee NUMERIC(12,2);
  v_global_prize NUMERIC(12,2);
  v_distributable NUMERIC(12,2);
  v_now TIMESTAMP := NOW();
  v_catalog_id INTEGER;
  v_tied_first_count INTEGER;
  v_tied_second_count INTEGER;
  v_tied_third_count INTEGER;
  v_tied_last_count INTEGER;
  v_existing_payment TIMESTAMP;
  v_row RECORD;
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
    PERFORM setval(
      pg_get_serial_sequence('"LEAGUE_REWARD"', 'league_reward_id'),
      COALESCE((SELECT MAX(league_reward_id) FROM "LEAGUE_REWARD"), 0),
      true
    );

    INSERT INTO "LEAGUE_REWARD" (
      league_id,
      mundial_id,
      total_collected_amount,
      platform_fee_5pct,
      global_prize_1pct,
      created_by,
      created_at,
      is_deleted
    )
    VALUES (
      p_league_id,
      1,
      0,
      0,
      0,
      1,
      v_now,
      false
    )
    RETURNING league_reward_id INTO v_league_reward_id;
  END IF;

  -- If cashbox was never incremented during joins/wagers, fallback to wagers sum.
  IF COALESCE(v_total_collected, 0) = 0 THEN
    SELECT COALESCE(SUM(p.wager_amount), 0)
    INTO   v_total_collected
    FROM   "PREDICTION" p
    JOIN   "MATCH" m
      ON m.match_id = p.match_id
     AND m.is_deleted = false
    WHERE  m.league_id = p_league_id
      AND  p.is_deleted = false;
  END IF;

  v_total_collected := ROUND(COALESCE(v_total_collected, 0), 2);
  v_platform_fee := ROUND(v_total_collected * 0.05, 2);
  v_global_prize := ROUND(v_total_collected * 0.01, 2);
  v_distributable := GREATEST(v_total_collected - v_platform_fee, 0);

  UPDATE "LEAGUE_REWARD"
  SET    total_collected_amount = v_total_collected,
         platform_fee_5pct = v_platform_fee,
         global_prize_1pct = v_global_prize,
         updated_at = v_now,
         updated_by = 1
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

  CREATE TEMP TABLE tmp_league_rewards ON COMMIT DROP AS
  SELECT
    ul.user_league_id,
    ul.user_id,
    COALESCE(ul.accumulated_points, 0) AS accumulated_points,
    DENSE_RANK() OVER (
      ORDER BY COALESCE(ul.accumulated_points, 0) DESC
    ) AS rank_pos,
    DENSE_RANK() OVER (
      ORDER BY COALESCE(ul.accumulated_points, 0) ASC
    ) AS rank_last,
    0::NUMERIC(12,2) AS reward_amount
  FROM "USER_LEAGUE" ul
  WHERE ul.league_id = p_league_id
    AND ul.is_deleted = false;

  IF NOT EXISTS (SELECT 1 FROM tmp_league_rewards) THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_tied_first_count
  FROM tmp_league_rewards
  WHERE rank_pos = 1;

  IF v_tied_first_count > 1 THEN
    UPDATE tmp_league_rewards
    SET reward_amount = ROUND((v_distributable * 0.85) / v_tied_first_count, 2)
    WHERE rank_pos = 1;
  ELSE
    UPDATE tmp_league_rewards
    SET reward_amount = ROUND(v_distributable * 0.50, 2)
    WHERE rank_pos = 1;

    SELECT COUNT(*) INTO v_tied_second_count
    FROM tmp_league_rewards
    WHERE rank_pos = 2;

    IF v_tied_second_count > 1 THEN
      UPDATE tmp_league_rewards
      SET reward_amount = reward_amount + ROUND((v_distributable * 0.35) / v_tied_second_count, 2)
      WHERE rank_pos = 2;
    ELSE
      UPDATE tmp_league_rewards
      SET reward_amount = reward_amount + ROUND(v_distributable * 0.25, 2)
      WHERE rank_pos = 2;

      SELECT COUNT(*) INTO v_tied_third_count
      FROM tmp_league_rewards
      WHERE rank_pos = 3;

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

    SELECT COUNT(*) INTO v_tied_last_count
    FROM tmp_league_rewards
    WHERE rank_last = 1;

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
      v_row.reward_amount,
      CASE WHEN v_row.reward_amount > 0 THEN v_now ELSE NULL END,
      CASE WHEN v_row.reward_amount > 0 THEN 'paid' ELSE 'calculated' END,
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

    IF v_row.reward_amount > 0 AND v_existing_payment IS NULL THEN
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

GRANT EXECUTE ON FUNCTION settle_league_rewards(INTEGER) TO authenticated;

-- -----------------------------------------------------------------------------
-- 4) Auto close leagues if they have no active matches
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION close_finished_leagues()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_closed_count INTEGER := 0;
BEGIN
  UPDATE "LEAGUE" l
  SET status = 'finished',
      updated_at = NOW(),
      updated_by = COALESCE(updated_by, 1)
  WHERE l.is_deleted = false
    AND l.status = 'active'
    AND NOT EXISTS (
      SELECT 1
      FROM "MATCH" m
      WHERE m.league_id = l.league_id
        AND m.is_deleted = false
        AND m.end_time > NOW()
    );

  GET DIAGNOSTICS v_closed_count = ROW_COUNT;

  RETURN v_closed_count;
END;
$$;

CREATE OR REPLACE FUNCTION trg_close_finished_leagues_from_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM close_finished_leagues();
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_close_finished_leagues_from_match ON "MATCH";
CREATE TRIGGER trigger_close_finished_leagues_from_match
  AFTER INSERT OR UPDATE OR DELETE ON "MATCH"
  FOR EACH ROW
  EXECUTE FUNCTION trg_close_finished_leagues_from_match();

-- -----------------------------------------------------------------------------
-- 5) Prediction scoring (1 point correct result, 3 exact score)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_prediction_points(
  p_pred_home INTEGER,
  p_pred_away INTEGER,
  p_real_home INTEGER,
  p_real_away INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_pred_diff INTEGER;
  v_real_diff INTEGER;
BEGIN
  IF p_pred_home = p_real_home AND p_pred_away = p_real_away THEN
    RETURN 3;
  END IF;

  v_pred_diff := p_pred_home - p_pred_away;
  v_real_diff := p_real_home - p_real_away;

  IF (v_pred_diff > 0 AND v_real_diff > 0)
     OR (v_pred_diff < 0 AND v_real_diff < 0)
     OR (v_pred_diff = 0 AND v_real_diff = 0) THEN
    RETURN 1;
  END IF;

  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION recompute_league_user_points(p_league_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE "USER_LEAGUE" ul
  SET accumulated_points = COALESCE(src.total_points, 0),
      updated_at = NOW(),
      updated_by = COALESCE(ul.updated_by, 1)
  FROM (
    SELECT
      ul2.user_league_id,
      COALESCE(
        SUM(
          CASE
            WHEN m.match_id IS NULL THEN 0
            ELSE calculate_prediction_points(
              COALESCE(p.first_team_score, 0),
              COALESCE(p.second_team_score, 0),
              COALESCE(m.first_team_total, 0),
              COALESCE(m.second_team_total, 0)
            )
          END
        ),
        0
      )::INTEGER AS total_points
    FROM "USER_LEAGUE" ul2
    LEFT JOIN "PREDICTION" p
      ON p.user_league_id = ul2.user_league_id
     AND p.is_deleted = false
    LEFT JOIN "MATCH" m
      ON m.match_id = p.match_id
     AND m.is_deleted = false
     AND m.end_time <= NOW()
    WHERE ul2.league_id = p_league_id
      AND ul2.is_deleted = false
    GROUP BY ul2.user_league_id
  ) src
  WHERE ul.user_league_id = src.user_league_id
    AND ul.is_deleted = false;
END;
$$;

CREATE OR REPLACE FUNCTION trg_recompute_points_from_prediction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_league_id INTEGER;
  v_match_id INTEGER;
BEGIN
  v_match_id := COALESCE(NEW.match_id, OLD.match_id);

  SELECT league_id
  INTO   v_league_id
  FROM   "MATCH"
  WHERE  match_id = v_match_id
    AND  is_deleted = false
  LIMIT  1;

  IF v_league_id IS NOT NULL THEN
    PERFORM recompute_league_user_points(v_league_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION trg_recompute_points_from_match_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_league_id INTEGER;
  v_match_id INTEGER;
BEGIN
  v_match_id := COALESCE(NEW.match_id, OLD.match_id);

  SELECT league_id
  INTO   v_league_id
  FROM   "MATCH"
  WHERE  match_id = v_match_id
    AND  is_deleted = false
  LIMIT  1;

  IF v_league_id IS NOT NULL THEN
    PERFORM recompute_league_user_points(v_league_id);
    PERFORM close_finished_leagues();
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_recompute_points_from_prediction ON "PREDICTION";
CREATE TRIGGER trigger_recompute_points_from_prediction
  AFTER INSERT OR UPDATE OR DELETE ON "PREDICTION"
  FOR EACH ROW
  EXECUTE FUNCTION trg_recompute_points_from_prediction();

DROP TRIGGER IF EXISTS trigger_recompute_points_from_match_period ON "MATCH_PERIOD";
CREATE TRIGGER trigger_recompute_points_from_match_period
  AFTER INSERT OR UPDATE OR DELETE ON "MATCH_PERIOD"
  FOR EACH ROW
  EXECUTE FUNCTION trg_recompute_points_from_match_period();

-- -----------------------------------------------------------------------------
-- 6) Join league with registration + wallet validation + optional entry fee
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION join_league_with_entry_fee(
  p_invitation_code TEXT,
  p_user_id INTEGER
)
RETURNS TABLE (
  league_id INTEGER,
  error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_league_id INTEGER;
  v_league_name TEXT;
  v_league_status TEXT;
  v_wallet_id INTEGER;
  v_wallet_balance NUMERIC(12,2);
  v_entry_fee NUMERIC(10,2);
  v_catalog_cuota INTEGER;
  v_now TIMESTAMP := NOW();
  v_exists INTEGER;
  v_reward_id INTEGER;
BEGIN
  league_id := NULL;
  error := NULL;

  IF p_user_id IS NULL OR p_user_id <= 0 THEN
    error := 'Debes iniciar sesión o registrarte para ingresar a una liga.';
    RETURN NEXT;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "USER" u
    WHERE u.user_id = p_user_id
      AND u.is_deleted = false
  ) THEN
    error := 'Usuario no registrado. Debes completar tu registro para ingresar.';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT l.league_id, l.name, l.status, COALESCE(l.buy_in_amount, 0)
  INTO   v_league_id, v_league_name, v_league_status, v_entry_fee
  FROM   "LEAGUE" l
  WHERE  l.invitation_code = TRIM(p_invitation_code)
    AND  l.is_deleted = false
  LIMIT  1;

  IF v_league_id IS NULL THEN
    error := 'Código de invitación inválido o liga no encontrada.';
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_league_status <> 'active' THEN
    error := 'La liga "' || v_league_name || '" no está activa.';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT COUNT(*)
  INTO   v_exists
  FROM   "USER_LEAGUE" ul
  WHERE  ul.user_id = p_user_id
    AND  ul.league_id = v_league_id
    AND  ul.is_deleted = false;

  IF v_exists > 0 THEN
    league_id := v_league_id;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_entry_fee > 0 THEN
    SELECT wallet_id, balance
    INTO   v_wallet_id, v_wallet_balance
    FROM   "WALLET"
    WHERE  user_id = p_user_id
      AND  is_deleted = false
    LIMIT  1
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
      error := 'No se encontró tu wallet para pagar la cuota de ingreso.';
      RETURN NEXT;
      RETURN;
    END IF;

    IF COALESCE(v_wallet_balance, 0) < v_entry_fee THEN
      error := 'Saldo insuficiente para ingresar a esta liga.';
      RETURN NEXT;
      RETURN;
    END IF;

    SELECT catalog_id
    INTO   v_catalog_cuota
    FROM   "CATALOG"
    WHERE  table_name = 'transaction_type'
      AND  neumonic = 'TRX_CUOTA'
      AND  is_deleted = false
    ORDER  BY catalog_id
    LIMIT  1;

    IF v_catalog_cuota IS NULL THEN
      error := 'No se encontró el tipo de transacción TRX_CUOTA.';
      RETURN NEXT;
      RETURN;
    END IF;

    UPDATE "WALLET"
    SET    balance = balance - v_entry_fee,
           updated_at = v_now,
           updated_by = p_user_id
        WHERE  wallet_id = v_wallet_id;

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
      -v_entry_fee,
      v_now,
      v_catalog_cuota,
      'Cuota de ingreso liga: ' || v_league_name,
      p_user_id,
      v_now,
      false
    );

    SELECT league_reward_id
    INTO   v_reward_id
    FROM   "LEAGUE_REWARD"
    WHERE  league_id = v_league_id
      AND  is_deleted = false
    ORDER  BY league_reward_id DESC
    LIMIT  1
    FOR UPDATE;

    IF v_reward_id IS NULL THEN
      PERFORM setval(
        pg_get_serial_sequence('"LEAGUE_REWARD"', 'league_reward_id'),
        COALESCE((SELECT MAX(league_reward_id) FROM "LEAGUE_REWARD"), 0),
        true
      );

      INSERT INTO "LEAGUE_REWARD" (
        league_id,
        mundial_id,
        total_collected_amount,
        platform_fee_5pct,
        global_prize_1pct,
        created_by,
        created_at,
        is_deleted
      )
      VALUES (
        v_league_id,
        1,
        v_entry_fee,
        0,
        0,
        p_user_id,
        v_now,
        false
      );
    ELSE
      UPDATE "LEAGUE_REWARD"
      SET    total_collected_amount = COALESCE(total_collected_amount, 0) + v_entry_fee,
             updated_at = v_now,
             updated_by = p_user_id
      WHERE  league_reward_id = v_reward_id;
    END IF;
  END IF;

  INSERT INTO "USER_LEAGUE" (
    user_id,
    league_id,
    accumulated_points,
    approval_status,
    created_by,
    created_at,
    is_deleted
  )
  VALUES (
    p_user_id,
    v_league_id,
    0,
    'approved',
    p_user_id,
    v_now,
    false
  );

  league_id := v_league_id;
  RETURN NEXT;
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION join_league_with_entry_fee(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION close_finished_leagues() TO authenticated;
GRANT EXECUTE ON FUNCTION recompute_league_user_points(INTEGER) TO authenticated;

-- -----------------------------------------------------------------------------
-- 7) Keep settlement trigger behavior (status => finished)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 8) Migration log
-- -----------------------------------------------------------------------------
INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.27',
  'league-lifecycle-and-prize-rules',
  'Adds strict prize distribution with ties, global prize split, auto-close leagues, prediction scoring, and validated join with entry fee.',
  'db/script/v3.27-league-lifecycle-and-prize-rules.sql',
  NOW(),
  'applied'
)
ON CONFLICT (version) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    script_path = EXCLUDED.script_path,
    applied_at = EXCLUDED.applied_at,
    status = EXCLUDED.status;
