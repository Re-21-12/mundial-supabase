# SESSION CONTEXT — v3.13 (2026-05-27)

## Stack
- Angular 21 (signals, OnPush, standalone, `input()`, `resource()`, `effect()`)
- Supabase (Auth, Postgres, Realtime, Edge Functions, RLS)
- Supabase project ID: `mwflkwazlhvrtckbbkpi`
- URL: `https://mwflkwazlhvrtckbbkpi.supabase.co`
- TailwindCSS + PrimeNG
- MCP Supabase configurado en `.mcp.json` (activa al reiniciar sesión)

---

## Lo que se hizo en esta sesión (v3.13)

### 1. Fix: pérdida aleatoria de sesión (`supabase-auth-service.ts`)
Tres bugs en `onAuthStateChange`:
- **`TOKEN_REFRESHED`**: no llamaba `_applySessionState()` → JWT stale en signals.
- **`INITIAL_SESSION`**: llamaba `_handleSessionMetadata()` que redirigía siempre a `/home` → rompía URLs directas.
- **`SIGNED_IN`**: llamaba `logSessionStart()` incondicionalmente → duplicaba registros en `USER_SESSION`.

### 2. Fix: notificaciones no aparecían en la bandeja
- `NOTIFICATION_INBOX` tenía RLS habilitado pero cero políticas → default deny para `authenticated`.
- Solución: `db/script/v3.36-notification-inbox-rls-policies.sql`

### 3. Fix: página de migraciones vacía
- `MIGRATION_LOG` sin políticas RLS → mismo patrón default deny.
- Solución: `db/script/v3.37-missing-rls-policies.sql`

### 4. Fix: totales de partido no se actualizaban al guardar períodos
- Ni `match-scoreboard.ts` ni `match-period.ts` recalculaban los totales.
- Solución: trigger AFTER en `MATCH_PERIOD` → `db/script/v3.38-match-period-totals-trigger.sql`

### 5. Guardias ACID en tablas financieras
- CHECK constraints: `balance >= 0`, `amounts >= 0`, `points >= 0`, `amount <> 0` en TRANSACTION.
- Fix `settle_league_rewards()`: advisory lock + re-lectura de `payment_date` post-UPSERT.
- Solución: `db/script/v3.39-acid-financial-guards.sql`

### 6. Extra time automático (`MATCH.phase`)
- Nueva columna `MATCH.phase TEXT` (`regulation` / `extra_time` / `finished`).
- `handle_match_extra_time()`: cuando empate al cierre de regulación → +30 min; si sigue empate → `phase = 'finished'`.
- `scored_at` NO se toca — preserva el pipeline de evaluación de predicciones.
- Realtime habilitado en MATCH para que Angular reciba los cambios de `phase`.
- `match-scoreboard.ts/html`: tags `matchPhaseLabel`, `matchPhaseSeverity`, `isMatchClosed`.
- Solución: `db/script/v3.40-match-extra-time.sql`

### 7. Aprobación de participantes
- `USER_LEAGUE.approval_status` ya existía (`approved`/`rejected`). Se añadió `pending_approval`.
- **Flujo**: usuario acepta invitación → `USER_LEAGUE` se crea con `pending_approval` → admin recibe notificación tipo `participant_approval` en su bandeja con botones **Aprobar / Rechazar**.
- Aprobar → `approval_status = 'approved'` + notificación al usuario.
- Rechazar → `approval_status = 'rejected'` + soft delete + notificación al usuario.
- Fix secundario: `sendToExistingUser` ahora también crea una entrada en `MAGIC_LINK` para que el token sea procesable por `acceptMagicLink()`.
- Archivos modificados:
  - `db/script/v3.41-user-league-pending-approval.sql`
  - `src/app/shared/components/notification-inbox/invitation.service.ts`
  - `src/app/shared/components/notification-inbox/notification-inbox.service.ts` (`participant_approval` en NotificationType)
  - `src/app/shared/components/notification-inbox/notification-inbox.component.ts` (botones Aprobar/Rechazar, inyecta `InvitationService`)
  - `src/app/core/pages/invite/invite.ts` (estado `pending_approval`)
  - `src/app/core/pages/invite/invite.html` (caso `pending_approval`: "Solicitud enviada")
  - `src/app/core/pages/invite/invite.css` (`.invite-icon-pending` en ámbar)

### 8. Validación del sistema vs. requerimientos del PDF
Se identificaron 4 incumplimientos (ver sección **Tareas pendientes** abajo).

