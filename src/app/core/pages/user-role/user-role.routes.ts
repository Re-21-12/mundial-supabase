import { Routes } from '@angular/router';

export const USER_ROLE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./user-role').then((m) => m.UserRolePage),
  },
  {
    path: ':id',
    loadComponent: () => import('./user-role').then((m) => m.UserRolePage),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./user-role').then((m) => m.UserRolePage),
  },
  {
    path: ':id/detail',
    loadComponent: () => import('./user-role').then((m) => m.UserRolePage),
  },
];
