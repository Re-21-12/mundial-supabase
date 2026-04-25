import { Routes } from '@angular/router';

export const TEAMS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./teams').then((m) => m.Teams),
  },
  {
    path: ':id',
    loadComponent: () => import('./teams').then((m) => m.Teams),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./teams').then((m) => m.Teams),
  },
  {
    path: ':id/detail',
    loadComponent: () => import('./teams').then((m) => m.Teams),
  },
];