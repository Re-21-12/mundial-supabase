import { Routes } from '@angular/router';

export const WORLD_LEAGUE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./world-league').then((m) => m.WorldLeaguePage),
  },
  {
    path: ':id',
    loadComponent: () => import('./world-league').then((m) => m.WorldLeaguePage),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./world-league').then((m) => m.WorldLeaguePage),
  },
  {
    path: ':id/detail',
    loadComponent: () => import('./world-league').then((m) => m.WorldLeaguePage),
  },
];