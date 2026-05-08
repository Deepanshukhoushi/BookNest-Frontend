import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';

/**
 * Builds a minimal valid JWT with the given payload encoded into the middle segment.
 * Header and signature are dummy values since decoding only reads the payload.
 */
function makeJwt(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  // Convert standard base64 to URL-safe base64
  const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${urlSafe}.signature`;
}

describe('authGuard', () => {
  let router: Router;
  let mockRoute: Partial<ActivatedRouteSnapshot>;
  let mockState: Partial<RouterStateSnapshot>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([])]
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    mockRoute = { data: {} };
    mockState = { url: '/dashboard' };
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should redirect to /auth when no token exists', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute as ActivatedRouteSnapshot, mockState as RouterStateSnapshot)
    );
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/auth'], { queryParams: { returnUrl: '/dashboard' } });
  });

  it('should allow access when token exists and no roles required', () => {
    localStorage.setItem('token', makeJwt({ role: 'USER' }));
    mockRoute = { data: {} }; // no 'roles' key

    const result = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute as ActivatedRouteSnapshot, mockState as RouterStateSnapshot)
    );
    expect(result).toBe(true);
  });

  it('should deny access when token is expired', () => {
    localStorage.setItem('token', makeJwt({ role: 'USER', exp: Math.floor(Date.now() / 1000) - 60 }));

    const result = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute as ActivatedRouteSnapshot, mockState as RouterStateSnapshot)
    );

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/auth'], { queryParams: { returnUrl: '/dashboard' } });
  });

  it('should allow access when user role matches required role', () => {
    localStorage.setItem('token', makeJwt({ role: 'ADMIN' }));
    mockRoute = { data: { roles: ['ADMIN'] } };

    const result = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute as ActivatedRouteSnapshot, mockState as RouterStateSnapshot)
    );
    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should redirect to / when user role does not match required role', () => {
    localStorage.setItem('token', makeJwt({ role: 'USER' }));
    mockRoute = { data: { roles: ['ADMIN'] } };

    const result = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute as ActivatedRouteSnapshot, mockState as RouterStateSnapshot)
    );
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/'], { replaceUrl: true });
  });

  it('should fall back to localStorage role when token has no role claim', () => {
    localStorage.setItem('token', makeJwt({ sub: 'user@test.com' })); // no role
    localStorage.setItem('role', 'ADMIN');
    mockRoute = { data: { roles: ['ADMIN'] } };

    const result = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute as ActivatedRouteSnapshot, mockState as RouterStateSnapshot)
    );
    expect(result).toBe(true);
  });

  it('should synchronize localStorage role when token has a fresher role', () => {
    localStorage.setItem('token', makeJwt({ role: 'ADMIN' }));
    localStorage.setItem('role', 'USER'); // stale
    mockRoute = { data: { roles: ['ADMIN'] } };

    TestBed.runInInjectionContext(() =>
      authGuard(mockRoute as ActivatedRouteSnapshot, mockState as RouterStateSnapshot)
    );
    expect(localStorage.getItem('role')).toBe('ADMIN');
  });
});
