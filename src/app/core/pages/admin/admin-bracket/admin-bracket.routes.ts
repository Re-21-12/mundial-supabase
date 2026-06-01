import { Routes } from '@angular/router';

export const ADMIN_BRACKET_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-bracket').then((m) => m.AdminBracketPage),
  },
];
