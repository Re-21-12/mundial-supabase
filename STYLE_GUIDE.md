# Style Guide — Mundial

Este documento resume las convenciones y buenas prácticas que deben seguirse en el repositorio `mundial`.
Está pensado para ser conciso y práctico; si algo no aplica por contexto, abrir una PR y discutirla.

## Principios generales

- Priorizar claridad y simplicidad: el código debe ser fácil de leer y mantener.
- Prefiere APIs modernas de Angular (signals, `inject()`, `computed`, `effect`).
- Sigue las pautas de accesibilidad (WCAG AA) y pasar verificaciones AXE.

## Angular — Componentes y arquitectura

- Preferir componentes `standalone` para nuevas piezas y librerías pequeñas.
- Usar `inject()` en servicios y fábricas cuando sea adecuado en lugar de inyectar por constructor.
- Mantener componentes con una única responsabilidad; dividir cuando crezcan.
- Plantillas: usar control flow nativo (`@if`, `@for`, `@switch`) cuando esté disponible.
- Imágenes estáticas: usar `NgOptimizedImage` cuando sea posible.

## Signals y reactividad

- Usar `signal()` para estado local y `computed()` para valores derivados.
- Evitar efectos colaterales dentro de `computed`; usar `effect()` para tareas secundarias.
- Mantener transformaciones puras; evitar mutaciones inesperadas.

Ejemplo básico:

```ts
import { signal, computed, effect } from '@angular/core';

const count = signal(0);
const doubled = computed(() => count() * 2);

effect(() => {
  console.log('doubled:', doubled());
});
```

## Subscriptions / limpieza (takeUntilDestroyed)

- Usar `DestroyRef` + `takeUntilDestroyed` desde `@angular/core/rxjs-interop` en componentes y servicios con `inject()`.
- Evitar `Subject + takeUntil` y `OnDestroy` manual cuando `takeUntilDestroyed` es aplicable.

Ejemplo:

```ts
import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

const destroyRef = inject(DestroyRef);
interval(30000)
  .pipe(takeUntilDestroyed(destroyRef))
  .subscribe(() => {
    /* tarea periódica */
  });
```

## Autenticación (Supabase)

- Centralizar la lógica de sesión en `SupabaseAuthService`.
- Evitar llamadas remotas por navegación (no llamar `getUser()` en cada guard); preferir la sesión cacheada y un único intento de `refreshSession()` como fallback.
- Implementar `ensureActiveSession()` para comprobar la sesión antes de operaciones sensibles; si falla, cerrar sesión y redirigir al login.
- Temporalmente verificar sesión en `Layout` cada 5 minutos para evitar estados colgados.

Patrón recomendado en guardas de ruta:

1. Comprobar sesión local (signal / valor cacheado).
2. Si no existe, intentar `refreshSession()` una vez.
3. Si sigue sin sesión, redirigir a `/login`.

## Realtime / canales

- Gestionar el ciclo de vida del canal: subscribe → escuchar eventos → unsubscribe en destroy.
- Evitar re-suscribir múltiples veces; proteger con un flag o logica idempotente.

## Accesos y permisos

- Filtrar datos en el backend siempre que sea posible.
- En el frontend, validar que el usuario sólo vea recursos a los que está suscrito (por ejemplo, sólo partidos de ligas donde tiene `USER_LEAGUE`).

## Pruebas y QA

- Todas las PRs relevantes deben incluir pruebas unitarias o e2e cuando afecten lógica de negocio.
- Ejecutar linters y tests antes de abrir PR: `npm run lint` y `npm test`.

## Estilo de código y herramientas

- TypeScript con `strict` habilitado.
- ESLint + Prettier. Ejecutar formateo antes de commit.
- Seguir reglas de naming camelCase para variables y functions, PascalCase para clases y componentes.

## Commits y Pull Requests

- Usar Conventional Commits:
  - `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- PR checklist mínima:
  - Lint pasado
  - Tests verdes (cuando aplique)
  - Descripción clara del cambio
  - Referencia a `ISSUES_INTERNAL.md` si corresponde

## Accesibilidad

- Usar roles ARIA adecuados y gestión de focus.
- Asegurarse de que componentes interactivos sean navegables por teclado.

## Rendimiento

- Evitar operaciones costosas en el hilo principal; usar paginación y carga perezosa para listas grandes.
- Preferir cambio `OnPush` para componentes con inputs inmutables o señales.

## Convenciones específicas del repo

- `SupabaseAuthService` debe exponer: `session`, `isLoggedIn`, `currentUser()` y `ensureActiveSession()`.
- Guards: preferir `waitForAuthReady()` + sesión cacheada, no llamadas remotas por navegación.
- Uso consistente de `takeUntilDestroyed` en componentes migrados.

## Recursos y enlaces

- Archivo de issues interno: `ISSUES_INTERNAL.md`
- Código de ejemplo adicional: revisar `src/app/shared/layouts/layout.ts` y `src/app/core/services/supabase-auth-service.ts` como referencia de patrones aplicados.

---

Si quieres que añada este `STYLE_GUIDE.md` al `README.md` o que abra PRs con estas convenciones, dime y lo hago.
