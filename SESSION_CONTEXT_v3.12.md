# SESSION CONTEXT — v3.12 (2026-05-20)

## Stack
- Angular 21 (signals, OnPush, standalone, `input()`, `resource()`, `effect()`)
- Supabase (Auth, Postgres, Realtime, Edge Functions, RLS)
- Supabase project ID: `mwflkwazlhvrtckbbkpi`
- URL: `https://mwflkwazlhvrtckbbkpi.supabase.co`
- TailwindCSS + PrimeNG
- MCP Supabase configurado en `.mcp.json` (activa al reiniciar sesión)

---

## Lo que se hizo en esta sesión

### 1. Bracket — Clasificación de grupos integrada
- `TournamentBracketComponent` ahora acepta `grupos = input<GrupoCard[]>([])`
- Importa y renderiza `WorldCupGroupsComponent` antes del bracket knockout
- Sección "Clasificación de Grupos" con título separado del scroll horizontal
- CSS: `.tb-grupos`, `.tb-grupos__title` en `tournament-bracket.css`
- `home.html` pasa `[grupos]="grupos()"` al `<app-tournament-bracket>`

### 2. Home — Selector de liga para bracket y fase de grupos
- `selectedLeagueId` signal controla qué liga se muestra
- `ngOnInit` auto-selecciona la primera liga del usuario: `await selectLeague(leagues[0].league_id)`
- `selectLeague(leagueId)` → setea signal + llama `realtimeService.loadMatchesForLeague(leagueId)`
- `leagueMatchCards` computed filtra `grupo_id !== null` (solo fase de grupos)
- `leagueMatchesLoading` computed desde el servicio

### 3. HomeRealtimeService — `loadMatchesForLeague`
- Nuevo signal `leagueMatches = signal<MatchRow[]>([])`
- Nuevo signal `leagueMatchesLoading = signal(false)`
- Método `loadMatchesForLeague(leagueId)`: query MATCH por league_id, ordered by start_time, limit 120

### 4. UserLeaguesService — grupos en LeagueDetail
- `LeagueDetail` extendido con `grupos: GrupoGroup[]`
- `loadLeagueDetail` hace 3 queries paralelos + fetch de GRUPO + GRUPO_STANDING por `world_league_id`
- Sort por position → points → goal_diff

### 5. Prediction Client — página completa
**Archivos nuevos:**
- `src/app/core/pages/prediction/preditcion-client/prediction-client.service.ts`
- `src/app/core/pages/prediction/preditcion-client/preditcion-client.ts` (reescrito completo)
- `src/app/core/pages/prediction/preditcion-client/preditcion-client.html` (reescrito completo)
- `src/app/core/pages/prediction/preditcion-client/preditcion-client.css` (reescrito completo)

**Flujo:**
1. Recibe `match_id` desde la ruta `/prediction/prediction-client/:id`
2. Carga: match → `league_id` → league info (`buy_in_amount`) + USER_LEAGUE del usuario + todos los partidos de la liga + predicciones del usuario
3. Muestra 3 secciones: partido seleccionado / próximos / finalizados
4. Cada partido es expandible → muestra `DynamicForm` inline con `predictionClientForm`
5. Liga de cobro (`buy_in_amount > 0`): incluye campo `wager_amount` en el form
6. Una sola predicción por partido: upsert (update si existe, insert si no)

**`predictionClientForm`** agregado a `forms.ts`:
- `first_team_score` (NUMBER, required, min 0)
- `second_team_score` (NUMBER, required, min 0)
- `wager_amount` (NUMBER, optional, min 0) — solo visible en ligas de cobro

### 6. Migraciones DB (⚠️ v3.24 pendiente de ejecutar)

| Script | Descripción | Estado |
|--------|-------------|--------|
| `v3.21-stadium-images.sql` | `logo_url` para 16 estadios WC2026 (Wikimedia Commons) | ✅ Ejecutado |
| `v3.22-match-replica-identity.sql` | `REPLICA IDENTITY FULL` en MATCH + MATCH_PERIOD | ✅ Ejecutado |
| `v3.23-fix-match-rounds.sql` | Corrige `round=NULL` para fase de grupos; borra knockouts corruptos de liga 4 | ✅ Ejecutado |
| `v3.24-prediction-wager.sql` | `buy_in_amount` en LEAGUE + `wager_amount` en PREDICTION | ⚠️ **PENDIENTE** |

**Ejecutar en Supabase SQL Editor:**
```sql
ALTER TABLE "LEAGUE"
  ADD COLUMN IF NOT EXISTS buy_in_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "PREDICTION"
  ADD COLUMN IF NOT EXISTS wager_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
```

