import { Routes } from '@angular/router';

export const USER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./user').then((m) => m.UserPage),
  },
  {
    path: ':id',
    loadComponent: () => import('./user').then((m) => m.UserPage),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./user').then((m) => m.UserPage),
  },
  {
    path: ':id/detail',
    loadComponent: () => import('./user').then((m) => m.UserPage),
  },
];