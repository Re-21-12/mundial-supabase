import { Routes } from '@angular/router';
import { PERMISSIONS } from '../../../shared/utils/enums/permissions';
import { authGuard } from '../../../shared/features/auth/guard/auth-guard';
// ── Vistas cliente (solo lectura, filtradas por RLS) ─────────────────────

export const CLIENT_ROUTES: Routes = [
  {
    path: 'prediction-client',
    title: 'Predicciones',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../client/preditcion-client/preditcion-client-list').then(
        (m) => m.PreditcionClientList,
      ),
  },
  {
    path: 'aprobaciones',
    title: 'Aprobaciones',
    data: {
      description: 'Solicitudes de ingreso de tus ligas',
      icon: 'lucideShield',
    },
    loadComponent: () =>
      import('../client/aprobaciones/aprobaciones').then((m) => m.AprobacionesPage),
  },
  {
    path: 'mis-ligas',
    title: 'Mis Ligas',
    data: {
      description: 'Ligas a las que perteneces',
      icon: 'lucideTrophy',
      requiredPermission: PERMISSIONS.LEAGUE.READ,
    },
    loadComponent: () => import('../client/mis-ligas/mis-ligas').then((m) => m.MisLigasPage),
  },
  {
    path: 'mis-grupos',
    title: 'Mis Grupos',
    data: {
      description: 'Grupos de tus ligas',
      icon: 'lucideUsers',
      requiredPermission: PERMISSIONS.LEAGUE.READ,
    },
    loadComponent: () => import('../client/mis-grupos/mis-grupos').then((m) => m.MisGruposPage),
  },
  {
    path: 'mis-equipos',
    title: 'Mis Equipos',
    data: {
      description: 'Equipos en tus ligas',
      icon: 'lucideUsers',
      requiredPermission: PERMISSIONS.TEAM.READ,
    },
    loadComponent: () => import('../client/mis-equipos/mis-equipos').then((m) => m.MisEquiposPage),
  },
  {
    path: 'mis-estadios',
    title: 'Mis Estadios',
    data: {
      description: 'Estadios de tus ligas',
      icon: 'lucideMapPin',
      requiredPermission: PERMISSIONS.STADIUM.READ,
    },
    loadChildren: () =>
      import('../client/mis-estadios/mis-estadios').then((m) => m.MisEstadiosPage),
  },
  {
    path: 'team-league',
    title: 'Team League',
    data: {
      description: 'Equipos asignados por liga',
      icon: 'lucideShield',
      requiredPermission: PERMISSIONS.TEAM_LEAGUE.READ,
      isAdmin: true,
    },
    loadChildren: () =>
      import('../client/team-league/team-league.routes').then((m) => m.TEAM_LEAGUE_ROUTES),
  },
  {
    path: 'mis-transacciones',
    title: 'Mis Transacciones',
    data: {
      description: 'Historial de movimientos',
      icon: 'lucideWallet',
      requiredPermission: PERMISSIONS.TRANSACTION.READ,
    },
    loadComponent: () =>
      import('../client/mis-transacciones/mis-transacciones').then((m) => m.MisTransaccionesPage),
  },
  {
    path: 'mis-partidos',
    title: 'Mis Partidos',
    data: {
      description: 'Partidos de mis ligas',
      icon: 'lucideSliders',
      requiredPermission: PERMISSIONS.MATCH.READ,
    },
    loadComponent: () =>
      import('../client/mis-partidos/mis-partidos').then((m) => m.MisPartidosPage),
  },
];
