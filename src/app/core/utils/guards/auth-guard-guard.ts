// auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseAuthService } from '../../services/supabase-auth-service';

export const authGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseAuthService);
  const router = inject(Router);

  const {
    data: { session },
  } = await supabase.getSession();

  if (!session) {
    return router.createUrlTree(['/login']); // ← mejor que navigate()
  }
  return true;
};

export const adminGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseAuthService);
  const router = inject(Router);

  const {
    data: { session },
  } = await supabase.getSession();
  const role = session?.user?.user_metadata?.['role'];

  if (role !== 'admin') {
    return router.createUrlTree(['/dashboard']);
  }
  return true;
};
