# 🏆 Mundial — Plataforma de Ligas y Predicciones FIFA 2026

Aplicación web para crear y gestionar ligas privadas de predicciones del Mundial FIFA 2026. Los usuarios se unen a ligas, predicen resultados de partidos, y compiten en un ranking en tiempo real con soporte para apuestas, tiempo extra y penales.

**Demo:** [mundial-supabase.vercel.app](https://mundial-supabase.vercel.app)

---

## Tabla de contenidos

1. [Stack tecnológico](#stack-tecnológico)
2. [Arquitectura](#arquitectura)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Variables de entorno](#variables-de-entorno)
5. [Base de datos](#base-de-datos)
6. [Edge Functions](#edge-functions)
7. [Sistema de roles y permisos](#sistema-de-roles-y-permisos)
8. [Flujo de un partido](#flujo-de-un-partido)
9. [Cómo correr el proyecto](#cómo-correr-el-proyecto)

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Angular 21 (standalone, signals, OnPush) |
| UI | PrimeNG 21 + Spartan-ng + Tailwind CSS 4 |
| Backend / DB | Supabase (PostgreSQL 15) |
| Auth | Supabase Auth (email, magic links, OAuth) |
| Realtime | Supabase Realtime (MATCH, MATCH_PERIOD) |
| Edge Functions | Deno (Supabase Functions) |
| Email | Resend API |
| CAPTCHA | Cloudflare Turnstile |
| Deploy | Vercel (frontend) + Supabase (backend) |
| Cron | pg_cron (cierre automático de partidos) |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTE (Angular 21)                 │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐ │
│  │  Páginas  │  │Servicios │  │  Signals / OnPush CD  │ │
│  │ (pages/) │  │ (core/)  │  │  (sin Zone.js)        │ │
│  └──────────┘  └──────────┘  └───────────────────────┘ │
│                       │                                  │
│              supabase-js v2 SDK                         │
└───────────────────────┼─────────────────────────────────┘
                        │  HTTPS / WSS
┌───────────────────────▼─────────────────────────────────┐
│                      SUPABASE                            │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ PostgreSQL  │  │    Auth      │  │   Realtime    │  │
│  │   + RLS     │  │   (JWT)      │  │ (websockets)  │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
│                                                         │
│  ┌─────────────────────┐  ┌──────────────────────────┐  │
│  │   Edge Functions    │  │       pg_cron            │  │
│  │  · match-reminder   │  │  · auto-close-matches    │  │
│  │  · send-invitation  │  │    (cada minuto)         │  │
│  └─────────────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Flujo de autenticación

```
Usuario → /auth → Supabase Auth → JWT con role + permissions
                                        │
                              Angular AuthFacade
                                        │
                           RLS en cada tabla de Postgres
```

El JWT incluye `user_role` y `permissions` en `app_metadata` (nunca en `user_metadata`, que es editable por el usuario). Las políticas RLS usan `get_my_user_id()` y `has_permission('permiso:accion')`.

---

## Estructura del proyecto

```
Mundial/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── pages/                    # Páginas completas de la app
│   │   │   │   ├── home/                 # Inicio con partidos del día
│   │   │   │   ├── prediction/           # Admin de predicciones
│   │   │   │   │   └── preditcion-client/  # Vista cliente: hacer predicciones
│   │   │   │   ├── league/               # Gestión de ligas
│   │   │   │   ├── match/                # Gestión de partidos (admin)
│   │   │   │   ├── match-scoreboard/     # Tabla de posiciones
│   │   │   │   ├── match-period/         # Períodos: 1T, 2T, TE, PEN (admin)
│   │   │   │   ├── invitaciones/         # Bandeja de invitaciones (cliente)
│   │   │   │   ├── aprobaciones/         # Aprobar miembros (dueño de liga)
│   │   │   │   ├── wallet/               # Billetera y transacciones
│   │   │   │   ├── mis-ligas/            # Mis ligas (vista cliente)
│   │   │   │   ├── mis-partidos/         # Mis partidos
│   │   │   │   ├── admin-bracket/        # Árbol de eliminación directa
│   │   │   │   └── ...                   # +30 páginas más
│   │   │   └── services/
│   │   │       └── supabase-service.ts   # Cliente Supabase singleton
│   │   │
│   │   ├── shared/
│   │   │   ├── features/
│   │   │   │   ├── auth/                 # AuthFacade, AuthGuard, AuthState
│   │   │   │   └── dynamic-form/         # Formulario genérico por configuración
│   │   │   ├── components/
│   │   │   │   ├── notification-inbox/   # Notificaciones en tiempo real
│   │   │   │   ├── my-invitations/       # Tarjetas de invitación pendiente
│   │   │   │   └── global-search/        # Búsqueda global
│   │   │   ├── layouts/
│   │   │   │   ├── layout.ts             # Shell principal con sidebar
│   │   │   │   └── header/               # Barra superior con wallet y notifs
│   │   │   └── utils/
│   │   │       └── enums/permissions.ts  # Enums de permisos
│   │   │
│   │   ├── theme/
│   │   │   └── mundial-preset.ts         # Tema personalizado PrimeNG
│   │   ├── app.routes.ts                 # Rutas (lazy loading)
│   │   └── app.config.ts                 # Providers globales
│   │
│   ├── environments/
│   │   ├── environment.ts                # Dev (localhost) — archivo base
│   │   ├── environment.dev.ts            # Dev explícito
│   │   └── environment.prod.ts           # Producción (Vercel)
│   └── styles.css                        # Estilos globales + Tailwind
│
├── db/
│   ├── script/                           # Migraciones versionadas v3.12 → v3.50
│   ├── security/
│   │   └── policies-dcl.sql             # Políticas RLS base (PREDICTION)
│   └── triggers/
│       └── functions.sql                 # Funciones de trigger
│
├── supabase/
│   └── functions/
│       ├── match-reminder/               # Aviso 15 min antes del partido
│       └── send-invitation-email/        # Envío de email de invitación
│
├── angular.json
├── package.json
└── Dockerfile
```

---

## Variables de entorno

### Frontend — `src/environments/`

Angular reemplaza `environment.ts` con el archivo correcto según el flag `--configuration` al compilar. **No hay archivos `.env`** en el frontend — todo va en estos archivos TypeScript.

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `production` | `boolean` | `false` en dev, `true` en prod |
| `supabaseUrl` | `string` | URL del proyecto Supabase (`https://<ref>.supabase.co`) |
| `supabaseKey` | `string` | Llave **pública** del proyecto (`sb_publishable_...`). Nunca usar `service_role` aquí |
| `dev` | `string` | URL base de la app (`http://localhost:4200` en dev) |
| `authRedirect` | `string` | Callback de OAuth y Magic Links. Debe coincidir con lo configurado en Supabase Auth |
| `turnstileSiteKey` | `string` | Clave pública de Cloudflare Turnstile para el CAPTCHA del login |

**Ejemplo `environment.ts` (desarrollo):**
```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://TU_REF.supabase.co',
  supabaseKey: 'sb_publishable_TU_LLAVE_PUBLICA',
  dev: 'http://localhost:4200',
  authRedirect: 'http://localhost:4200/auth/callback',
  turnstileSiteKey: 'TU_TURNSTILE_SITE_KEY',
};
```

Para cambiar el entorno al compilar:
```bash
ng build --configuration development   # usa environment.dev.ts
ng build --configuration production    # usa environment.prod.ts
```

---

### Edge Functions — Supabase Secrets

Las funciones Deno leen variables del entorno del servidor de Supabase. Se configuran en el Dashboard → **Project Settings → Edge Functions → Secrets**, o con la CLI:

```bash
supabase secrets set NOMBRE_VARIABLE=valor
```

| Secret | Función | Descripción |
|--------|---------|-------------|
| `SUPABASE_URL` | Ambas | URL del proyecto. **Auto-provisto** por Supabase, no requiere configuración manual |
| `SUPABASE_SERVICE_ROLE_KEY` | Ambas | Llave de servicio con acceso total (bypassea RLS). **Auto-provisto** por Supabase |
| `RESEND_API_KEY` | `send-invitation-email` | API key de [Resend](https://resend.com). Obtener en resend.com/api-keys |
| `RESEND_FROM` | `send-invitation-email` | Dirección "From" del email. Ej: `Mundial <noreply@tudominio.com>`. El dominio debe estar verificado en Resend |

> `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` son inyectados automáticamente en todas las Edge Functions de Supabase y **no necesitan configurarse manualmente**.

---

## Base de datos

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `USER` | Usuarios registrados (vinculado a `auth.users`) |
| `LEAGUE` | Ligas privadas con fase de grupos + eliminación directa |
| `USER_LEAGUE` | Membresía usuario–liga con estado de aprobación |
| `MATCH` | Partidos con `start_time`, `end_time`, `phase` |
| `MATCH_PERIOD` | Períodos por partido: 1T (90), 2T (91), TE (92), PEN (94) |
| `PREDICTION` | Predicción de marcador de cada usuario por partido |
| `PREDICTION_LOCK` | Registro de bloqueos de predicciones |
| `WALLET` | Billetera virtual por usuario |
| `TRANSACTION` | Historial de movimientos de billetera |
| `LEAGUE_REWARD` | Premio acumulado por liga (5% plataforma, 1% global) |
| `INVITATION` | Invitaciones enviadas a usuarios existentes o nuevos |
| `MAGIC_LINK` | Tokens de 48h para invitaciones a usuarios nuevos |
| `NOTIFICATION` | Notificaciones del sistema (match_reminder, prediction_locked, etc.) |
| `TEAM` | Equipos del Mundial FIFA 2026 (32 selecciones) |
| `GRUPO` | Grupos del torneo (A–L) |
| `TEAM_LEAGUE` | Tabla de posiciones por liga |
| `AUDIT_LOG` | Log de auditoría de cambios críticos |

### Fases de un partido (`MATCH.phase`)

```
regulation ──(empate + knockout)──► extra_time ──(sigue empatado)──► penalty ──► finished
     │                                                                                ▲
     └──────────────────(hay ganador o partido de grupos)──────────────────────────►─┘
```

| Fase | Duración | Cómo se cierra |
|------|----------|----------------|
| `regulation` | hasta `end_time` | Cron o trigger si hay ganador |
| `extra_time` | +30 min | Cron (si ganador) o → `penalty` (si empate) |
| `penalty` | +60 min buffer | Operador ingresa scores y setea `scored_at` |
| `finished` | — | Estado final |

El cron `auto_close_overdue_matches` corre cada minuto vía **pg_cron** y maneja las transiciones automáticas.

### Migraciones

Las migraciones están en `db/script/` y siguen el esquema de versiones `v3.XX-nombre.sql`. Se aplican manualmente en el SQL Editor de Supabase en orden ascendente.

Para ver el historial de migraciones aplicadas:
```sql
SELECT version, name, applied_at, status FROM "MIGRATION_LOG" ORDER BY version;
```

---

## Edge Functions

### `match-reminder`
- **Trigger:** pg_cron, cada minuto
- **Qué hace:** detecta partidos con `start_time` en los próximos 15–16 minutos y envía notificaciones in-app a todos los miembros activos de la liga para que hagan su predicción antes del cierre.
- **Variables:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (auto-provistas)

### `send-invitation-email`
- **Trigger:** llamada HTTP `POST` desde el frontend al invitar a alguien
- **Qué hace:** genera un email HTML vía Resend con:
  - **Usuario existente:** botón → `/invitaciones` para aceptar en la app
  - **Usuario nuevo:** botón → `/invite?token=...` con magic link de 48h para crear cuenta y aceptar la invitación automáticamente
- **Variables:** `RESEND_API_KEY`, `RESEND_FROM` (configurar manualmente)

---

## Sistema de roles y permisos

| Rol | Descripción |
|-----|-------------|
| `admin` | Acceso total: gestión de usuarios, ligas, partidos, premios, permisos |
| `client` | Usuario final: crea ligas, hace predicciones, gestiona su wallet |
| `support` | Soporte: lectura amplia de datos activos, sin escritura destructiva |

Los permisos son granulares por entidad y acción (`prediction:create`, `league:admin`, `match:read`, etc.) y se almacenan en `app_metadata` del JWT. El sidebar del layout filtra dinámicamente las rutas visibles según los permisos del usuario activo.

Las políticas RLS en Postgres verifican permisos en cada operación:
```sql
-- Ejemplo de política
USING (has_permission('league:admin'))
-- o para el propio recurso
USING (user_id = get_my_user_id())
```

---

## Flujo de un partido

```
1. Admin crea MATCH (start_time, end_time)
         ↓
2. Usuarios predicen marcadores (hasta start_time - 15 min)
         ↓
3. match-reminder notifica a los 15 min antes
         ↓
4. Predicciones se bloquean automáticamente a los 15 min
         ↓
5. El partido comienza → isLive en el frontend (signal reactivo)
         ↓
6. Operador ingresa goles en MATCH_PERIOD (1T, 2T)
         ↓
   ┌─────────────────────────────────┐
   │ ¿Hay ganador en regulation?     │
   │ SÍ → auto_close → "finished"   │
   │ NO (empate, knockout) →         │
   │   extra_time +30 min            │
   └──────────────┬──────────────────┘
                  ↓
   ┌─────────────────────────────────┐
   │ ¿Hay ganador en extra_time?     │
   │ SÍ → auto_close → "finished"   │
   │ NO → penalty +60 min buffer     │
   └──────────────┬──────────────────┘
                  ↓
7. Operador ingresa penales (MATCH_PERIOD catalog_id=94)
         ↓
8. Operador setea scored_at → trg_advance_bracket_winner
   determina ganador (penales) → report_winner()
   → winner avanza automáticamente en el bracket
         ↓
9. Sistema evalúa predicciones y distribuye premios de la liga
```

---

## Cómo correr el proyecto

### Prerrequisitos

- Node.js 22+
- npm 11+
- Cuenta en [Supabase](https://supabase.com) con un proyecto creado

### Instalación

```bash
git clone <repo>
cd Mundial
npm install
```

### Configurar entorno

Editar `src/environments/environment.ts` con los datos de tu proyecto Supabase:

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://TU_REF.supabase.co',
  supabaseKey: 'sb_publishable_TU_LLAVE_PUBLICA',
  dev: 'http://localhost:4200',
  authRedirect: 'http://localhost:4200/auth/callback',
  turnstileSiteKey: 'TU_TURNSTILE_SITE_KEY',
};
```

Agregar `http://localhost:4200/auth/callback` en Supabase → **Authentication → URL Configuration → Redirect URLs**.

### Aplicar migraciones

Ejecutar los scripts en orden en el SQL Editor de Supabase (Dashboard → SQL Editor):

```
db/script/script-ddl.sql
db/script/v3.20-mundial-schema.sql
db/script/v3.20-mundial-seed.sql
db/script/v3.21-stadium-images.sql
... (continuar en orden hasta v3.50)
```

### Configurar Edge Functions (opcional)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Autenticar y vincular proyecto
supabase login
supabase link --project-ref TU_REF

# Configurar secrets de email
supabase secrets set RESEND_API_KEY=re_TU_KEY
supabase secrets set "RESEND_FROM=Mundial <noreply@tudominio.com>"

# Deploy
supabase functions deploy match-reminder
supabase functions deploy send-invitation-email
```

### Correr en local

```bash
npm start
# Disponible en http://localhost:4200
```

### Build de producción

```bash
npm run build:prod
# Output en dist/mundial/
```

### Deploy en Vercel

```bash
vercel --prod
```

Asegurarse de actualizar `src/environments/environment.prod.ts` con la URL de Vercel y agregarla como Redirect URL en Supabase Auth.
