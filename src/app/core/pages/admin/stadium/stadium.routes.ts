import { Routes } from '@angular/router';

export const STADIUM_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./stadium').then((m) => m.Stadium),
  },
  {
    path: ':id',
    loadComponent: () => import('./stadium').then((m) => m.Stadium),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./stadium').then((m) => m.Stadium),
  },
  {
    path: ':id/detail',
    loadComponent: () => import('./stadium').then((m) => m.Stadium),
  },
];