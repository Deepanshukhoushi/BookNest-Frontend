import { ApplicationConfig, provideBrowserGlobalErrorListeners, DEFAULT_CURRENCY_CODE } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { apiInterceptor } from './core/interceptors/api.interceptor';
import { routes } from './app.routes';

/**
 * Main application configuration for Angular.
 * Bootstraps core services including the router, localized currency, and global API interceptors.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'INR' },
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    provideHttpClient(withInterceptors([apiInterceptor]))
  ],
};

