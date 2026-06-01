import { Routes } from '@angular/router';

export const TRANSACTION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./transaction').then((m) => m.TransactionPage),
  },
  {
    path: ':id',
    loadComponent: () => import('./transaction').then((m) => m.TransactionPage),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./transaction').then((m) => m.TransactionPage),
  },
  {
    path: ':id/detail',
    loadComponent: () => import('./transaction').then((m) => m.TransactionPage),
  },
];