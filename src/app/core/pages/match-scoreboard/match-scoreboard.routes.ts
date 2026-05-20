import { Routes } from '@angular/router';

export const MATCH_SCOREBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./match-scoreboard').then((m) => m.MatchScoreboardPage),
  },
];
