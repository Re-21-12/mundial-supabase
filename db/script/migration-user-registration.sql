-- ============================================================
-- Migration: Auto-provision internal USER on Supabase auth signup
-- Version: v3.2.0
-- Applies to: public schema
-- ============================================================

-- Function fires after every INSERT on auth.users.
-- It creates:
--   1. A public."USER" record linked to the new auth identity
--   2. A USER_ROLE assignment to the default 'cliente' role
--   3. A WALLET seeded at 0 balance
--
-- The name is read from raw_user_meta_data->>'name' if the client
-- passed it via signUp({ options: { data: { name } } }).
-- Falls back to the email-prefix when absent.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    INT;
  v_role_id    INT;
  v_name       TEXT;
  v_login      TEXT;
  v_base_login TEXT;
  v_counter    INT := 0;
BEGIN
  v_name       := COALESCE(
                    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
                    split_part(NEW.email, '@', 1)
                  );
  v_base_login := split_part(NEW.email, '@', 1);
  v_login      := v_base_login;

  -- ── Si el email ya existe en public.USER (seed / intento previo) ────────────
  -- Solo vincula el uuid de auth y sale; la wallet ya existe.
  SELECT user_id INTO v_user_id FROM public."USER" WHERE email = NEW.email LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    UPDATE public."USER"
    SET uuid       = NEW.id,
        updated_at = NOW()
    WHERE user_id  = v_user_id;

    INSERT INTO public."WALLET" (user_id, balance, status, created_by, created_at)
    VALUES (v_user_id, 0, 'active', v_user_id, NOW())
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
  END IF;

  -- ── Usuario nuevo: garantizar login único ────────────────────────────────────
  WHILE EXISTS (SELECT 1 FROM public."USER" WHERE login = v_login) LOOP
    v_counter := v_counter + 1;
    v_login   := v_base_login || '_' || v_counter;
  END LOOP;

  INSERT INTO public."USER" (
    uuid, name, login, email, password_hash, registration_date, status, created_at
  )
  VALUES (
    NEW.id, v_name, v_login, NEW.email, 'supabase_managed', NOW(), 'active', NOW()
  )
  RETURNING user_id INTO v_user_id;

  -- Rol por defecto (silencioso si no existe)
  SELECT role_id INTO v_role_id FROM public."ROLE" WHERE name = 'user' LIMIT 1;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public."USER_ROLE" (user_id, role_id, created_by, created_at)
    VALUES (v_user_id, v_role_id, v_user_id, NOW());
  END IF;

  -- Wallet inicial en cero
  INSERT INTO public."WALLET" (user_id, balance, status, created_by, created_at)
  VALUES (v_user_id, 0, 'active', v_user_id, NOW());

  RETURN NEW;
END;
$$;

-- Drop the trigger first so this script is idempotent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
