-- v3.35: Fix join_league_with_entry_fee duplicate-key error
--
-- Root cause: the function checked is_deleted = false to detect existing
-- membership, but always did a plain INSERT. If a USER_LEAGUE row existed
-- (soft-deleted or rejected), the INSERT hit uq_user_league (23505).
--
-- Fix: check for ANY existing row (active, deleted, or rejected) and
--   · Active + approved  → return success (idempotent, no charge).
--   · Soft-deleted or rejected → re-activate with UPDATE (charge again
--     only if there is no existing approved row, i.e. they truly left).
--   · No row → fresh INSERT as before.
--
-- Also stops partial execution: the entry fee was being charged BEFORE the
-- INSERT, so a failed INSERT left the user charged without being added.
-- The new order: validate everything, then charge, then upsert atomically.

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
  v_league_id       INTEGER;
  v_league_name     TEXT;
  v_league_status   TEXT;
  v_wallet_id       INTEGER;
  v_wallet_balance  NUMERIC(12,2);
  v_entry_fee       NUMERIC(10,2);
  v_catalog_cuota   INTEGER;
  v_now             TIMESTAMP := NOW();
  v_existing_id     INTEGER;
  v_existing_del    BOOLEAN;
  v_existing_status TEXT;
  v_reward_id       INTEGER;
  v_do_charge       BOOLEAN := false;
