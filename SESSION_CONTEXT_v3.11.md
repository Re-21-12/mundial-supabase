# SESSION CONTEXT — v3.11 (2026-05-14)

## Stack
- Angular 18 (signals, OnPush, standalone, `input()`)
- Supabase (Auth, Postgres, Realtime, Edge Functions, RLS, RPC)
- Supabase project ID: `mwflkwazlhvrtckbbkpi`
- URL: `https://mwflkwazlhvrtckbbkpi.supabase.co`
- TailwindCSS + SpartanNG + PrimeNG

---

## Estado de la rama

Todo el trabajo de esta sesión fue commiteado directamente a `main` (no hubo PR separado).

| Commit | Descripción |
|--------|-------------|
| `2a7328c` | feat(v3.11): league dashboard, catalog seed, migrations page, wallet top-up |
| `520d6b2` | fix(wallet-topup): import DecimalPipe — NG8004 |
| `c68b4da` | fix(routing): wallet/top-up movido a WALLET_ROUTES — NG04002 |

---

## Issues relacionados

| Issue | Descripción |
|-------|-------------|
| #30 | Backlog v3.11 (cerrado parcialmente) |
| #31 | Backlog pendiente v3.11 → próxima sesión |

---

## Lo que se hizo en esta sesión

### 1. Home — "Mis Ligas" (Issue #30 — tarea 1)
- **`UserLeaguesService`** (`src/app/core/services/user-leagues.service.ts`)
  - `loadUserLeagues(userId)` → USER_LEAGUE + LEAGUE join, calcula rank comparando puntos acumulados
  - Retorna `UserLeagueCard[]` ordenado por posición
