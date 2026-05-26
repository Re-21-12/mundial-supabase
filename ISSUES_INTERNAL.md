# Issues internos de fixes

Este archivo sirve como control operativo de fixes aplicados en desarrollo.

## Convencion

- Estado: `open`, `in-progress`, `resolved`, `closed`
- Severidad: `low`, `medium`, `high`, `critical`

## Registro

| ID                | Fecha      | Estado   | Severidad | Area             | Descripcion                                                                                                                           | Archivos                                                                                                                                      | Validacion                                                                                |
| ----------------- | ---------- | -------- | --------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| FIX-2026-05-24-01 | 2026-05-24 | resolved | low       | Auth UX          | Integrar notificaciones en seleccion de proveedor y modo del overlay de autenticacion.                                                | `src/app/shared/layouts/auth-overlay/auth-overlay.ts`                                                                                         | Compila sin errores de editor.                                                            |
| FIX-2026-05-24-02 | 2026-05-24 | resolved | high      | Match access     | Restringir ligas visibles y carga de partidos a ligas en las que el cliente esta unido.                                               | `src/app/core/pages/match-scoreboard/match-scoreboard.ts`                                                                                     | Flujo validado con filtro por `USER_LEAGUE` y guard en `onLeagueChange`.                  |
| FIX-2026-05-25-03 | 2026-05-25 | resolved | high      | Routing/Auth     | Evitar bloqueo de navegacion por llamada remota en `authGuard` al cambiar ruta despues de inactividad.                                | `src/app/shared/features/auth/guard/auth-guard.ts`                                                                                            | Diagnostico de editor sin errores; guard usa cache local + fallback de refresh.           |
| FIX-2026-05-25-04 | 2026-05-25 | resolved | high      | Session/Auth     | Si expira el refresh token, forzar cierre de sesion local y redireccion; en profile validar sesion activa antes de cargar datos.      | `src/app/core/services/supabase-auth-service.ts`, `src/app/shared/features/auth/guard/auth-guard.ts`, `src/app/core/pages/profile/profile.ts` | Diagnostico de editor sin errores en los tres archivos modificados.                       |
| FIX-2026-05-25-05 | 2026-05-25 | resolved | medium    | Session/Auth     | Agregar timer preventivo en layout autenticado para verificar/renovar sesion cada 5 minutos y forzar logout si la sesion ya expiro.   | `src/app/shared/layouts/layout.ts`                                                                                                            | Diagnostico de editor sin errores en el archivo modificado.                               |
| FIX-2026-05-25-06 | 2026-05-25 | resolved | low       | Code Quality     | Migrar suscripciones restantes en `src/app` de `Subject + takeUntil + OnDestroy` a `takeUntilDestroyed` para limpieza y consistencia. | `src/app/shared/components/notification-inbox/notification-inbox.component.ts`                                                                | Diagnostico de editor sin errores y busqueda global sin patrones legacy en `src/app`.     |
| FIX-2026-05-25-07 | 2026-05-25 | resolved | high      | Match visibility | En Home, limitar partidos visibles (hero/grid/calendario) solo a `MATCH.league_id` de ligas donde el usuario esta inscrito.           | `src/app/core/pages/home/home.ts`                                                                                                             | Diagnostico de editor sin errores; `carouselMatches` ahora filtra por `allowedLeagueIds`. |

## Plantilla para siguientes fixes

Copiar y completar una nueva fila en el registro:

`| FIX-YYYY-MM-DD-NN | YYYY-MM-DD | open | medium | Area | Descripcion corta | rutas/modulos | como se valido |`
