import { describe, it, expect } from 'vitest';
import { routes } from './app.routes';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

describe('app routes', () => {
  it('should register the expected public and guarded paths', () => {
    expect(routes.find(route => route.path === '')?.component).toBeTruthy();
    expect(routes.find(route => route.path === 'auth')?.component).toBeTruthy();
    expect(routes.find(route => route.path === 'books')?.component).toBeTruthy();
    expect(routes.find(route => route.path === 'book/:id')?.component).toBeTruthy();
    expect(routes.find(route => route.path === 'oauth2/redirect')?.component).toBeTruthy();

    expect(routes.find(route => route.path === 'dashboard')?.canActivate).toEqual([authGuard]);
    expect(routes.find(route => route.path === 'cart')?.canActivate).toEqual([authGuard]);
    expect(routes.find(route => route.path === 'checkout')?.canActivate).toEqual([authGuard]);
    expect(routes.find(route => route.path === 'wallet')?.canActivate).toEqual([authGuard]);
    expect(routes.find(route => route.path === 'order-history')?.canActivate).toEqual([authGuard]);
    expect(routes.find(route => route.path === 'orders')?.canActivate).toEqual([authGuard]);
    expect(routes.find(route => route.path === 'admin')?.canActivate).toEqual([adminGuard]);
    expect(routes.find(route => route.path === '**')?.redirectTo).toBe('not-found');
  });

  it('should resolve each lazy route component', async () => {
    const lazyRoutes = routes.filter(route => typeof route.loadComponent === 'function');

    const resolved = await Promise.all(
      lazyRoutes.map(async route => ({
        path: route.path,
        component: await route.loadComponent?.()
      }))
    );

    expect(resolved).toHaveLength(10);
    expect(resolved.every(route => route.component)).toBe(true);
  });
});
