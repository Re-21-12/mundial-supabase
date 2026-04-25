import { Routes } from '@angular/router';

export const MATCH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./match').then((m) => m.MatchPage),
  },
  {
    path: ':id',
    loadComponent: () => import('./match').then((m) => m.MatchPage),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./match').then((m) => m.MatchPage),
  },
  {
    path: ':id/detail',
    loadComponent: () => import('./match').then((m) => m.MatchPage),
  },
];