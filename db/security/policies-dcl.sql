-- Política 1: El dueño ve sus datos
CREATE POLICY "Dueño ve sus predicciones" ON "PREDICTION"
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "USER_LEAGUE" ul
    WHERE ul.user_league_id = "PREDICTION".user_league_id
    AND ul.user_id = get_my_user_id()
  )
);

-- Política 2: El admin ve todo
CREATE POLICY "Admins ven todo" ON "PREDICTION"
FOR SELECT TO authenticated
USING (has_permission('prediction:read_all'));

-- Política 3: Soporte técnico ve datos pero solo de ligas activas
CREATE POLICY "Soporte ve ligas activas" ON "PREDICTION"
FOR SELECT TO authenticated
USING (has_permission('support:view'));
