import { Routes } from '@angular/router';

export const USER_SESSION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./user-session').then((m) => m.UserSessionPage),
  },
  {
    path: ':id',
    loadComponent: () => import('./user-session').then((m) => m.UserSessionPage),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./user-session').then((m) => m.UserSessionPage),
  },
  {
    path: ':id/detail',
    loadComponent: () => import('./user-session').then((m) => m.UserSessionPage),
  },
];