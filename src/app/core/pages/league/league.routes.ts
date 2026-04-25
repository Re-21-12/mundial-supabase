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
];