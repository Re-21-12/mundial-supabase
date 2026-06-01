import { Routes } from '@angular/router';

export const AUDIT_LOG_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./audit-log').then((m) => m.AuditLogPage),
  },
  {
    path: ':id',
    loadComponent: () => import('./audit-log').then((m) => m.AuditLogPage),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./audit-log').then((m) => m.AuditLogPage),
  },
  {
    path: ':id/detail',
    loadComponent: () => import('./audit-log').then((m) => m.AuditLogPage),
  },
];