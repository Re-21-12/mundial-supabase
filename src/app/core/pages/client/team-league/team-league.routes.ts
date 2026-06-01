import { Routes } from '@angular/router';

export const TEAM_LEAGUE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./team-league').then((m) => m.TeamLeaguePage),
  },
  {
    path: ':id',
    loadComponent: () => import('./team-league').then((m) => m.TeamLeaguePage),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./team-league').then((m) => m.TeamLeaguePage),
  },
  {
    path: ':id/detail',
    loadComponent: () => import('./team-league').then((m) => m.TeamLeaguePage),
  },
];
