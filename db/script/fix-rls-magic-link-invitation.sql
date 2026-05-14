-- ===================================================================
-- Fix: RLS policies para MAGIC_LINK e INVITATION
-- Problema: MAGIC_LINK no tenía políticas → INSERT bloqueado (42501)
--           INVITATION fallaba en caso anónimo (user_league_id = NULL)
-- ===================================================================

-- ─── MAGIC_LINK ──────────────────────────────────────────────────────────────

ALTER TABLE "MAGIC_LINK" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "magic_link_admin_all"    ON "MAGIC_LINK";
DROP POLICY IF EXISTS "magic_link_insert"        ON "MAGIC_LINK";
DROP POLICY IF EXISTS "magic_link_select_own"    ON "MAGIC_LINK";
DROP POLICY IF EXISTS "magic_link_update_own"    ON "MAGIC_LINK";

-- Admins: acceso total
CREATE POLICY "magic_link_admin_all" ON "MAGIC_LINK"
  FOR ALL TO authenticated
  USING     (has_permission('MAGIC_LINK:admin'))
  WITH CHECK(has_permission('MAGIC_LINK:admin'));

-- Usuarios autenticados: pueden crear magic links (created_by debe ser el propio usuario)
CREATE POLICY "magic_link_insert" ON "MAGIC_LINK"
  FOR INSERT TO authenticated
  WITH CHECK (created_by = get_my_user_id());

-- Usuarios autenticados: ven los magic links que ellos crearon
CREATE POLICY "magic_link_select_own" ON "MAGIC_LINK"
  FOR SELECT TO authenticated
  USING (created_by = get_my_user_id());

-- Usuarios autenticados: pueden marcar como usado un magic link dirigido a su email
CREATE POLICY "magic_link_update_own" ON "MAGIC_LINK"
  FOR UPDATE TO authenticated
  USING  (email = (SELECT email FROM "USER" WHERE user_id = get_my_user_id()))
  WITH CHECK (email = (SELECT email FROM "USER" WHERE user_id = get_my_user_id()));

-- ─── INVITATION ──────────────────────────────────────────────────────────────
-- El global_policy usa user_league_id para el CHECK, lo que bloquea el caso
-- anónimo donde user_league_id es NULL.  Reemplazamos con políticas basadas
-- en created_by (quien envía) y email (quien recibe).

ALTER TABLE "INVITATION" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_policy"          ON "INVITATION";
DROP POLICY IF EXISTS "user_own_policy"           ON "INVITATION";
DROP POLICY IF EXISTS "invitation_admin_all"       ON "INVITATION";
DROP POLICY IF EXISTS "invitation_insert"          ON "INVITATION";
DROP POLICY IF EXISTS "invitation_select_sender"   ON "INVITATION";
DROP POLICY IF EXISTS "invitation_select_receiver" ON "INVITATION";
DROP POLICY IF EXISTS "invitation_update_receiver" ON "INVITATION";

-- Admins: acceso total
CREATE POLICY "invitation_admin_all" ON "INVITATION"
  FOR ALL TO authenticated
  USING     (has_permission('INVITATION:admin'))
  WITH CHECK(has_permission('INVITATION:admin'));

-- Remitente: puede crear invitaciones en nombre propio
CREATE POLICY "invitation_insert" ON "INVITATION"
  FOR INSERT TO authenticated
  WITH CHECK (created_by = get_my_user_id());

-- Remitente: ve las invitaciones que envió
CREATE POLICY "invitation_select_sender" ON "INVITATION"
  FOR SELECT TO authenticated
  USING (created_by = get_my_user_id());

-- Destinatario: ve las invitaciones dirigidas a su email
CREATE POLICY "invitation_select_receiver" ON "INVITATION"
  FOR SELECT TO authenticated
  USING (email = (SELECT email FROM "USER" WHERE user_id = get_my_user_id()));

-- Destinatario: puede aceptar/rechazar (UPDATE status) en invitaciones a su email
CREATE POLICY "invitation_update_receiver" ON "INVITATION"
  FOR UPDATE TO authenticated
  USING  (email = (SELECT email FROM "USER" WHERE user_id = get_my_user_id()))
  WITH CHECK (email = (SELECT email FROM "USER" WHERE user_id = get_my_user_id()));
