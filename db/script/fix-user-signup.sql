-- fix-user-signup.sql
-- Resuelve "Database error saving new user" causado por:
--   1. FK circular USER.user_id → WALLET.user_id con INITIALLY IMMEDIATE
--      El trigger inserta USER primero y WALLET después; la FK falla de inmediato.
--   2. Usuarios seed sin WALLET correspondiente (data integrity gap).
--   3. Secuencia IDENTITY de USER desincronizada tras seeds con IDs explícitos.
--
-- Ejecutar en: Dashboard → SQL Editor → New query

-- ── 1. Eliminar la FK circular ────────────────────────────────────────────────
-- Esta FK fuerza que USER.user_id exista en WALLET ANTES de poder insertar en USER.
-- Es un chicken-and-egg: el trigger crea USER primero, luego WALLET.
-- La integridad ya está garantizada por el trigger; esta FK sobra.

ALTER TABLE "USER" DROP CONSTRAINT IF EXISTS "USER_user_id_fkey";
ALTER TABLE "USER" DROP CONSTRAINT IF EXISTS "USER_wallet_user_id_fkey";

-- ── 2. Crear wallets faltantes para usuarios que no tienen una ─────────────────
-- Cubre los usuarios del seed que se crearon sin pasar por el trigger.

INSERT INTO "WALLET" (user_id, balance, status, created_by, created_at)
SELECT u.user_id, 0, 'active', u.user_id, NOW()
FROM   "USER" u
WHERE  NOT EXISTS (
  SELECT 1 FROM "WALLET" w WHERE w.user_id = u.user_id
);

-- ── 3. Sincronizar secuencias IDENTITY (método correcto para GENERATED AS IDENTITY) ──
-- setval() no funciona para identity columns; hay que usar RESTART WITH.

DO $$
DECLARE
  v_max_user   INT;
  v_max_wallet INT;
BEGIN
  SELECT COALESCE(MAX(user_id),   0) + 1 INTO v_max_user   FROM "USER";
  SELECT COALESCE(MAX(wallet_id), 0) + 1 INTO v_max_wallet FROM "WALLET";

  EXECUTE format('ALTER TABLE "USER"   ALTER COLUMN user_id   RESTART WITH %s', v_max_user);
  EXECUTE format('ALTER TABLE "WALLET" ALTER COLUMN wallet_id RESTART WITH %s', v_max_wallet);

  RAISE NOTICE 'USER sequence   → starts at %', v_max_user;
  RAISE NOTICE 'WALLET sequence → starts at %', v_max_wallet;
END $$;

-- ── 5. Verificar que el trigger existe ────────────────────────────────────────

SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- ── 6. Test que simula el trigger (hace ROLLBACK, no guarda datos) ────────────
-- Ejecuta esto para confirmar que el signup funcionará.
-- Si falla, el NOTICE muestra el error exacto.

DO $$
DECLARE
  v_uid    INT;
  v_suffix TEXT := floor(random() * 99999)::text;
BEGIN
  INSERT INTO "USER" (uuid, name, login, email, password_hash, registration_date, status, created_at)
  VALUES (
    gen_random_uuid(),
    'Test User',
    'test_' || v_suffix,
    'test_' || v_suffix || '@test.com',
    'supabase_managed',
    NOW(),
    'active',
    NOW()
  )
  RETURNING user_id INTO v_uid;

  INSERT INTO "WALLET" (user_id, balance, status, created_by, created_at)
  VALUES (v_uid, 0, 'active', v_uid, NOW());

  RAISE NOTICE '✅ Test OK — user_id generado: %', v_uid;
  ROLLBACK;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error en statement: % | SQLState: %', SQLERRM, SQLSTATE;
  ROLLBACK;
END $$;
