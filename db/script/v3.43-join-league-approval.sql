-- v3.43: Require admin approval when joining via invitation code
--
-- join_league_with_entry_fee now sets approval_status = 'pending_approval'
-- instead of 'approved'. After the upsert it inserts a NOTIFICATION_INBOX
-- row for the league owner so they can approve/reject from the inbox.
--
-- The wallet deduction still happens before the upsert so the prize pool
-- is funded atomically; the user's membership is just gated by approval.

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
  v_league_owner_id INTEGER;
  v_league_status   TEXT;
  v_wallet_id       INTEGER;
  v_wallet_balance  NUMERIC(12,2);
  v_entry_fee       NUMERIC(10,2);
  v_catalog_cuota   INTEGER;
  v_catalog_notif   INTEGER;
  v_now             TIMESTAMP := NOW();
  v_existing_id     INTEGER;
  v_existing_del    BOOLEAN;
  v_existing_status TEXT;
  v_reward_id       INTEGER;
  v_user_league_id  INTEGER;
  v_user_name       TEXT;
  v_user_email      TEXT;
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
  SELECT l.league_id, l.name, l.user_id, l.status, COALESCE(l.buy_in_amount, 0)
  INTO   v_league_id, v_league_name, v_league_owner_id, v_league_status, v_entry_fee
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

  -- Already pending → return so caller shows "awaiting approval"
  IF v_existing_id IS NOT NULL
     AND (v_existing_del IS FALSE OR v_existing_del IS NULL)
     AND v_existing_status = 'pending_approval' THEN
    league_id := v_league_id;
    RETURN NEXT; RETURN;
  END IF;

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
               || v_entry_fee || ' Q.';
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

    UPDATE "WALLET"
    SET    balance     = balance - v_entry_fee,
           updated_at  = v_now,
           updated_by  = p_user_id
    WHERE  wallet_id   = v_wallet_id;

    INSERT INTO "TRANSACTION" (
      wallet_id, amount, transaction_date, catalog_id,
      description, created_by, created_at, is_deleted
    ) VALUES (
      v_wallet_id, -v_entry_fee, v_now, v_catalog_cuota,
      'Cuota de ingreso liga: ' || v_league_name,
      p_user_id, v_now, false
    );

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

  -- ── 5. Upsert USER_LEAGUE with pending_approval ────────────────────────────
  IF v_existing_id IS NOT NULL THEN
    UPDATE "USER_LEAGUE"
    SET    is_deleted      = false,
           approval_status = 'pending_approval',
           deleted_at      = NULL,
           deleted_by      = NULL,
           updated_at      = v_now,
           updated_by      = p_user_id
    WHERE  user_league_id = v_existing_id
    RETURNING user_league_id INTO v_user_league_id;
  ELSE
    INSERT INTO "USER_LEAGUE" (
      user_id, league_id, accumulated_points,
      approval_status, created_by, created_at, is_deleted
    ) VALUES (
      p_user_id, v_league_id, 0,
      'pending_approval', p_user_id, v_now, false
    )
    RETURNING user_league_id INTO v_user_league_id;
  END IF;

  -- ── 6. Notify league owner for approval ────────────────────────────────────
  IF v_league_owner_id IS NOT NULL AND v_league_owner_id <> p_user_id THEN
    SELECT name, email INTO v_user_name, v_user_email
    FROM   "USER"
    WHERE  user_id = p_user_id AND is_deleted = false
    LIMIT  1;

    INSERT INTO "NOTIFICATION_INBOX" (
      user_id, league_id, notification_type,
      title, body, priority, action_url,
      payload, is_read, browser_notification_sent,
      created_by, created_at, is_deleted
    ) VALUES (
      v_league_owner_id,
      v_league_id,
      'participant_approval',
      'Solicitud de ingreso a liga',
      COALESCE(v_user_name, v_user_email, 'Un usuario') ||
        ' quiere unirse a ' || v_league_name || '. Aprueba o rechaza su solicitud.',
      'high',
      '/league/' || v_league_id || '/standings',
      jsonb_build_object(
        'userLeagueId', v_user_league_id,
        'userId',       p_user_id,
        'userName',     COALESCE(v_user_name,  ''),
        'userEmail',    COALESCE(v_user_email, ''),
        'leagueName',   v_league_name
      ),
      false,
      false,
      p_user_id,
      v_now,
      false
    );
  END IF;

  league_id := v_league_id;
  RETURN NEXT;
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION join_league_with_entry_fee(TEXT, INTEGER) TO authenticated;

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.43',
  'join-league-approval',
  'join_league_with_entry_fee now sets approval_status=pending_approval and inserts a participant_approval notification for the league owner. Admin must approve before the member gains full access.',
  'db/script/v3.43-join-league-approval.sql',
  NOW(),
  'applied'
)
ON CONFLICT (version) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      applied_at  = EXCLUDED.applied_at,
      status      = EXCLUDED.status;
