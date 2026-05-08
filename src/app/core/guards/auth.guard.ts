import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { decodeJwtPayload, isTokenExpired } from '../../shared/utils/jwt.utils';

/**
 * Functional route guard that protects sensitive application routes.
 * Verifies the presence of an authentication token and validates user roles against route requirements.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  if (token) {
    if (isTokenExpired(token)) {
      router.navigate(['/auth'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    const requiredRoles = (route.data?.['roles'] as string[] | undefined) || [];
    if (requiredRoles.length === 0) return true;

    // source of truth is the token, fallback to localStorage if needed
    const tokenRole = (decodeJwtPayload(token)?.['role'] as string | undefined) || null;
    const storedRole = localStorage.getItem('role');
    const finalRole = tokenRole || storedRole || 'USER';

    console.debug(`[AuthGuard] Accessing: ${state.url}, Required: ${requiredRoles}, Detected: ${finalRole}`);

    // Synchronize localStorage if the token provided a more recent/accurate role
    if (tokenRole && tokenRole !== storedRole) {
      localStorage.setItem('role', tokenRole);
    }

    if (requiredRoles.includes(finalRole)) return true;

    console.warn(`[AuthGuard] Access Denied. Redirecting ${finalRole} away from ${state.url}`);
    router.navigate(['/'], { replaceUrl: true });
    return false;
  }

  router.navigate(['/auth'], { queryParams: { returnUrl: state.url } });
  return false;
};
