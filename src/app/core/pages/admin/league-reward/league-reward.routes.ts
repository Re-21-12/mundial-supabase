import { Routes } from '@angular/router';

export const LEAGUE_REWARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./league-reward').then((m) => m.LeagueRewardPage),
  },
  {
    path: ':id',
    loadComponent: () => import('./league-reward').then((m) => m.LeagueRewardPage),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./league-reward').then((m) => m.LeagueRewardPage),
  },
  {
    path: ':id/detail',
    loadComponent: () => import('./league-reward').then((m) => m.LeagueRewardPage),
  },
];