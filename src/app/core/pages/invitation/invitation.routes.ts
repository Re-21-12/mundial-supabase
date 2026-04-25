import { Routes } from '@angular/router';

export const INVITATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./invitation').then((m) => m.InvitationPage),
  },
  {
    path: ':id',
    loadComponent: () => import('./invitation').then((m) => m.InvitationPage),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./invitation').then((m) => m.InvitationPage),
  },
  {
    path: ':id/detail',
    loadComponent: () => import('./invitation').then((m) => m.InvitationPage),
  },
];