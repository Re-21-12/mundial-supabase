import { Routes } from '@angular/router';

export const USER_ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./user-admin').then((m) => m.UserAdminPage),
  },
];
