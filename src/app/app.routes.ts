import { Routes, ResolveFn } from '@angular/router';
import { LayoutComponent } from './shared/layouts/layout';
import { authGuard } from './shared/features/auth/guard/auth-guard';
import { PERMISSIONS } from './shared/utils/enums/permissions';
import { sessionResolver } from './shared/features/auth/session.resolver';

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
    path: 'auth/v1/callback',
    title: 'Auth Callback',
    loadComponent: () =>
      import('./shared/features/auth/callback/auth-callback').then((m) => m.AuthCallback),
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
    resolve: {
      // session: sessionResolver,
    },
    children: [
      {
        path: 'admin/users',
        title: 'Administrar Usuarios',
        data: {
          description: 'Backoffice de usuarios',
          icon: 'lucideUserCog',
          requiredPermission: 'ADMIN',
        },
        loadChildren: () =>
          import('./core/pages/user-admin/user-admin.routes').then((m) => m.USER_ADMIN_ROUTES),
      },
      {
        path: 'admin/migrations',
        title: 'Migraciones',
        data: {
          description: 'Historial de migraciones de base de datos',
          icon: 'lucideDatabase',
          requiredPermission: 'ADMIN',
        },
        loadChildren: () =>
          import('./core/pages/admin-migrations/admin-migrations.routes').then(
            (m) => m.ADMIN_MIGRATIONS_ROUTES,
          ),
      },
      {
        path: 'profile',
        title: 'Profile',
        data: {
          description: 'Tu perfil de usuario',
          icon: 'lucideUser',
          // requiredPermission: PERMISSIONS.USER.READ,
        },
        loadChildren: () =>
          import('./core/pages/profile/profile.routes').then((m) => m.PROFILE_ROUTES),
      },
      {
        path: 'home',
        title: 'Home',
        data: {
          description: 'Welcome to the home page',
          icon: 'lucideHome',
          publicRoute: true,
        },
        loadChildren: () => import('./core/pages/home/home.routes').then((m) => m.HOME_ROUTES),
      },
      {
        path: 'taste',
        title: 'Taste',
        data: {
          description: 'Discover new flavors',
          icon: 'lucideHeart',
          requiredPermission: PERMISSIONS.LEAGUE.READ,
        },
        loadChildren: () => import('./core/pages/taste/taste.routes').then((m) => m.TASTE_ROUTES),
      },
      {
        path: 'photo',
        title: 'Photo Gallery',
        data: {
          description: 'View our photo gallery',
          icon: 'lucideImage',
          requiredPermission: PERMISSIONS.USER.READ,
        },
        loadComponent: () =>
          import('./shared/features/camera/camera').then((m) => m.CameraComponent),
      },
      {
        path: 'ocr',
        title: 'OCR Scanner',
        data: {
          description: 'Scan and recognize text in images',
          icon: 'lucideImage',
          requiredPermission: PERMISSIONS.PREDICTION.READ,
        },
        loadComponent: () => import('./shared/features/ocr/ocr').then((m) => m.Ocr),
      },
      {
        path: 'page-error',
        title: 'Page Error',
        data: {
          description: 'An error occurred',
        },
        loadComponent: () =>
          import('./shared/features/page-error/page-error').then((m) => m.PageError),
      },
      {
        path: 'teams',
        title: 'Teams',
        data: {
          description: 'List of teams',
          icon: 'lucideUsers',
          requiredPermission: PERMISSIONS.TEAM.READ,
        },
        loadChildren: () => import('./core/pages/teams/teams.routes').then((m) => m.TEAMS_ROUTES),
      },
      {
        path: 'catalog',
        title: 'Catalog',
        data: {
          description: 'List of catalogs',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.CATALOG.READ,
        },
        loadChildren: () =>
          import('./core/pages/catalog/catalog.routes').then((m) => m.CATALOG_ROUTES),
      },
      {
        path: 'stadium',
        title: 'Stadium',
        data: {
          description: 'List of stadiums',
          icon: 'lucideMapPin',
          requiredPermission: PERMISSIONS.STADIUM.READ,
        },
        loadChildren: () =>
          import('./core/pages/stadium/stadium.routes').then((m) => m.STADIUM_ROUTES),
      },
      {
        path: 'audit-log',
        title: 'Audit Log',
        data: {
          description: 'List of audit log',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.AUDIT_LOG.READ,
        },
        loadChildren: () =>
          import('./core/pages/audit-log/audit-log.routes').then((m) => m.AUDIT_LOG_ROUTES),
      },
      {
        path: 'error-monitor',
        title: 'Error Monitor',
        data: {
          description: 'Registry of runtime and application errors',
          icon: 'lucideInfo',
          requiredPermission: PERMISSIONS.AUDIT_LOG.READ,
        },
        loadComponent: () =>
          import('./core/pages/error-monitor/error-monitor').then((m) => m.ErrorMonitorPage),
      },
      {
        path: 'invitation',
        title: 'Invitation',
        data: {
          description: 'List of invitation',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.INVITATION.READ,
        },
        loadChildren: () =>
          import('./core/pages/invitation/invitation.routes').then((m) => m.INVITATION_ROUTES),
      },
      {
        path: 'league',
        title: 'League',
        data: {
          description: 'List of league',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.LEAGUE.READ,
        },
        loadChildren: () =>
          import('./core/pages/league/league.routes').then((m) => m.LEAGUE_ROUTES),
      },
      {
        path: 'league-reward',
        title: 'League Reward',
        data: {
          description: 'List of league reward',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.LEAGUE_REWARD.READ,
        },
        loadChildren: () =>
          import('./core/pages/league-reward/league-reward.routes').then(
            (m) => m.LEAGUE_REWARD_ROUTES,
          ),
      },
      {
        path: 'match',
        title: 'Match',
        data: {
          description: 'List of match',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.MATCH.READ,
        },
        loadChildren: () => import('./core/pages/match/match.routes').then((m) => m.MATCH_ROUTES),
      },
      {
        path: 'match-period',
        title: 'Match Period',
        data: {
          description: 'List of match period',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.MATCH_PERIOD.READ,
        },
        loadChildren: () =>
          import('./core/pages/match-period/match-period.routes').then(
            (m) => m.MATCH_PERIOD_ROUTES,
          ),
      },
      {
        path: 'permission',
        title: 'Permission',
        data: {
          description: 'List of permission',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.PERMISSION.READ,
        },
        loadChildren: () =>
          import('./core/pages/permission/permission.routes').then((m) => m.PERMISSION_ROUTES),
      },
      {
        path: 'prediction',
        title: 'Prediction',
        data: {
          description: 'List of prediction',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.PREDICTION.READ,
        },
        loadChildren: () =>
          import('./core/pages/prediction/prediction.routes').then((m) => m.PREDICTION_ROUTES),
      },
      {
        path: 'role',
        title: 'Role',
        data: {
          description: 'List of role',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.ROLE.READ,
        },
        loadChildren: () => import('./core/pages/role/role.routes').then((m) => m.ROLE_ROUTES),
      },
      {
        path: 'role-permission',
        title: 'Role Permission',
        data: {
          description: 'List of role permission',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.ROLE_PERMISSION.READ,
        },
        loadChildren: () =>
          import('./core/pages/role-permission/role-permission.routes').then(
            (m) => m.ROLE_PERMISSION_ROUTES,
          ),
      },
      {
        path: 'rules-league',
        title: 'Rules League',
        data: {
          description: 'List of rules league',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.RULES_LEAGUE.READ,
        },
        loadChildren: () =>
          import('./core/pages/rules-league/rules-league.routes').then(
            (m) => m.RULES_LEAGUE_ROUTES,
          ),
      },
      {
        path: 'transaction',
        title: 'Transaction',
        data: {
          description: 'List of transaction',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.TRANSACTION.READ,
        },
        loadChildren: () =>
          import('./core/pages/transaction/transaction.routes').then((m) => m.TRANSACTION_ROUTES),
      },
      {
        path: 'user',
        title: 'User',
        data: {
          description: 'List of user',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.USER.READ,
        },
        loadChildren: () => import('./core/pages/user/user.routes').then((m) => m.USER_ROUTES),
      },
      {
        path: 'user-league',
        title: 'User League',
        data: {
          description: 'List of user league',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.USER_LEAGUE.READ,
        },
        loadChildren: () =>
          import('./core/pages/user-league/user-league.routes').then((m) => m.USER_LEAGUE_ROUTES),
      },
      {
        path: 'user-league-reward',
        title: 'User League Reward',
        data: {
          description: 'List of user league reward',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.USER_LEAGUE_REWARD.READ,
        },
        loadChildren: () =>
          import('./core/pages/user-league-reward/user-league-reward.routes').then(
            (m) => m.USER_LEAGUE_REWARD_ROUTES,
          ),
      },
      {
        path: 'user-role',
        title: 'User Role',
        data: {
          description: 'List of user role',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.USER_ROLE.READ,
        },
        loadChildren: () =>
          import('./core/pages/user-role/user-role.routes').then((m) => m.USER_ROLE_ROUTES),
      },
      {
        path: 'user-session',
        title: 'User Session',
        data: {
          description: 'List of user session',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.USER_SESSION.READ,
        },
        loadChildren: () =>
          import('./core/pages/user-session/user-session.routes').then(
            (m) => m.USER_SESSION_ROUTES,
          ),
      },
      {
        path: 'wallet',
        title: 'Wallet',
        data: {
          description: 'List of wallet',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.WALLET.READ,
        },
        loadChildren: () =>
          import('./core/pages/wallet/wallet.routes').then((m) => m.WALLET_ROUTES),
      },
      {
        path: 'wallet/top-up',
        title: 'Cargar saldo',
        data: {
          description: 'Recarga tu wallet',
          icon: 'lucideWallet',
        },
        loadChildren: () =>
          import('./core/pages/wallet-topup/wallet-topup.routes').then((m) => m.WALLET_TOPUP_ROUTES),
      },
      {
        path: 'world-league',
        title: 'World League',
        data: {
          description: 'List of world league',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.WORLD_LEAGUE.READ,
        },
        loadChildren: () =>
          import('./core/pages/world-league/world-league.routes').then(
            (m) => m.WORLD_LEAGUE_ROUTES,
          ),
      },
    ],
  },
];