### 7. BracketService — filtros corregidos
Filtros que estaban comentados en `_fetchKnockout` ahora activos:
```typescript
.not('round', 'is', null)
.is('grupo_id', null)
.eq('is_deleted', false)
```

### 8. database.types.ts actualizado
- `LEAGUE.Row/Insert/Update`: agregado `buy_in_amount: number`
- `PREDICTION.Row/Insert/Update`: agregado `wager_amount: number`

---

## Formato de datos WC2026 — importante

| Tipo | Condición en MATCH | Count |
|------|-------------------|-------|
| Fase de grupos | `round IS NULL`, `grupo_id IS NOT NULL` | 72 |
| Knockout (Dieciseisavos) | `round = 1`, `grupo_id IS NULL` | 16 |
| Knockout (Octavos) | `round = 2`, `grupo_id IS NULL` | 8 |
| Knockout (Cuartos) | `round = 3`, `grupo_id IS NULL` | 4 |
| Semifinal | `round = 4`, `grupo_id IS NULL` | 2 |
| Final + 3er Lugar | `round = 5`, `grupo_id IS NULL` | 2 |
| **Total** | | **104** |

**Bracket visual** — columna solo (`b-pair--single`) ocurre cuando una ronda tiene número impar de partidos activos. Verificar con:
```sql
SELECT league_id, round, COUNT(*) AS total,
  CASE WHEN COUNT(*) % 2 = 1 THEN '⚠️ IMPAR' ELSE 'OK' END AS parity
FROM "MATCH"
WHERE round IS NOT NULL AND grupo_id IS NULL AND is_deleted = false
GROUP BY league_id, round ORDER BY league_id, round;
```

---

## Arquitectura de servicios (completa)

| Servicio | Propósito |
|----------|-----------|
| `SupabaseAuthService` | Auth, session logging, signals |
| `AuthFacade` | Proxy de SupabaseAuthService, `getInternalUserId()` |
| `HomeRealtimeService` | MATCH + MATCH_PERIOD + TEAM Realtime + `loadMatchesForLeague()` |
| `UserLeaguesService` | Ligas del usuario + `loadLeagueDetail()` con grupos |
| `BracketService` | Bracket knockout, `getKnockoutBracket()`, `subscribe()`, `_initializeBracket()` |
| `PredictionClientService` | Contexto de predicciones por liga, upsert |
| `InvitationService` | INVITATION CRUD + send email Edge Function |
| `WalletService` | WALLET balance + `deposit()` |
| `StandingsService` | USER_LEAGUE + Realtime |

---

## Componentes compartidos

| Componente | Selector | Descripción |
|------------|----------|-------------|
| `TournamentBracketComponent` | `app-tournament-bracket` | Bracket knockout + grupos. Inputs: `leagueId` (required), `grupos` (optional) |
| `WorldCupGroupsComponent` | `app-world-cup-groups` | Grid de grupos A–L con tabla de standings. Input: `grupos` (required) |
| `WorldGlobeComponent` | `app-world-globe` | Globo 3D decorativo |
| `JoinLeagueComponent` | `app-join-league` | Dialog para unirse a liga por código |

---

## Rutas actuales

```
/home                              → Dashboard principal con ligas, partidos, bracket
/prediction/prediction-client/:id  → Predicciones del usuario para la liga del partido
/league                            → CRUD ligas
/league/:id/standings              → Tabla posiciones Realtime
/wallet/top-up                     → Recarga de saldo
/admin/migrations                  → Historial MIGRATION_LOG
/invite                            → Aceptar magic links de invitación
```

---

## Notas de arquitectura

- **MCP Supabase**: configurado en `.mcp.json` como servidor HTTP (`https://mcp.supabase.com/mcp`). Solo carga al iniciar nueva sesión de Claude Code.
- **`resource()` API**: usado en `TournamentBracketComponent` para fetch con auto-reload. Params reactivo = `leagueId()`.
- **`effect(onCleanup)`**: patrón para Realtime subscriptions — la limpieza desuscribe el canal anterior cuando cambia `leagueId`.
- **Realtime MATCH**: requiere `REPLICA IDENTITY FULL` (v3.22) para que filtros de canal funcionen en UPDATE/DELETE.
- **`_initializeBracket`**: solo corre si `matches.length === 0` para la liga. Crea 32 shells (rounds 1-5). Race condition posible si dos tabs cargan simultáneamente.
- **`GrupoCard` / `GrupoTeam`**: tipos en `home.models.ts`. Usado por `WorldCupGroupsComponent` y `TournamentBracketComponent`.
- **Prediction upsert**: service verifica existencia con `maybeSingle()` antes de decidir INSERT vs UPDATE.
- **Ligas de cobro**: `buy_in_amount > 0` en LEAGUE → muestra campo `wager_amount` en prediction form.