---

## Migraciones aplicadas esta sesión

| Versión | Script | Estado |
|---------|--------|--------|
| v3.36 | `notification-inbox-rls-policies.sql` | ✅ Aplicado |
| v3.37 | `missing-rls-policies.sql` | ✅ Aplicado |
| v3.38 | `match-period-totals-trigger.sql` | ✅ Aplicado |
| v3.39 | `acid-financial-guards.sql` | ✅ Aplicado |
| v3.40 | `match-extra-time.sql` | ✅ Aplicado |
| v3.41 | `user-league-pending-approval.sql` | ✅ Aplicado |
| v3.17–v3.33 | Backfill de entradas faltantes en MIGRATION_LOG | ✅ Aplicado |

---

## ⚠️ TAREAS PENDIENTES (próxima sesión)

### P1 — CRÍTICO: Plazo de predicciones incorrecto

**Requerimiento PDF:** cierre de predicciones 15 minutos antes de que **inicie** el partido.

**Bug actual:**  
`src/app/core/pages/prediction/preditcion-client/prediction-client.service.ts` línea 158:
```typescript
const minutesToEnd = (end.getTime() - now.getTime()) / 60000;
const canPredict = minutesToEnd > 15;  // ← usa end_time, debería ser start_time
```
Permite predecir durante los primeros 105 minutos del partido.

**Fix requerido:**
```typescript
const minutesUntilStart = (start.getTime() - now.getTime()) / 60000;
const canPredict = minutesUntilStart > 15;
```

**También afectado:** `supabase/functions/match-reminder/index.ts` líneas 16-17 y 24-25:
```typescript
// Actual (MALO): compara contra end_time
.gte('end_time', windowStart)
.lt('end_time', windowEnd)

// Correcto: comparar contra start_time
.gte('start_time', windowStart)
.lt('start_time', windowEnd)
```

Y el mensaje de la notificación dice "15 minutos para que termine" — debe decir "para que empiece".

También actualizar en `league-creation.service.ts` la regla almacenada:
```typescript
// Actual
value: '15_minutes_before_match_end'
// Correcto
value: '15_minutes_before_match_start'
```

---

### P2 — CRÍTICO: Nombre de equipo por usuario por liga

**Requerimiento PDF:** "Cada usuario deberá colocarle un nombre distintivo al equipo que forma parte de una liga."

**Estado actual:** `USER_LEAGUE` no tiene campo `team_name`. No existe ningún flujo para asignarlo.

**Fix requerido:**
1. Migración `v3.42-user-league-team-name.sql`:
   ```sql
   ALTER TABLE "USER_LEAGUE"
     ADD COLUMN IF NOT EXISTS team_name TEXT;
   ```
2. Pedir el nombre de equipo al usuario en el flujo de:
   - Aceptación de invitación (`/invite` — tras aprobación del admin, o antes de enviar la solicitud)
   - Unión por código (`join-league` component)
3. Mostrar `team_name` en tabla de posiciones (`standings`) y en predicciones.

---

### P3 — MEDIO: Unión por código omite aprobación del admin

**Requerimiento PDF:** el admin aprueba el ingreso de todos los usuarios.

**Bug actual:** `db/script/v3.35-fix-join-league-upsert.sql` (función `join_league_with_entry_fee`) hace `approval_status = 'approved'` directamente. Un usuario con el código de invitación entra sin revisión del admin.

**Fix requerido:**
1. Cambiar los dos `approval_status = 'approved'` de la función RPC a `'pending_approval'`.
2. Después del upsert, llamar `handle_join_approval_notification()` que notifique al dueño de la liga (patrón idéntico a `acceptMagicLink`).
3. Migración `v3.43-join-league-approval.sql`.
4. Frontend: en `join-league.service.ts`, tras `joinByCode` exitoso, mostrar mensaje "Solicitud enviada — el administrador debe aprobarla" en lugar de navegar directo a la liga.

---

### P4 — MEDIO: Búsqueda de liga por nombre

**Requerimiento PDF:** "unirse a la liga... desde el sistema propiamente buscando el nombre de su liga."

**Estado actual:** `join-league.service.ts` solo tiene `previewByCode` (por `invitation_code`). No existe búsqueda por nombre.

