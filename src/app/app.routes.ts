import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/layouts/layout';
import { authGuard } from './shared/features/auth/guard/auth-guard';
import { ADMIN_ROUTES } from './core/pages/admin/admin.routes';

export const routes: Routes = [
  {
    path: 'sign-in',
    pathMatch: 'full',
    redirectTo: 'auth',
  },
  {
    path: 'auth',
    title: 'Authentication',
    loadComponent: () => import('./shared/features/auth/auth').then((m) => m.Auth),
  },
  {
    path: 'invite',
    title: 'Aceptar Invitación',
    loadComponent: () => import('./core/pages/invite/invite').then((m) => m.InvitePage),
  },
  {
    path: 'join',
    title: 'Unirse a liga',
    loadComponent: () =>
      import('./core/pages/league/join-by-code/join-by-code').then((m) => m.JoinByCodePage),
  },
  {
    path: 'league-preview/:id',
    title: 'Vista previa de liga',
    loadComponent: () =>
      import('./core/pages/league-preview/league-preview').then((m) => m.LeaguePreviewPage),
  },
  {
    path: 'prediction-client/:id',
    title: 'Predicción de partido',
    loadComponent: () =>
      import('../app/core/pages/client/preditcion-client/preditcion-client').then(
        (m) => m.PreditcionClient,
      ),
  },
  {
    path: 'auth/callback',
    title: 'Auth Callback',
    loadComponent: () =>
      import('./shared/features/auth/callback/auth-callback').then((m) => m.AuthCallback),
  },
  {
    path: 'auth/v1/callback',
    redirectTo: 'auth/callback',
    pathMatch: 'full',
  },
  {
    path: 'change-password',
    title: 'Recuperar Password',
    loadComponent: () =>
      import('./shared/features/auth/pages/change-password/change-password').then(
        (m) => m.ChangePasswordPage,
      ),
  },
  {
    path: 'set-password',
    title: 'Definir Nueva Password',
    loadComponent: () =>
      import('./shared/features/auth/pages/set-password/set-password').then(
        (m) => m.SetPasswordPage,
      ),
  },
  {
    path: 'login',
    pathMatch: 'full',
    redirectTo: 'auth',
  },
  {
    path: '',
    component: LayoutComponent,
    canActivateChild: [authGuard],
    children: [
      // ── Rutas cliente ──────────────────────────────────────────────────────
      {
        path: 'home',
        title: 'Home',
        data: { description: 'Welcome to the home page', icon: 'lucideHome', publicRoute: true },
        loadChildren: () => import('./core/pages/home/home.routes').then((m) => m.HOME_ROUTES),
      },
      {
        path: 'profile',
        title: 'Profile',
        data: { description: 'Tu perfil de usuario', icon: 'lucideUser' },
        loadChildren: () =>
          import('./core/pages/client/profile/profile.routes').then((m) => m.PROFILE_ROUTES),
      },
      {
        path: 'league',
        title: 'League',
        data: { description: 'Ligas', icon: 'lucideTrophy', hideFromSidebar: true },
        loadChildren: () =>
          import('./core/pages/league/league.routes').then((m) => m.LEAGUE_ROUTES),
      },
      {
        path: 'client',
        title: 'Mi Espacio',
        data: { description: 'Mis ligas, partidos y más', icon: 'lucideHome' },
        loadChildren: () =>
          import('./core/pages/client/client.routes').then((m) => m.CLIENT_ROUTES),
      },

      // ── Rutas admin (extraídas a admin.routes.ts) ─────────────────────────
      ...ADMIN_ROUTES,

      { path: '**', redirectTo: '/login' },
    ],
  },
];
