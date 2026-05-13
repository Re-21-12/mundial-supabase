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
  v_user_id  INT;
  v_role_id  INT;
  v_name     TEXT;
  v_login    TEXT;
BEGIN
  v_name  := COALESCE(
               NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
               split_part(NEW.email, '@', 1)
             );
  v_login := split_part(NEW.email, '@', 1);

  INSERT INTO public."USER" (
    name,
    login,
    email,
    password_hash,
    registration_date,
    status,
    created_at
  )
  VALUES (
    v_name,
    v_login,
    NEW.email,
    'supabase_managed',
    NOW(),
    'active',
    NOW()
  )
  RETURNING user_id INTO v_user_id;

  -- Assign default role; silently skips when role does not exist
  SELECT role_id INTO v_role_id
  FROM public."ROLE"
  WHERE name = 'user'
  LIMIT 1;

  IF v_role_id IS NOT NULL THEN
    INSERT INTO public."USER_ROLE" (user_id, role_id)
    VALUES (v_user_id, v_role_id);
  END IF;

  -- Bootstrap wallet at zero balance
  INSERT INTO public."WALLET" (user_id, balance, status)
  VALUES (v_user_id, 0, 'active');

  RETURN NEW;
END;
$$;

-- Drop the trigger first so this script is idempotent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
