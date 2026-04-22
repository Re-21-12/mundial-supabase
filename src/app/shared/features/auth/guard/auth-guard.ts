// auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthFacade } from '../auth.facade';

export const authGuard: CanActivateFn = async () => {
  const authFacade = inject(AuthFacade);
  const router = inject(Router);

  const {
    data: { session },
  } = await authFacade.getSession();

  if (!session) {
    return router.createUrlTree(['/login']); // ← mejor que navigate()
  }
  return true;
};

export const adminGuard: CanActivateFn = async () => {
  const authFacade = inject(AuthFacade);
  const router = inject(Router);

  const {
    data: { session },
  } = await authFacade.getSession();
  const role = session?.user?.user_metadata?.['role'];

  if (role !== 'admin') {
    return router.createUrlTree(['/home']);
  }
  return true;
};
