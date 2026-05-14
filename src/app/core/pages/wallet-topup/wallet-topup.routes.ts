import { Routes } from '@angular/router';

export const WALLET_TOPUP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./wallet-topup').then((m) => m.WalletTopupPage),
  },
];
