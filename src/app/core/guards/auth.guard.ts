import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

// Helper function to decode the user's role directly from the JWT string
function decodeRoleFromToken(token: string): string | null {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return null;
    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + '='.repeat(padLength);
    const payloadJson = decodeURIComponent(
      atob(padded)
        .split('')
        .map(c => '%' + ('00' + c.codePointAt(0)!.toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(payloadJson);
    return payload.role || null;
  } catch {
    return null;
  }
}

/**
 * Functional route guard that protects sensitive application routes.
 * Verifies the presence of an authentication token and validates user roles against route requirements.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  if (token) {
    const requiredRoles = (route.data?.['roles'] as string[] | undefined) || [];
    if (requiredRoles.length === 0) return true;

    // source of truth is the token, fallback to localStorage if needed
    const tokenRole = decodeRoleFromToken(token);
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
