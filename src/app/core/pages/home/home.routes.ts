import { Routes } from '@angular/router';

export const HOME_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./home').then((m) => m.Home),
  },
  {
    path: ':id',
    loadComponent: () => import('./home').then((m) => m.Home),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./home').then((m) => m.Home),
  },
];
