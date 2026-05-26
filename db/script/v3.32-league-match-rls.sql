-- v3.32: RLS para LEAGUE, MATCH, STADIUM (filtrado) y TEAM (filtrado)
-- Regla general:
--   Admin  → ve y modifica todo (via has_permission)
--   Cliente → ve solo lo suyo (ligas propias o en las que es miembro)
--             edita/borra solo lo que él creó
-- Ejecutar en: Dashboard → SQL Editor → New query

-- ────────────────────────────────────────────────────────────────────────────
-- LEAGUE
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE "LEAGUE" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_league"          ON "LEAGUE";
DROP POLICY IF EXISTS "user_select_own_league"    ON "LEAGUE";
DROP POLICY IF EXISTS "user_insert_league"        ON "LEAGUE";
DROP POLICY IF EXISTS "user_update_own_league"    ON "LEAGUE";
DROP POLICY IF EXISTS "user_delete_own_league"    ON "LEAGUE";

-- Admin: acceso total
CREATE POLICY "admin_all_league" ON "LEAGUE"
  FOR ALL TO authenticated
  USING     (has_permission('league:admin'))
  WITH CHECK(has_permission('league:admin'));

-- Cliente SELECT: ligas que creó O en las que es miembro
CREATE POLICY "user_select_own_league" ON "LEAGUE"
  FOR SELECT TO authenticated
  USING (
    user_id = get_my_user_id()
    OR EXISTS (
      SELECT 1 FROM "USER_LEAGUE" ul
      WHERE ul.league_id = "LEAGUE".league_id
        AND ul.user_id   = get_my_user_id()
        AND ul.is_deleted = false
    )
  );

-- Cliente INSERT: cualquier autenticado puede crear una liga
CREATE POLICY "user_insert_league" ON "LEAGUE"
  FOR INSERT TO authenticated
  WITH CHECK (user_id = get_my_user_id());

-- Cliente UPDATE/DELETE: solo sus propias ligas
CREATE POLICY "user_update_own_league" ON "LEAGUE"
  FOR UPDATE TO authenticated
  USING     (user_id = get_my_user_id())
  WITH CHECK(user_id = get_my_user_id());

CREATE POLICY "user_delete_own_league" ON "LEAGUE"
  FOR DELETE TO authenticated
  USING (user_id = get_my_user_id());

-- ────────────────────────────────────────────────────────────────────────────
-- MATCH
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE "MATCH" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_match"        ON "MATCH";
DROP POLICY IF EXISTS "user_select_own_match"  ON "MATCH";

-- Admin: acceso total
CREATE POLICY "admin_all_match" ON "MATCH"
  FOR ALL TO authenticated
  USING     (has_permission('match:admin'))
  WITH CHECK(has_permission('match:admin'));

-- Cliente SELECT: solo partidos en ligas donde es miembro o creador
CREATE POLICY "user_select_own_match" ON "MATCH"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "USER_LEAGUE" ul
      WHERE ul.league_id = "MATCH".league_id
        AND ul.user_id   = get_my_user_id()
        AND ul.is_deleted = false
    )
    OR EXISTS (
      SELECT 1 FROM "LEAGUE" l
      WHERE l.league_id = "MATCH".league_id
        AND l.user_id   = get_my_user_id()
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- STADIUM — reemplaza la política de v3.31 (si existía)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE "STADIUM" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_stadium"          ON "STADIUM";
DROP POLICY IF EXISTS "user_select_own_stadium"    ON "STADIUM";

-- Admin: acceso total
CREATE POLICY "admin_all_stadium" ON "STADIUM"
  FOR ALL TO authenticated
  USING     (has_permission('stadium:admin'))
  WITH CHECK(has_permission('stadium:admin'));

-- Cliente SELECT: solo estadios usados en partidos de sus ligas
CREATE POLICY "user_select_own_stadium" ON "STADIUM"
  FOR SELECT TO authenticated
  USING (
    has_permission('stadium:admin')
    OR EXISTS (
      SELECT 1
      FROM   "MATCH"      m
      JOIN   "USER_LEAGUE" ul ON ul.league_id = m.league_id AND ul.is_deleted = false
      WHERE  m.stadium_id  = "STADIUM".stadium_id
        AND  ul.user_id    = get_my_user_id()
    )
    OR EXISTS (
      SELECT 1
      FROM   "MATCH"   m
      JOIN   "LEAGUE"  l  ON l.league_id = m.league_id
      WHERE  m.stadium_id = "STADIUM".stadium_id
        AND  l.user_id    = get_my_user_id()
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- TEAM — actualiza la política de v3.31 (era FOR SELECT USING (true))
-- ────────────────────────────────────────────────────────────────────────────
-- Eliminar la política permisiva creada en v3.31
DROP POLICY IF EXISTS "authenticated_read_team" ON "TEAM";
DROP POLICY IF EXISTS "user_select_own_team"    ON "TEAM";

-- Cliente SELECT: solo equipos que juegan en partidos de sus ligas
CREATE POLICY "user_select_own_team" ON "TEAM"
  FOR SELECT TO authenticated
  USING (
    has_permission('team:admin')
    OR EXISTS (
      SELECT 1
      FROM   "MATCH"       m
      JOIN   "USER_LEAGUE" ul ON ul.league_id = m.league_id AND ul.is_deleted = false
      WHERE  (m.first_team_id = "TEAM".team_id OR m.second_team_id = "TEAM".team_id)
        AND  ul.user_id = get_my_user_id()
    )
    OR EXISTS (
      SELECT 1
      FROM   "MATCH"  m
      JOIN   "LEAGUE" l ON l.league_id = m.league_id
      WHERE  (m.first_team_id = "TEAM".team_id OR m.second_team_id = "TEAM".team_id)
        AND  l.user_id = get_my_user_id()
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Verificar políticas aplicadas
-- ────────────────────────────────────────────────────────────────────────────
SELECT tablename, policyname, cmd
FROM   pg_policies
WHERE  tablename IN ('LEAGUE','MATCH','STADIUM','TEAM')
ORDER  BY tablename, policyname;
