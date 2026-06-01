import { Routes } from '@angular/router';

export const CATALOG_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./catalog').then((m) => m.Catalog),
  },
  {
    path: ':id',
    loadComponent: () => import('./catalog').then((m) => m.Catalog),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./catalog').then((m) => m.Catalog),
  },
  {
    path: ':id/detail',
    loadComponent: () => import('./catalog').then((m) => m.Catalog),
  },
];
