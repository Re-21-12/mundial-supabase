import { Routes } from '@angular/router';
import { PERMISSIONS } from '../../../shared/utils/enums/permissions';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'admin/users',
    title: 'Usuarios',
    data: {
      description: 'Backoffice de usuarios',
      icon: 'lucideUserCog',
      requiredPermission: 'ADMIN',
      adminOnly: true,
    },
    loadChildren: () =>
      import('../admin/user-admin/user-admin.routes').then((m) => m.USER_ADMIN_ROUTES),
  },
  {
    path: 'admin/bracket',
    title: 'Bracket',
    data: {
      description: 'Asignar equipos al bracket eliminatorio',
      icon: 'lucideTrophy',
      requiredPermission: PERMISSIONS.BRACKET.UPDATE,
      adminOnly: true,
    },
    loadChildren: () =>
      import('../admin/admin-bracket/admin-bracket.routes').then((m) => m.ADMIN_BRACKET_ROUTES),
  },
  {
    path: 'admin/migrations',
    title: 'Migraciones DB',
    data: {
      description: 'Historial de migraciones de base de datos',
      icon: 'lucideSliders',
      requiredPermission: PERMISSIONS.ADMIN.READ,
      adminOnly: true,
    },
    loadChildren: () =>
      import('../admin/admin-migrations/admin-migrations.routes').then(
        (m) => m.ADMIN_MIGRATIONS_ROUTES,
      ),
  },
  {
    path: 'teams',
    title: 'Teams',
    data: {
      description: 'List of teams',
      icon: 'lucideUsers',
      requiredPermission: PERMISSIONS.TEAM.READ,
      adminOnly: true,
    },
    loadChildren: () => import('../admin/teams/teams.routes').then((m) => m.TEAMS_ROUTES),
  },
  {
    path: 'catalog',
    title: 'Catalog',
    data: {
      description: 'List of catalogs',
      icon: 'lucideDatabase',
      requiredPermission: PERMISSIONS.CATALOG.READ,
      adminOnly: true,
    },
    loadChildren: () => import('../admin/catalog/catalog.routes').then((m) => m.CATALOG_ROUTES),
  },
  {
    path: 'stadium',
    title: 'Stadium',
    data: {
      description: 'List of stadiums',
      icon: 'lucideMapPin',
      requiredPermission: PERMISSIONS.STADIUM.READ,
      adminOnly: true,
    },
    loadChildren: () => import('../admin/stadium/stadium.routes').then((m) => m.STADIUM_ROUTES),
  },
  {
    path: 'audit-log',
    title: 'Audit Log',
    data: {
      description: 'List of audit log',
      icon: 'lucideDatabase',
      requiredPermission: PERMISSIONS.AUDIT_LOG.READ,
      adminOnly: true,
    },
    loadChildren: () =>
      import('../admin/audit-log/audit-log.routes').then((m) => m.AUDIT_LOG_ROUTES),
  },
  {
    path: 'error-monitor',
    title: 'Error Monitor',
    data: {
      description: 'Registry of runtime and application errors',
      icon: 'lucideInfo',
      requiredPermission: PERMISSIONS.AUDIT_LOG.READ,
      adminOnly: true,
    },
    loadComponent: () =>
      import('../admin/error-monitor/error-monitor').then((m) => m.ErrorMonitorPage),
  },
  {
    path: 'invitation',
    title: 'Invitation',
    data: {
      description: 'List of invitation',
      icon: 'lucideDatabase',
      requiredPermission: PERMISSIONS.INVITATION.READ,
      adminOnly: true,
    },
    loadChildren: () =>
      import('../../pages/invitation/invitation.routes').then((m) => m.INVITATION_ROUTES),
  },
  {
    path: 'league-reward',
    title: 'League Reward',
    data: {
      description: 'List of league reward',
      icon: 'lucideDatabase',
      requiredPermission: PERMISSIONS.LEAGUE_REWARD.READ,
      adminOnly: true,
    },
    loadChildren: () =>
      import('../admin/league-reward/league-reward.routes').then((m) => m.LEAGUE_REWARD_ROUTES),
  },
  {
    path: 'match',
    title: 'Match',
    data: {
      description: 'List of match',
      icon: 'lucideDatabase',
      requiredPermission: PERMISSIONS.MATCH.READ,
      adminOnly: true,
    },
    loadChildren: () => import('../match/match.routes').then((m) => m.MATCH_ROUTES),
  },
  {
    path: 'match-scoreboard',
    title: 'Tablero de Marcadores',
    data: {
      description: 'Control de punteos por período',
      icon: 'lucideSliders',
      requiredPermission: PERMISSIONS.MATCH_PERIOD.UPDATE,
      adminOnly: true,
    },
    loadChildren: () =>
      import('../match-scoreboard/match-scoreboard.routes').then((m) => m.MATCH_SCOREBOARD_ROUTES),
  },
  {
    path: 'match-period',
    title: 'Match Period',
    data: {
      description: 'List of match period',
      icon: 'lucideDatabase',
      requiredPermission: PERMISSIONS.MATCH_PERIOD.READ,
      adminOnly: true,
    },
    loadChildren: () =>
      import('../admin/match-period/match-period.routes').then((m) => m.MATCH_PERIOD_ROUTES),
  },
  {
    path: 'permission',
    title: 'Permission',
    data: {
      description: 'List of permission',
      icon: 'lucideDatabase',
      requiredPermission: PERMISSIONS.PERMISSION.READ,
      adminOnly: true,
    },
    loadChildren: () =>
      import('../admin/permission/permission.routes').then((m) => m.PERMISSION_ROUTES),
  },
  {
    path: 'prediction',
    title: 'Prediction',
    data: {
      description: 'List of prediction',
      icon: 'lucideDatabase',
      requiredPermission: PERMISSIONS.PREDICTION.READ,
      adminOnly: true,
    },
    loadChildren: () =>
      import('../admin/prediction/prediction.routes').then((m) => m.PREDICTION_ROUTES),
  },
  {
    path: 'role',
    title: 'Role',
    data: {
      description: 'List of role',
      icon: 'lucideDatabase',
      requiredPermission: PERMISSIONS.ROLE.READ,
      adminOnly: true,
    },
    loadChildren: () => import('../admin/role/role.routes').then((m) => m.ROLE_ROUTES),
  },
  {
    path: 'role-permission',
    title: 'Role Permission',
    data: {
      description: 'List of role permission',
      icon: 'lucideDatabase',
      requiredPermission: PERMISSIONS.ROLE_PERMISSION.READ,
      adminOnly: true,
    },
    loadChildren: () =>
      import('../admin/role-permission/role-permission.routes').then(
        (m) => m.ROLE_PERMISSION_ROUTES,
      ),
  },
  {
    path: 'team-league',
    title: 'Team League',
    data: {
      description: 'Equipos asignados por liga',
      icon: 'lucideShield',
      requiredPermission: PERMISSIONS.TEAM_LEAGUE.READ,
      adminOnly: true,
    },
    loadChildren: () =>
      import('../client/team-league/team-league.routes').then((m) => m.TEAM_LEAGUE_ROUTES),
  },
  {
    path: 'rules-league',
    title: 'Rules League',
    data: {
      description: 'List of rules league',
      icon: 'lucideDatabase',
      requiredPermission: PERMISSIONS.RULES_LEAGUE.READ,
      adminOnly: true,
    },
    loadChildren: () =>
      import('./rules-league/rules-league.routes').then((m) => m.RULES_LEAGUE_ROUTES),
  },
  {
    path: 'transaction',
    title: 'Transaction',
    data: {
      description: 'List of transaction',
      icon: 'lucideDatabase',
      requiredPermission: PERMISSIONS.TRANSACTION.READ,
      adminOnly: true,
    },
    loadChildren: () =>
      import('../admin/transaction/transaction.routes').then((m) => m.TRANSACTION_ROUTES),
  },
  {
    path: 'user',
    title: 'User',
    data: {
      description: 'List of user',
      icon: 'lucideDatabase',
      requiredPermission: PERMISSIONS.USER.READ,
      adminOnly: true,
    },
    loadChildren: () => import('../admin/user/user.routes').then((m) => m.USER_ROUTES),
  },
  {
    path: 'user-league',
    title: 'User League',
    data: {
      description: 'List of user league',
      icon: 'lucideDatabase',
      requiredPermission: PERMISSIONS.USER_LEAGUE.READ,
      adminOnly: true,
    },
    loadChildren: () =>
      import('../../pages/user-league/user-league.routes').then((m) => m.USER_LEAGUE_ROUTES),
  },
  {
    path: 'user-league-reward',
    title: 'User League Reward',
    data: {
      description: 'List of user league reward',
      icon: 'lucideDatabase',
      requiredPermission: PERMISSIONS.USER_LEAGUE_REWARD.READ,
      adminOnly: true,
    },
    loadChildren: () =>
      import('../admin/user-league-reward/user-league-reward.routes').then(
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
      adminOnly: true,
    },
    loadChildren: () =>
      import('../admin/user-role/user-role.routes').then((m) => m.USER_ROLE_ROUTES),
  },
  {
    path: 'user-session',
    title: 'User Session',
    data: {
      description: 'List of user session',
      icon: 'lucideDatabase',
      requiredPermission: PERMISSIONS.USER_SESSION.READ,
      adminOnly: true,
    },
    loadChildren: () =>
      import('../admin/user-session/user-session.routes').then((m) => m.USER_SESSION_ROUTES),
  },
  {
    path: 'wallet',
    title: 'Wallet',
    data: {
      description: 'List of wallet',
      icon: 'lucideDatabase',
      requiredPermission: PERMISSIONS.WALLET.READ,
      adminOnly: true,
    },
    loadChildren: () => import('../admin/wallet/wallet.routes').then((m) => m.WALLET_ROUTES),
  },
  {
    path: 'world-league',
    title: 'World League',
    data: {
      description: 'List of world league',
      icon: 'lucideDatabase',
      requiredPermission: PERMISSIONS.WORLD_LEAGUE.READ,
      adminOnly: true,
    },
    loadChildren: () =>
      import('../world-league/world-league.routes').then((m) => m.WORLD_LEAGUE_ROUTES),
  },
];
