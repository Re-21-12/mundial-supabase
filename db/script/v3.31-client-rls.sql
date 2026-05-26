-- v3.31: RLS para TRANSACTION y restricciones de escritura en TEAM
-- Ejecutar en: Dashboard → SQL Editor → New query

-- ── 1. TRANSACTION: cada usuario solo ve sus propias transacciones ─────────────
-- La tabla no tiene user_id directo; se accede vía WALLET.

ALTER TABLE "TRANSACTION" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_transaction"     ON "TRANSACTION";
DROP POLICY IF EXISTS "user_own_transactions"     ON "TRANSACTION";

-- Admin: acceso total
CREATE POLICY "admin_all_transaction" ON "TRANSACTION"
  FOR ALL TO authenticated
  USING (has_permission('transaction:admin'));

-- Usuario: solo transacciones de sus wallets
CREATE POLICY "user_own_transactions" ON "TRANSACTION"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "WALLET" w
      WHERE w.wallet_id = "TRANSACTION".wallet_id
        AND w.user_id   = get_my_user_id()
    )
  );

-- ── 2. TEAM: lectura pública, escritura solo admin ────────────────────────────

ALTER TABLE "TEAM" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_team"          ON "TEAM";
DROP POLICY IF EXISTS "authenticated_read_team" ON "TEAM";

-- Admin: CRUD completo
CREATE POLICY "admin_all_team" ON "TEAM"
  FOR ALL TO authenticated
  USING (has_permission('team:admin'));

-- Todos los autenticados: solo lectura (sin WITH CHECK → no permite INSERT/UPDATE)
CREATE POLICY "authenticated_read_team" ON "TEAM"
  FOR SELECT TO authenticated
  USING (true);

-- ── Verificar políticas aplicadas ─────────────────────────────────────────────
SELECT schemaname, tablename, policyname, cmd
FROM   pg_policies
WHERE  tablename IN ('TRANSACTION', 'TEAM')
ORDER  BY tablename, policyname;
