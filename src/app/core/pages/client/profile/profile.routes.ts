import { Routes } from '@angular/router';

export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./profile').then((m) => m.ProfilePage),
  },
  {
    path: ':id',
    loadComponent: () => import('./profile').then((m) => m.ProfilePage),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./profile').then((m) => m.ProfilePage),
  },
];
