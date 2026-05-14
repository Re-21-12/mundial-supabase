# SESSION CONTEXT — v3.10 (2026-05-13)

## Stack
- Angular 18 (signals, OnPush, standalone, `input()`)
- Supabase (Auth, Postgres, Realtime, Edge Functions, RLS, RPC)
- Supabase project ID: `mwflkwazlhvrtckbbkpi`
- URL: `https://mwflkwazlhvrtckbbkpi.supabase.co`
- TailwindCSS + SpartanNG + PrimeNG

---

## PRs pendientes de merge (al cerrar sesión)

| PR | Rama | Descripción |
|----|------|-------------|
| #28 | `feature/user-admin-backoffice` | User backoffice + join-by-code + home CTA buttons |
| #29 | `fix/session-signout-logging` | Fix UPDATE sign_out en USER_SESSION al cerrar sesión |

---

## Bug de sesión — FIX aplicado en PR #29

**Problema raíz:** `logSessionEnd()` hacía INSERT con un nuevo `uuidv4()` en vez de UPDATE al registro creado en `logSessionStart()`. Además, el handler `SIGNED_OUT` lo llamaba después de limpiar el estado (internalUserId = null).

**Fix:**
- `logSessionStart()` guarda el `session_id` en `this.activeSessionId`
- `logSessionEnd()` hace `UPDATE USER_SESSION SET sign_out = now() WHERE session_id = activeSessionId`
- Eliminada la llamada duplicada en el handler `SIGNED_OUT`

---

## Arquitectura actual de servicios

| Servicio | Propósito |
|----------|-----------|
| `SupabaseAuthService` | Auth, session logging, signals |
| `AuthFacade` | Proxy de SupabaseAuthService |
| `ProfileService` | USER + WALLET por userId |
| `SearchService` | RPC `fn_global_search` |
| `StandingsService` | USER_LEAGUE + Realtime |
| `ScheduleService` | MATCH + TEAM join |
| `InvitationService` | INVITATION CRUD |
| `ApprovalService` | USER_LEAGUE.approval_status |
| `WalletService` | WALLET balance |
| `UserAdminService` | Backoffice: create/delete/reset via Edge Function |
| `JoinLeagueService` | Unirse a liga por invitation_code |
| `HomeRealtimeService` | MATCH + MATCH_PERIOD + TEAM Realtime |

---

## Edge Functions desplegadas

| Nombre | Propósito |
|--------|-----------|
| `admin-manage-user` | create / delete / reset_password vía service_role |

---

## Tablas clave y columnas relevantes

### USER
`user_id, login, name, email, password_hash, registration_date, status, uuid, is_deleted`

### USER_SESSION
`user_session_id, session_id, user_id, login, ip_address, user_agent, sign_in, sign_out, is_deleted`
- Sesión abierta = `sign_out IS NULL AND is_deleted = false`

### MATCH
`match_id, league_id, first_team_id, second_team_id, first_team_total, second_team_total, start_time, is_deleted`

### MATCH_PERIOD
`period_id, match_id, first_team_score, second_team_score`

### USER_LEAGUE
`user_league_id, user_id, league_id, accumulated_points, is_deleted`
- En Realtime publication ✅

### LEAGUE
`league_id, name, status, invitation_code, world_league_id, catalog_id, user_id, is_deleted`

### INVITATION
`invitation_id, email, league_id, user_league_id (nullable), invitation_type, token, status, expires_at`

### TS_USER (nueva en v3.10)
`ts_id, action, target_email, target_user_id, performed_by, performed_at, result, error_message`

### MIGRATION_LOG
`migration_id, version, name, description, script_path, applied_at, applied_by, status, checksum, execution_ms`

---

## Migraciones aplicadas (historial)

| Versión | Nombre | Descripción |
|---------|--------|-------------|
| v3.2.1 | fix_default_role_to_user | Trigger role fix |
| v3.3.0 | create_migration_log | MIGRATION_LOG + 10 entradas históricas |
| v3.4.0 | invitation_email_type | INVITATION schema |
| v3.5.0 | user_league_approval_status | USER_LEAGUE.approval_status |
| v3.6.0 | fn_global_search | RPC global search |
| v3.7.0 | standings_realtime | vw_league_standings + RANK() |
| v3.10.0 | ts_user_admin_log | TS_USER + fn_open_session_count |

---

## Rutas actuales

```
/home               → Home con Realtime MATCH + MATCH_PERIOD
/league             → CRUD ligas
/league/:id/standings → Tabla posiciones con Realtime
/league/:id/schedule  → Calendario de partidos
/prediction/:id     → Predicción de partido
/profile            → Perfil + wallet balance
/admin/users        → Backoffice usuarios
/invitation         → Gestión de invitaciones
/wallet             → Wallet CRUD
/user-session       → Sesiones (tabla genérica)
```

---

## Próxima sesión — Issue #30

### Rama a crear: `feature/v3.11-league-dashboard`

### Tareas prioritarias (en orden)

1. **Home: ligas activas del usuario**
   - Query: `USER_LEAGUE` join `LEAGUE` where `user_id = currentUser.id`
   - Cards con: nombre liga, posición actual, puntos

2. **Tournament bracket component**
   - Layout CSS puro de árbol de eliminatoria
   - Supabase Realtime canal `bracket-{league_id}` para actualizar en vivo
   - Se alimenta de los partidos del bracket (tabla MATCH filtrada por league_id)

3. **Variación en standings**
   - Necesita guardar la posición de la jornada anterior
   - Opción: columna `previous_rank` en `USER_LEAGUE` o tabla `USER_LEAGUE_SNAPSHOT`

4. **Simulador de partidos**
   - Leer `RULES_LEAGUE` por `league_id`
   - Calcular puntos según resultado vs predicción
   - UPDATE `accumulated_points` en `USER_LEAGUE` → dispara Realtime

5. **Seed de reglas** (`RULES_LEAGUE`)
   - Script SQL con valores por defecto

6. **Wallet — pantalla de carga**
   - Formulario: monto + método de pago (simulado)
   - INSERT en TRANSACTION + UPDATE WALLET.balance

7. **Email invitaciones**
   - Edge Function: send invite email vía Resend/SendGrid
   - Para existente: link con token
   - Para anónimo: magic link

8. **Pantalla MIGRATION_LOG**
   - `/admin/migrations` — tabla paginada de MIGRATION_LOG

---

## Notas de arquitectura para la siguiente sesión

- **Realtime**: MATCH, MATCH_PERIOD, USER_LEAGUE ya están en `supabase_realtime`
- **Auth**: `supabase-auth-service.ts` es la fuente de verdad, `AuthFacade` es el proxy
- **activeSessionId**: campo privado en `SupabaseAuthService` que rastrea la sesión activa para el UPDATE de sign_out
- **Edge Function `admin-manage-user`**: ya desplegada, requiere JWT válido (`verify_jwt: true`)
- **Linter**: agresivo — puede revertir cambios si una variable se declara y no se usa inmediatamente. Hacer edits en cadena rápida o escribir archivos completos con Write.
- **Commits**: siempre en feature branch → PR → merge. No pushear directo a main excepto hotfixes urgentes.
