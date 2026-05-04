import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot, provideRouter } from '@angular/router';
import { adminGuard } from './admin.guard';

/** Builds a minimal JWT with the given payload. */
function makeJwt(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${urlSafe}.signature`;
}

describe('adminGuard', () => {
  let router: Router;
  let mockRoute: Partial<ActivatedRouteSnapshot>;
  let mockState: Partial<RouterStateSnapshot>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([])]
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    mockRoute = {};
    mockState = { url: '/admin' };
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should redirect to /auth when no token exists', () => {
    const result = TestBed.runInInjectionContext(() =>
      adminGuard(mockRoute as ActivatedRouteSnapshot, mockState as RouterStateSnapshot)
    );
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/auth'], { queryParams: { returnUrl: '/admin' } });
  });

  it('should allow access when token has ADMIN role', () => {
    localStorage.setItem('token', makeJwt({ role: 'ADMIN' }));

    const result = TestBed.runInInjectionContext(() =>
      adminGuard(mockRoute as ActivatedRouteSnapshot, mockState as RouterStateSnapshot)
    );
    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should deny access and redirect to / for a USER role token', () => {
    localStorage.setItem('token', makeJwt({ role: 'USER' }));

    const result = TestBed.runInInjectionContext(() =>
      adminGuard(mockRoute as ActivatedRouteSnapshot, mockState as RouterStateSnapshot)
    );
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/'], { replaceUrl: true });
  });

  it('should fall back to localStorage role when token has no role claim', () => {
    localStorage.setItem('token', makeJwt({ sub: 'admin@test.com' })); // no role
    localStorage.setItem('role', 'ADMIN');

    const result = TestBed.runInInjectionContext(() =>
      adminGuard(mockRoute as ActivatedRouteSnapshot, mockState as RouterStateSnapshot)
    );
    expect(result).toBe(true);
  });

  it('should deny access when token has no role and localStorage role is USER', () => {
    localStorage.setItem('token', makeJwt({ sub: 'user@test.com' }));
    localStorage.setItem('role', 'USER');

    const result = TestBed.runInInjectionContext(() =>
      adminGuard(mockRoute as ActivatedRouteSnapshot, mockState as RouterStateSnapshot)
    );
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/'], { replaceUrl: true });
  });
});
