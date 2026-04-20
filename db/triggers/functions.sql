/* funcion de permisos dinamicos  */

CREATE OR REPLACE FUNCTION has_permission(p_name text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM "USER_ROLE" ur
    JOIN "ROLE_PERMISSION" rp ON ur.role_id = rp.role_id
    JOIN "PERMISSION" p ON rp.permission_id = p.permission_id
    WHERE ur.user_id = get_my_user_id()
    AND p.name = p_name
  );
$$ LANGUAGE sql SECURITY DEFINER;

/* handle SSO a USER */

CREATE OR REPLACE FUNCTION public.handle_new_user_sso()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public."USER" (
    login,
    name,
    email,
    password_hash, -- SSO no da password, ponemos un placeholder
    registration_date,
    status,
    created_at,
    is_deleted
  )
  VALUES (
    new.email, -- Usamos el email como login inicial
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Nuevo Usuario'),
    new.email,
    'SSO_AUTHENTICATED', -- Identificador de que no usa password local
    now(),
    'active',
    now(),
    false
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/* Generic audit log */
CREATE OR REPLACE FUNCTION public.fn_audit_log_generic()
RETURNS trigger AS $$
DECLARE
    v_user_id int;
    v_session_id int;
BEGIN
    -- 1. Intentamos obtener el ID del usuario actual usando tu función
    v_user_id := get_my_user_id();

    -- 2. Buscamos la sesión activa más reciente para ese usuario
    SELECT user_session_id INTO v_session_id
    FROM "USER_SESSION"
    WHERE user_id = v_user_id
    ORDER BY created_at DESC LIMIT 1;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO "AUDIT_LOG" (table_name, operation_type, new_values, user_session_id, created_by, created_at)
        VALUES (TG_TABLE_NAME, 'I', row_to_json(NEW)::text, COALESCE(v_session_id, 0), v_user_id, now());
        RETURN NEW;

    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO "AUDIT_LOG" (table_name, operation_type, old_values, new_values, user_session_id, created_by, created_at)
        VALUES (TG_TABLE_NAME, 'U', row_to_json(OLD)::text, row_to_json(NEW)::text, COALESCE(v_session_id, 0), v_user_id, now());
        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO "AUDIT_LOG" (table_name, operation_type, old_values, user_session_id, created_by, created_at)
        VALUES (TG_TABLE_NAME, 'D', row_to_json(OLD)::text, COALESCE(v_session_id, 0), v_user_id, now());
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
