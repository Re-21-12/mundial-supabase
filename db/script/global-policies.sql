CREATE OR REPLACE PROCEDURE public.setup_global_policies(target_tables text[])
LANGUAGE plpgsql AS $$
DECLARE
    table_name_text text;
    owner_column text;
BEGIN
    FOREACH table_name_text IN ARRAY target_tables
    LOOP
        -- 1. DETERMINAR LA COLUMNA DE PROPIEDAD
        -- Si la tabla tiene user_id, lo usamos. Si tiene user_league_id, usamos lógica de Join.
        SELECT column_name INTO owner_column
        FROM information_schema.columns
        WHERE table_name = table_name_text AND column_name = 'user_id';

        -- Habilitar RLS en la tabla
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name_text);

        -- ELIMINAR POLÍTICAS PREVIAS PARA EVITAR DUPLICADOS
        EXECUTE format('DROP POLICY IF EXISTS "admin_all_policy" ON %I', table_name_text);
        EXECUTE format('DROP POLICY IF EXISTS "user_own_policy" ON %I', table_name_text);

        -- ==========================================
        -- 2. POLÍTICA PARA ADMINISTRADORES (Acceso Total)
        -- ==========================================
        EXECUTE format('
            CREATE POLICY "admin_all_policy" ON %I
            FOR ALL TO authenticated
            USING (has_permission(%L))
            WITH CHECK (has_permission(%L))',
            table_name_text,
            table_name_text || ':admin', -- Permiso dinámico ej: LEAGUE:admin
            table_name_text || ':admin'
        );

        -- ==========================================
        -- 3. POLÍTICA PARA USUARIOS (Acceso Propio)
        -- ==========================================
        IF owner_column IS NOT NULL THEN
            -- Caso A: La tabla tiene user_id directo (ej: LEAGUE, WALLET)
            EXECUTE format('
                CREATE POLICY "user_own_policy" ON %I
                FOR ALL TO authenticated
                USING (user_id = get_my_user_id())
                WITH CHECK (user_id = get_my_user_id())',
                table_name_text
            );
        ELSE
            -- Caso B: Tablas vinculadas por user_league_id (ej: PREDICTION, INVITATION)
            -- Aquí el CHECK de INSERT es vital para que no inserten en ligas ajenas
            EXECUTE format('
                CREATE POLICY "user_own_policy" ON %I
                FOR ALL TO authenticated
                USING (EXISTS (SELECT 1 FROM "USER_LEAGUE" ul WHERE ul.user_league_id = %I.user_league_id AND ul.user_id = get_my_user_id()))
                WITH CHECK (EXISTS (SELECT 1 FROM "USER_LEAGUE" ul WHERE ul.user_league_id = user_league_id AND ul.user_id = get_my_user_id()))',
                table_name_text, table_name_text
            );
        END IF;

    END LOOP;
END;
$$;
