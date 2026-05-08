import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

/**
 * Route guard that restricts access to admin-only routes.
 *
 * Reads the role directly from the JWT payload (the source of truth) and falls back
 * to the role stored in localStorage if the token is absent.
 *
 * Redirects non-admins to the home page ('/') and unauthenticated users to '/auth'.
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  if (!token) {
    router.navigate(['/auth'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const role = decodeRoleFromToken(token) || localStorage.getItem('role') || 'USER';

  if (role === 'ADMIN') {
    return true;
  }

  console.warn(`[AdminGuard] Access denied for role: ${role}. Redirecting to home.`);
  router.navigate(['/'], { replaceUrl: true });
  return false;
};

/** Decodes the user's role directly from the JWT string without a library. */
function decodeRoleFromToken(token: string): string | null {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return null;
    const normalized = payloadBase64.replaceAll('-', '+').replaceAll('_', '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const decoded = decodeURIComponent(
      atob(padded)
        .split('')
        .map(c => '%' + ('00' + c.codePointAt(0)!.toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(decoded);
    return payload.role || null;
  } catch {
    return null;
  }
}
