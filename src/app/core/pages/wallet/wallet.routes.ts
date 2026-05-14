import { Routes } from '@angular/router';

export const WALLET_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./wallet').then((m) => m.WalletPage),
  },
  {
    path: 'top-up',
    loadComponent: () =>
      import('../wallet-topup/wallet-topup').then((m) => m.WalletTopupPage),
  },
  {
    path: ':id',
    loadComponent: () => import('./wallet').then((m) => m.WalletPage),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./wallet').then((m) => m.WalletPage),
  },
  {
    path: ':id/detail',
    loadComponent: () => import('./wallet').then((m) => m.WalletPage),
  },
];