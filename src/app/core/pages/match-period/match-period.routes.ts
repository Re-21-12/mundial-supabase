import { Routes } from '@angular/router';

export const MATCH_PERIOD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./match-period').then((m) => m.MatchPeriodPage),
  },
  {
    path: ':id',
    loadComponent: () => import('./match-period').then((m) => m.MatchPeriodPage),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./match-period').then((m) => m.MatchPeriodPage),
  },
  {
    path: ':id/detail',
    loadComponent: () => import('./match-period').then((m) => m.MatchPeriodPage),
  },
];