**Fix requerido:**
1. Agregar `searchByName(query: string)` en `join-league.service.ts`:
   ```typescript
   async searchByName(query: string): Promise<LeaguePreview[]> {
     const { data } = await this._db.client
       .from('LEAGUE')
       .select('league_id, name, buy_in_amount, status')
       .ilike('name', `%${query}%`)
       .eq('is_deleted', false)
       .neq('status', 'finished')
       .limit(10);
     return (data ?? []).map(...);
   }
   ```
2. Modificar el componente de unión a liga para ofrecer dos modos: **por código** y **por nombre**.
3. Proteger con RLS: solo ligas públicas (o con cierta configuración de visibilidad) deberían aparecer en la búsqueda. Evaluar si se necesita un campo `is_public` en LEAGUE.

---

## Estado del sistema al cierre de esta sesión

### Flujo de invitaciones (estado actual tras v3.41)

```
Admin envía invitación (sendToExistingUser / sendToAnonymous)
  ↓
Usuario recibe email con token
  ↓
Usuario hace clic → /invite?token=...
  ↓
acceptMagicLink() → USER_LEAGUE(approval_status='pending_approval')
  ↓
Admin recibe notificación 'participant_approval' en bandeja
  ↓
Admin aprueba → USER_LEAGUE(approval_status='approved') + notificación al usuario
Admin rechaza → USER_LEAGUE(is_deleted=true, approval_status='rejected') + notificación al usuario
```

⚠️ **Excepción actual**: unión por código directo (`join_league_with_entry_fee`) aún establece `approved` directamente → ver P3.

### Fase / Extra time (estado actual tras v3.40)

```
MATCH_PERIOD guardado → sync_match_totals_from_periods() → handle_match_extra_time()
  → Si empate + phase='regulation' + end_time alcanzado: end_time +30 min, phase='extra_time'
  → Si empate + phase='extra_time' + end_time alcanzado: phase='finished'
  → Angular recibe UPDATE via Realtime → match-scoreboard actualiza tag/badge
```

---

## Arquitectura de servicios actualizada

| Servicio | Propósito |
|----------|-----------|
| `SupabaseAuthService` | Auth, session logging, signals (3 bugs corregidos en v3.13) |
| `AuthFacade` | Proxy de SupabaseAuthService, `getInternalUserId()` |
| `InvitationService` | Invitaciones, `acceptMagicLink()` (pending_approval), `approveParticipant()`, `rejectParticipant()` |
| `NotificationInboxService` | NOTIFICATION_INBOX CRUD, tipos incluye `participant_approval` |
| `NotificationInboxComponent` | Bandeja inline con botones Aprobar/Rechazar para `participant_approval` |
| `JoinLeagueService` | Unión por código (⚠️ aún bypassa aprobación) |
| `LeagueCreationService` | Creación de ligas, invitaciones bulk, reglas |
| `PredictionClientService` | Contexto predicciones (⚠️ usa `end_time` en lugar de `start_time`) |
| `LeagueScoringService` | Evaluación idempotente, scoring 1pt/3pt, cierre de liga |
| `HomeRealtimeService` | MATCH + MATCH_PERIOD + TEAM Realtime |
| `WalletService` | WALLET balance, `deposit()`, `withdraw()` |

---

## Patrones importantes del proyecto

- **RLS default deny**: `relrowsecurity = true` + cero políticas = todo bloqueado para `authenticated`. Patrón confirmado en múltiples tablas (v3.36, v3.37).
- **`get_my_user_id()`**: helper que mapea `auth.uid()` → `USER.user_id` (integer). Usado en todas las políticas de usuario.
- **`has_permission('x:admin')`**: check de permisos de admin en políticas.
- **`SECURITY DEFINER`**: funciones que necesitan bypassar RLS (triggers, RPCs).
- **`approval_status`** en USER_LEAGUE: `'approved'` | `'pending_approval'` | `'rejected'` (CHECK constraint en v3.41).
- **`scored_at`** en MATCH: NULL = no evaluado. Guards de idempotencia en scoring y extra time.
- **Soft delete**: `is_deleted = true` + `deleted_at` + `deleted_by` en todas las tablas críticas.

---

## Rutas actuales

```
/home                              → Dashboard principal
/prediction/prediction-client/:id  → Predicciones del usuario
/league                            → CRUD ligas
/league/:id/standings              → Tabla de posiciones (Realtime)
/league/:id/schedule               → Partidos de la liga
/wallet/top-up                     → Recarga de saldo
/admin/migrations                  → Historial MIGRATION_LOG
/invite                            → Aceptar magic links (muestra 'pending_approval' tras v3.41)
/auth                              → Login / Registro
```