BEGIN
  league_id := NULL;
  error     := NULL;

  -- ── 1. Validate user ────────────────────────────────────────────────────────
  IF p_user_id IS NULL OR p_user_id <= 0 THEN
    error := 'Debes iniciar sesión o registrarte para ingresar a una liga.';
    RETURN NEXT; RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "USER" u
    WHERE u.user_id = p_user_id AND u.is_deleted = false
  ) THEN
    error := 'Usuario no registrado. Debes completar tu registro para ingresar.';
    RETURN NEXT; RETURN;
  END IF;

  -- ── 2. Validate league ──────────────────────────────────────────────────────
  SELECT l.league_id, l.name, l.status, COALESCE(l.buy_in_amount, 0)
  INTO   v_league_id, v_league_name, v_league_status, v_entry_fee
  FROM   "LEAGUE" l
  WHERE  l.invitation_code = TRIM(p_invitation_code)
    AND  l.is_deleted = false
  LIMIT  1;

  IF v_league_id IS NULL THEN
    error := 'Código de invitación inválido o liga no encontrada.';
    RETURN NEXT; RETURN;
  END IF;

  IF v_league_status <> 'active' THEN
    error := 'La liga "' || v_league_name || '" no está activa.';
    RETURN NEXT; RETURN;
  END IF;

  -- ── 3. Check existing USER_LEAGUE row (any state) ──────────────────────────
  SELECT ul.user_league_id, ul.is_deleted, ul.approval_status
  INTO   v_existing_id, v_existing_del, v_existing_status
  FROM   "USER_LEAGUE" ul
  WHERE  ul.user_id   = p_user_id
    AND  ul.league_id = v_league_id
  LIMIT  1;

  -- Already an active approved member → return success (idempotent, no charge)
  IF v_existing_id IS NOT NULL
     AND (v_existing_del IS FALSE OR v_existing_del IS NULL)
     AND v_existing_status = 'approved' THEN
    league_id := v_league_id;
    RETURN NEXT; RETURN;
  END IF;

  -- Decide whether to charge:
  -- · No existing row            → fresh join, charge
  -- · Soft-deleted row           → returning member, charge again
  -- · Rejected row (not deleted) → re-applying, charge
  v_do_charge := (v_entry_fee > 0);

  -- ── 4. Wallet validation + charge (only if needed) ─────────────────────────
  IF v_do_charge THEN
    SELECT wallet_id, balance
    INTO   v_wallet_id, v_wallet_balance
    FROM   "WALLET"
    WHERE  user_id   = p_user_id
      AND  is_deleted = false
    LIMIT  1
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
      error := 'No se encontró tu wallet para pagar la cuota de ingreso.';
      RETURN NEXT; RETURN;
    END IF;

    IF COALESCE(v_wallet_balance, 0) < v_entry_fee THEN
      error := 'Saldo insuficiente para ingresar a esta liga. Necesitas $'
               || v_entry_fee || ' MXN.';
      RETURN NEXT; RETURN;
    END IF;

    SELECT catalog_id
    INTO   v_catalog_cuota
    FROM   "CATALOG"
    WHERE  table_name = 'transaction_type'
      AND  neumonic   = 'TRX_CUOTA'
      AND  is_deleted = false
    ORDER  BY catalog_id
    LIMIT  1;

    IF v_catalog_cuota IS NULL THEN
      error := 'No se encontró el tipo de transacción TRX_CUOTA.';
      RETURN NEXT; RETURN;
    END IF;

    -- Deduct wallet
    UPDATE "WALLET"
    SET    balance     = balance - v_entry_fee,
           updated_at  = v_now,
           updated_by  = p_user_id
    WHERE  wallet_id   = v_wallet_id;

    -- Record transaction
    INSERT INTO "TRANSACTION" (
      wallet_id, amount, transaction_date, catalog_id,
      description, created_by, created_at, is_deleted
    ) VALUES (
      v_wallet_id, -v_entry_fee, v_now, v_catalog_cuota,
      'Cuota de ingreso liga: ' || v_league_name,
      p_user_id, v_now, false
    );

    -- Update prize pool
    SELECT league_reward_id
    INTO   v_reward_id
    FROM   "LEAGUE_REWARD"
    WHERE  league_id  = v_league_id
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
        league_id, mundial_id, total_collected_amount,
        platform_fee_5pct, global_prize_1pct,
        created_by, created_at, is_deleted
      ) VALUES (
        v_league_id, 1, v_entry_fee, 0, 0,
        p_user_id, v_now, false
      );
    ELSE
      UPDATE "LEAGUE_REWARD"
      SET    total_collected_amount = COALESCE(total_collected_amount, 0) + v_entry_fee,
             updated_at             = v_now,
             updated_by             = p_user_id
      WHERE  league_reward_id = v_reward_id;
    END IF;
  END IF;

  -- ── 5. Upsert USER_LEAGUE ───────────────────────────────────────────────────
  IF v_existing_id IS NOT NULL THEN
    -- Re-activate: restore soft-deleted or rejected record
    UPDATE "USER_LEAGUE"
    SET    is_deleted      = false,
           approval_status = 'approved',
           deleted_at      = NULL,
           deleted_by      = NULL,
           updated_at      = v_now,
           updated_by      = p_user_id
    WHERE  user_league_id = v_existing_id;
  ELSE
    INSERT INTO "USER_LEAGUE" (
      user_id, league_id, accumulated_points,
      approval_status, created_by, created_at, is_deleted
    ) VALUES (
      p_user_id, v_league_id, 0,
      'approved', p_user_id, v_now, false
    );
  END IF;

  league_id := v_league_id;
  RETURN NEXT;
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION join_league_with_entry_fee(TEXT, INTEGER) TO authenticated;

-- -----------------------------------------------------------------------------
-- Migration log
-- -----------------------------------------------------------------------------
INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.35',
  'fix-join-league-upsert',
  'Fixes duplicate-key 23505 error when a user re-joins a league with a soft-deleted or rejected USER_LEAGUE record. Uses UPDATE instead of INSERT when a record already exists. Moves all validation before the wallet charge to prevent partial execution.',
  'db/script/v3.35-fix-join-league-upsert.sql',
  NOW(),
  'applied'
)
ON CONFLICT (version) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      script_path = EXCLUDED.script_path,
      applied_at  = EXCLUDED.applied_at,
      status      = EXCLUDED.status;
