import { Routes } from '@angular/router';

export const LEAGUE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./league').then((m) => m.LeaguePage),
  },
  {
    path: ':id',
    loadComponent: () => import('./league').then((m) => m.LeaguePage),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./league').then((m) => m.LeaguePage),
  },
  {
    path: ':id/detail',
    loadComponent: () => import('./league').then((m) => m.LeaguePage),
  },
  {
    path: ':id/standings',
    title: 'Posiciones',
    loadComponent: () => import('./standings/standings').then((m) => m.StandingsPage),
  },
  {
    path: ':id/schedule',
    title: 'Calendario',
    loadComponent: () => import('./schedule/schedule').then((m) => m.SchedulePage),
  },
];