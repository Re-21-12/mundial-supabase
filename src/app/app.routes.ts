import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/layouts/layout';
import { authGuard } from './shared/features/auth/guard/auth-guard';
import { PERMISSIONS } from './shared/utils/enums/permissions';

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
    path: 'auth/callback',
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
    children: [
      {
        path: 'profile',
        title: 'Profile',
        data: {
          description: 'Tu perfil de usuario',
          icon: 'lucideUser',
          // requiredPermission: PERMISSIONS.USER.READ,
        },
        loadComponent: () => import('./core/pages/profile/profile').then((m) => m.ProfilePage),
      },
      {
        path: 'home',
        title: 'Home',
        data: {
          description: 'Welcome to the home page',
          icon: 'lucideHome',
          publicRoute: true,
        },
        loadComponent: () => import('./core/pages/home/home').then((m) => m.Home),
      },
      {
        path: 'taste',
        title: 'Taste',
        data: {
          description: 'Discover new flavors',
          icon: 'lucideHeart',
          requiredPermission: PERMISSIONS.LEAGUE.READ,
        },
        loadComponent: () => import('./core/pages/taste/taste').then((m) => m.Taste),
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
        loadComponent: () => import('./core/pages/teams/teams').then((m) => m.Teams),
      },
      {
        path: 'catalog',
        title: 'Catalog',
        data: {
          description: 'List of catalogs',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.CATALOG.READ,
        },
        loadComponent: () => import('./core/pages/catalog/catalog').then((m) => m.Catalog),
      },
      {
        path: 'stadium',
        title: 'Stadium',
        data: {
          description: 'List of stadiums',
          icon: 'lucideMapPin',
          requiredPermission: PERMISSIONS.STADIUM.READ,
        },
        loadComponent: () => import('./core/pages/stadium/stadium').then((m) => m.Stadium),
      },
      {
        path: 'audit-log',
        title: 'Audit Log',
        data: {
          description: 'List of audit log',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.AUDIT_LOG.READ,
        },
        loadComponent: () => import('./core/pages/audit-log/audit-log').then((m) => m.AuditLogPage),
      },
      {
        path: 'invitation',
        title: 'Invitation',
        data: {
          description: 'List of invitation',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.INVITATION.READ,
        },
        loadComponent: () => import('./core/pages/invitation/invitation').then((m) => m.InvitationPage),
      },
      {
        path: 'league',
        title: 'League',
        data: {
          description: 'List of league',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.LEAGUE.READ,
        },
        loadComponent: () => import('./core/pages/league/league').then((m) => m.LeaguePage),
      },
      {
        path: 'league-reward',
        title: 'League Reward',
        data: {
          description: 'List of league reward',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.LEAGUE_REWARD.READ,
        },
        loadComponent: () => import('./core/pages/league-reward/league-reward').then((m) => m.LeagueRewardPage),
      },
      {
        path: 'match',
        title: 'Match',
        data: {
          description: 'List of match',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.MATCH.READ,
        },
        loadComponent: () => import('./core/pages/match/match').then((m) => m.MatchPage),
      },
      {
        path: 'match-period',
        title: 'Match Period',
        data: {
          description: 'List of match period',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.MATCH_PERIOD.READ,
        },
        loadComponent: () => import('./core/pages/match-period/match-period').then((m) => m.MatchPeriodPage),
      },
      {
        path: 'permission',
        title: 'Permission',
        data: {
          description: 'List of permission',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.PERMISSION.READ,
        },
        loadComponent: () => import('./core/pages/permission/permission').then((m) => m.PermissionPage),
      },
      {
        path: 'prediction',
        title: 'Prediction',
        data: {
          description: 'List of prediction',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.PREDICTION.READ,
        },
        loadComponent: () => import('./core/pages/prediction/prediction').then((m) => m.PredictionPage),
      },
      {
        path: 'role',
        title: 'Role',
        data: {
          description: 'List of role',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.ROLE.READ,
        },
        loadComponent: () => import('./core/pages/role/role').then((m) => m.RolePage),
      },
      {
        path: 'role-permission',
        title: 'Role Permission',
        data: {
          description: 'List of role permission',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.ROLE_PERMISSION.READ,
        },
        loadComponent: () => import('./core/pages/role-permission/role-permission').then((m) => m.RolePermissionPage),
      },
      {
        path: 'rules-league',
        title: 'Rules League',
        data: {
          description: 'List of rules league',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.RULES_LEAGUE.READ,
        },
        loadComponent: () => import('./core/pages/rules-league/rules-league').then((m) => m.RulesLeaguePage),
      },
      {
        path: 'transaction',
        title: 'Transaction',
        data: {
          description: 'List of transaction',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.TRANSACTION.READ,
        },
        loadComponent: () => import('./core/pages/transaction/transaction').then((m) => m.TransactionPage),
      },
      {
        path: 'user',
        title: 'User',
        data: {
          description: 'List of user',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.USER.READ,
        },
        loadComponent: () => import('./core/pages/user/user').then((m) => m.UserPage),
      },
      {
        path: 'user-league',
        title: 'User League',
        data: {
          description: 'List of user league',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.USER_LEAGUE.READ,
        },
        loadComponent: () => import('./core/pages/user-league/user-league').then((m) => m.UserLeaguePage),
      },
      {
        path: 'user-league-reward',
        title: 'User League Reward',
        data: {
          description: 'List of user league reward',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.USER_LEAGUE_REWARD.READ,
        },
        loadComponent: () => import('./core/pages/user-league-reward/user-league-reward').then((m) => m.UserLeagueRewardPage),
      },
      {
        path: 'user-role',
        title: 'User Role',
        data: {
          description: 'List of user role',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.USER_ROLE.READ,
        },
        loadComponent: () => import('./core/pages/user-role/user-role').then((m) => m.UserRolePage),
      },
      {
        path: 'user-session',
        title: 'User Session',
        data: {
          description: 'List of user session',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.USER_SESSION.READ,
        },
        loadComponent: () => import('./core/pages/user-session/user-session').then((m) => m.UserSessionPage),
      },
      {
        path: 'wallet',
        title: 'Wallet',
        data: {
          description: 'List of wallet',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.WALLET.READ,
        },
        loadComponent: () => import('./core/pages/wallet/wallet').then((m) => m.WalletPage),
      },
      {
        path: 'world-league',
        title: 'World League',
        data: {
          description: 'List of world league',
          icon: 'lucideDatabase',
          requiredPermission: PERMISSIONS.WORLD_LEAGUE.READ,
        },
        loadComponent: () => import('./core/pages/world-league/world-league').then((m) => m.WorldLeaguePage),
      },
    ],
  },
];


