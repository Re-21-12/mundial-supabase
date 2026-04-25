import { Routes } from '@angular/router';

export const ROLE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./role').then((m) => m.RolePage),
  },
  {
    path: ':id',
    loadComponent: () => import('./role').then((m) => m.RolePage),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./role').then((m) => m.RolePage),
  },
  {
    path: ':id/detail',
    loadComponent: () => import('./role').then((m) => m.RolePage),
  },
];