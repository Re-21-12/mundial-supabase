import { Routes } from '@angular/router';

export const INVITATION_ROUTES: Routes = [
  {
    path: 'invitaciones',
    title: 'Invitaciones',
    data: {
      description: 'Autorizar invitaciones desde la bandeja',
      icon: 'lucideBell',
      publicRoute: true,
    },
    loadComponent: () => import('../invitaciones/invitaciones').then((m) => m.InvitacionesPage),
  },
];
