import { Routes } from '@angular/router';

export const PERMISSION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./permission').then((m) => m.PermissionPage),
  },
  {
    path: ':id',
    loadComponent: () => import('./permission').then((m) => m.PermissionPage),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./permission').then((m) => m.PermissionPage),
  },
  {
    path: ':id/detail',
    loadComponent: () => import('./permission').then((m) => m.PermissionPage),
  },
];