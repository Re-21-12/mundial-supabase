import { Routes } from '@angular/router';

export const RULES_LEAGUE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./rules-league').then((m) => m.RulesLeaguePage),
  },
  {
    path: ':id',
    loadComponent: () => import('./rules-league').then((m) => m.RulesLeaguePage),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./rules-league').then((m) => m.RulesLeaguePage),
  },
  {
    path: ':id/detail',
    loadComponent: () => import('./rules-league').then((m) => m.RulesLeaguePage),
  },
];