- **Home** actualizado:
  - Sección "Mis Ligas" antes del grid de partidos
  - Cards: emoji de posición (🥇🥈🥉/#N), nombre de liga, "Posición X de Y", puntos
  - Skeleton loading (3 placeholders animados con shimmer)
  - Click → navega a `/league/:id/standings`
  - Estado vacío con botón "Unirse con código"

### 2. Catalog seed — todos los SELECT del sistema
- **`db/script/seed-catalogs.sql`** — ⚠️ **pendiente ejecutar en Supabase**

| table_id | table_name | Usado en | Ejemplos |
|----------|------------|----------|---------|
| 10 | `team_category` | teams-form | Selección Nacional, Club de Liga |
| 20 | `league_type` | league-form | Liga Regular, Copa, Eliminatoria |
| 30 | `period_type` | matchPeriodForm | 1T, 2T, TE1, Penales |
| 40 | `transaction_type` | transactionForm | Depósito, Retiro, Premio |
| 50 | `country` | stadiumForm | MX, AR, BR, ES… 20 países |
| 60 | `league_status` | league-form status | Activa, Inactiva, Finalizada |

### 3. Formularios corregidos

| Archivo | Cambio |
|---------|--------|
| `league-form.ts` | Campo `status` TEXT → SELECT (optionsSource table_id=60); import `filter` eliminado |
| `teams-form.ts` | `filterValue: '1'` → `10` (team_category) |
| `forms.ts` matchPeriodForm | Añadido `filterField: 'table_id', filterValue: 30` |
| `forms.ts` transactionForm | Añadido `filterField: 'table_id', filterValue: 40` |

### 4. `/admin/migrations`
- Página: `src/app/core/pages/admin-migrations/`
- Query a `MIGRATION_LOG` ordenado por `applied_at DESC`
- Columnas: versión, nombre, descripción, fecha, ejecutada por, tiempo ms, estado
- Estado con `p-tag`: ✅ Aplicada / ❌ Error / ⚠ Pendiente
- Ruta registrada en `app.routes.ts` bajo `admin/migrations`
- Oculta columna descripción en mobile

### 5. `/wallet/top-up`
- Página: `src/app/core/pages/wallet-topup/`
- Balance actual con diseño card degradado
- Botones de monto rápido: $100 / $200 / $500 / $1000
- Input de monto personalizado (mínimo $50)
- Select de método de pago simulado: Tarjeta, OXXO, Transferencia, PayPal
- **`WalletService.deposit(walletId, userId, amount, catalogId, description)`**
  - INSERT en TRANSACTION
  - SELECT balance actual + UPDATE WALLET.balance (saldo + monto)
- Navbar wallet chip ahora enlaza a `/wallet/top-up` (antes `/wallet`)
- Fix NG8004: `DecimalPipe` importado en el componente
- Fix NG04002: ruta movida a `WALLET_ROUTES` como hijo `top-up` (no como ruta top-level con slash)

---

## Arquitectura de servicios actualizada

| Servicio | Propósito |
|----------|-----------|
| `SupabaseAuthService` | Auth, session logging, signals |
| `AuthFacade` | Proxy de SupabaseAuthService |
| `ProfileService` | USER + WALLET por userId |
| `SearchService` | RPC `fn_global_search` |
| `StandingsService` | USER_LEAGUE + Realtime |
| `ScheduleService` | MATCH + TEAM join |
| `InvitationService` | INVITATION CRUD + sendToExisting/Anonymous |
| `ApprovalService` | USER_LEAGUE.approval_status |
| `WalletService` | WALLET balance + `deposit()` |
| `UserAdminService` | Backoffice: create/delete/reset via Edge Function |
| `JoinLeagueService` | Unirse a liga por invitation_code |
| `HomeRealtimeService` | MATCH + MATCH_PERIOD + TEAM Realtime |
| `UserLeaguesService` | Ligas activas del usuario con rank (nuevo) |

---

## Rutas actuales

```
/home                    → Home con Realtime + sección "Mis Ligas"
/league                  → CRUD ligas
/league/:id/standings    → Tabla posiciones con Realtime
/league/:id/schedule     → Calendario de partidos
/prediction/:id          → Predicción de partido
/profile                 → Perfil + wallet balance
/admin/users             → Backoffice usuarios
/admin/migrations        → Historial MIGRATION_LOG (nuevo)
/invitation              → Gestión de invitaciones
/wallet                  → Wallet CRUD (admin)
/wallet/top-up           → Pantalla de recarga de saldo (nuevo)
/user-session            → Sesiones (tabla genérica)
```

---

## Taxonomy de CATALOG (table_id)

```
1  → FK placeholder LEAGUE   (no usar para dropdowns)
2  → FK placeholder TEAM
3  → FK placeholder STADIUM
4  → FK placeholder MATCH_PERIOD
10 → team_category
20 → league_type
30 → period_type
40 → transaction_type
50 → country
60 → league_status
```

---

## Tablas clave y columnas relevantes

### USER_LEAGUE
`user_league_id, user_id, league_id, accumulated_points, approval_status, is_deleted`
- En Realtime publication ✅
- `approval_status`: pending / approved / rejected

### WALLET
`wallet_id, user_id, balance, status, currency`

### TRANSACTION
`transaction_id, wallet_id, amount, catalog_id (FK→CATALOG), description, transaction_date`

### MIGRATION_LOG
`migration_id, version, name, description, script_path, applied_at, applied_by, status, checksum, execution_ms`

---

## ⚠️ Acción manual requerida

**Ejecutar en Supabase SQL Editor:**
```sql
-- Archivo: db/script/seed-catalogs.sql
-- Pobla los catálogos para que funcionen todos los SELECT de los formularios
```

---

## Issue #31 — Próxima sesión

### Alta prioridad
1. **Wallet filtrada por usuario** — `/wallet` muestra todas; cliente solo debe ver la suya
2. **Email invitaciones** — Edge Function con Resend/SendGrid (InvitationService ya crea registros en DB)
3. **Link de invitación en vista de liga** — si es admin, mostrar botón generar link

### Media prioridad
4. **Variación standings** — columna `previous_rank` en USER_LEAGUE (migration v3.12) + indicador ↑/↓
5. **Log de última jornada** — modelo de "jornada/matchday"
6. **Liga de pago exige sesión** — guard que valide `LEAGUE.catalog_id` → tipo pago

### Baja prioridad
7. **Bracket interactivo** — árbol de eliminatoria CSS + Realtime canal `bracket-{league_id}`
8. **Simulador de partidos** — calcular puntos vs predicción, UPDATE accumulated_points
9. **Prize pool** — distribución según RULES_LEAGUE al finalizar liga
10. **Seed RULES_LEAGUE** — valores por defecto
11. **docs/REGLAS.md** — documento de reglas del sistema

---

## Notas de arquitectura

- **Linter agresivo**: puede revertir cambios si variable declarada no se usa inmediatamente. Usar `Write` para archivos completos o encadenar edits rápido
- **Routing Angular**: nunca usar `/` en `path` al mismo nivel — anidarlo como hijo del módulo padre (fix NG04002)
- **DecimalPipe**: debe importarse explícitamente en standalone components (fix NG8004)
- **Catalog filters**: siempre usar `filterField + filterValue` para limitar dropdown al category correcto
- **Realtime**: MATCH, MATCH_PERIOD, USER_LEAGUE en `supabase_realtime` publication
- **Auth**: `supabase-auth-service.ts` fuente de verdad, `AuthFacade` es el proxy
- **Commits**: esta sesión fue directo a main; próxima sesión volver al flujo feature branch → PR
