// auth.guard.ts - Centralized, waits for authReady
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthFacade } from '../auth.facade';
import { SupabaseAuthService } from '../../../../core/services/supabase-auth-service';

export const authGuard: CanActivateFn = async (route, state) => {
  const supabaseAuthService = inject(SupabaseAuthService);
  const router = inject(Router);

  // Ensure initial auth resolved
  try {
    await supabaseAuthService.waitForAuthReady();
  } catch (err) {
    console.error('[AuthGuard] waitForAuthReady error', err);
  }

  const { data } = await supabaseAuthService.getUser();
  const user = data?.user;
  if (!user) {
    return router.createUrlTree(['/login']);
  }

  // Check route required permission (string or string[])
  const required = route.data?.['requiredPermission'];
  if (required) {
    if (typeof required === 'string') {
      if (!supabaseAuthService.hasPermission(required)) {
        return router.createUrlTree(['/not-found']);
      }
    } else if (Array.isArray(required)) {
      if (!supabaseAuthService.hasAnyPermission(required)) {
        return router.createUrlTree(['/not-found']);
      }
    }
  }

  return true;
};

export const adminGuard: CanActivateFn = async () => {
  const authFacade = inject(AuthFacade);
  const router = inject(Router);

  try {
    console.log('[AdminGuard] Waiting for authReady');

    // Wait for auth ready signal via facade
    // If no session or no role -> redirect
    const session = authFacade.session();
    const role = authFacade.role ? authFacade.role() : session?.user?.user_metadata?.['role'];

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
