import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { AuthComponent } from './features/auth/auth.component';
import { BookListingsComponent } from './features/book-listings/book-listings.component';
import { BookDetailComponent } from './features/book-detail/book-detail.component';
import { OAuthRedirectComponent } from './features/oauth-redirect/oauth-redirect.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

/**
 * Centralized routing table for the application.
 * Defines public routes, protected user dashboards, and restricted admin sections using route guards.
 *
 * - Public routes: home, auth, books, book detail, oauth2 redirect
 * - User-protected routes: dashboard, cart, checkout, wallet, orders
 * - Admin-only route: /admin — enforced by the dedicated adminGuard
 * - Wildcard: renders a styled 404 page instead of silently redirecting
 */
export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'auth', component: AuthComponent },
  { path: 'oauth2/redirect', component: OAuthRedirectComponent },
  { path: 'books', component: BookListingsComponent },
  { path: 'book/:id', component: BookDetailComponent },
  
  // Lazy-loaded authenticated routes
  { path: 'dashboard', loadComponent: () => import('./features/dashboard/pages/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'cart', loadComponent: () => import('./features/cart/cart.component').then(m => m.CartComponent), canActivate: [authGuard] },
  { path: 'checkout', loadComponent: () => import('./features/checkout/checkout.component').then(m => m.CheckoutComponent), canActivate: [authGuard] },
  { path: 'wallet', loadComponent: () => import('./features/wallet/wallet.component').then(m => m.WalletComponent), canActivate: [authGuard] },
  { path: 'order-history', loadComponent: () => import('./features/order-history/order-history.component').then(m => m.OrderHistoryComponent), canActivate: [authGuard] },
  { path: 'orders', loadComponent: () => import('./features/acquisitions/acquisitions.component').then(m => m.AcquisitionsComponent), canActivate: [authGuard] },
  
  // Admin route — enforced by dedicated adminGuard (role: ADMIN)
  { path: 'admin', loadComponent: () => import('./features/admin/pages/admin-dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [adminGuard] },
  
  // Existing lazy-loaded routes
  {
    path: 'editions',
    loadComponent: () => import('./features/editions/editions.component').then(m => m.EditionsComponent)
  },

  {
    path: 'about',
    loadComponent: () => import('./features/about/about.component').then(m => m.AboutComponent)
  },
  
  // 404 — "Chapter Not Found" error page
  {
    path: 'not-found',
    loadComponent: () => import('./features/not-found/not-found.component').then(m => m.NotFoundComponent)
  },
  { path: '**', redirectTo: 'not-found' }
];

