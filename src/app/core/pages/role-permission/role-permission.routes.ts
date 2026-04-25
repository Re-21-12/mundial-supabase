import { Routes } from '@angular/router';

export const ROLE_PERMISSION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./role-permission').then((m) => m.RolePermissionPage),
  },
  {
    path: ':id',
    loadComponent: () => import('./role-permission').then((m) => m.RolePermissionPage),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./role-permission').then((m) => m.RolePermissionPage),
  },
  {
    path: ':id/detail',
    loadComponent: () => import('./role-permission').then((m) => m.RolePermissionPage),
  },
];