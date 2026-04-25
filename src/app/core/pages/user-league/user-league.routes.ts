import { Routes } from '@angular/router';

export const USER_LEAGUE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./user-league').then((m) => m.UserLeaguePage),
  },
  {
    path: ':id',
    loadComponent: () => import('./user-league').then((m) => m.UserLeaguePage),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./user-league').then((m) => m.UserLeaguePage),
  },
  {
    path: ':id/detail',
    loadComponent: () => import('./user-league').then((m) => m.UserLeaguePage),
  },
];