import { Routes } from '@angular/router';

export const USER_LEAGUE_REWARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./user-league-reward').then((m) => m.UserLeagueRewardPage),
  },
  {
    path: ':id',
    loadComponent: () => import('./user-league-reward').then((m) => m.UserLeagueRewardPage),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./user-league-reward').then((m) => m.UserLeagueRewardPage),
  },
  {
    path: ':id/detail',
    loadComponent: () => import('./user-league-reward').then((m) => m.UserLeagueRewardPage),
  },
];