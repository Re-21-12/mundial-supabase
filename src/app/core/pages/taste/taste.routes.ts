import { Routes } from '@angular/router';

export const TASTE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./taste').then((m) => m.Taste),
  },
  {
    path: ':id',
    loadComponent: () => import('./taste').then((m) => m.Taste),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./taste').then((m) => m.Taste),
  },
];
