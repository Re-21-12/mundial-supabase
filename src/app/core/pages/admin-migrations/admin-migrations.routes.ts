import { Routes } from '@angular/router';

export const ADMIN_MIGRATIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin-migrations').then((m) => m.AdminMigrationsPage),
  },
];
