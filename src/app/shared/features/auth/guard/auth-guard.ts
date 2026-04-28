// auth.guard.ts - Centralized, waits for authReady
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthFacade } from '../auth.facade';
import { SupabaseAuthService } from '../../../../core/services/supabase-auth-service';

export const authGuard: CanActivateFn = async (route, state) => {
  const supabaseAuthService = inject(SupabaseAuthService);
  const router = inject(Router);

  const { data } = await supabaseAuthService.getUser();
  const user = data?.user;
  if (!user) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
  return true;
};


export const adminGuard: CanActivateFn = async () => {
  const authFacade = inject(AuthFacade);
  const router = inject(Router);

  try {
    console.log('[AdminGuard] Waiting for authReady');

    const session = authFacade.session();
    const role = session?.user?.user_metadata?.['role'];

    console.log(`[AdminGuard] User role: ${role}`);

    if (role !== 'admin') {
      console.log('[AdminGuard] Not admin, redirecting to login');
      return router.createUrlTree(['/login']);
    }

    console.log('[AdminGuard] Admin confirmed, allowing access');
    return true;
  } catch (err) {
    console.error('[AdminGuard] Error:', err);
    return router.createUrlTree(['/login']);
  }
};
