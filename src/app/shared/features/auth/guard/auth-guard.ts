// auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { AuthFacade } from '../auth.facade';

const PUBLIC_CHILD_PATHS = new Set(['home', 'set-password', 'sign-in', 'login']);

function extractPermissionsFromMetadata(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== 'object') {
    return [];
  }

  const metadataRecord = metadata as Record<string, unknown>;
  const directPermissions = metadataRecord['permissions'];

  if (Array.isArray(directPermissions)) {
    return directPermissions.filter(
      (permission): permission is string => typeof permission === 'string',
    );
  }

  if (directPermissions && typeof directPermissions === 'object') {
    return Object.keys(directPermissions as Record<string, unknown>);
  }

  return [];
}

export const authGuard: CanActivateChildFn = async (childRoute) => {
  const authFacade = inject(AuthFacade);
  const router = inject(Router);
  const routePath = childRoute.routeConfig?.path ?? '';
  const isPublicChildRoute =
    Boolean(childRoute.data?.['publicRoute']) || PUBLIC_CHILD_PATHS.has(routePath);

  const {
    data: { session },
  } = await authFacade.getSession();

  if (!session && !isPublicChildRoute) {
    return router.createUrlTree(['/login']);
  }

  if (!session) {
    return true;
  }

  if (isPublicChildRoute) {
    return true;
  }

  const requiredPermission =
    typeof childRoute.data?.['requiredPermission'] === 'string'
      ? childRoute.data['requiredPermission']
      : null;

  const userPermissions = authFacade.permissions();

  // console.log('User Permissions:', userPermissions);
  // If route has an explicit required permission, enforce it.
  // Otherwise, require at least one permission for protected routes.

  /* console.log('Has Route Access:', hasRouteAccess);
  if (!hasRouteAccess) {
    return router.createUrlTree(['/home']);
  } */

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
