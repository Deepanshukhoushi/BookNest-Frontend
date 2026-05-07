import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { NotificationService } from '../services/notification.service';

/**
 * Global HTTP Interceptor for processing all backend communication.
 * Automatically attaches JWT headers, displays success/error notifications, and handles session expiry.
 */
export const apiInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const router = inject(Router);
  const notificationService = inject(NotificationService);
  const token = localStorage.getItem('token');

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  const isAuthRequest = req.url.includes('/api/v1/auth');

  return next(authReq).pipe(
    tap((response: any) => {
      // SUCCESS HANDLING
      if (response?.body?.success === true && response.body?.message) {
        // Suppress success toasts for GET requests and all auth requests (auth handled inline)
        // Also suppress if 'X-Skip-Toast' header is present
        const skipToast = req.headers.has('X-Skip-Toast');
        if (req.method !== 'GET' && !isAuthRequest && !skipToast) {
          notificationService.success(response.body.message);
        }
      }
    }),
    catchError((error: HttpErrorResponse) => {
      // ERROR HANDLING logic
      
      const isCritical = error.status === 500 || error.status === 403 || error.status === 0;
      const isMutation = req.method !== 'GET';
      
      // User-friendly error message mapping
      let userMessage = error?.error?.message;
      
      // Technical to User-Friendly Mapping
      const messageMap: Record<string, string> = {
        'Invalid credentials': 'The email or password you entered is incorrect.',
        'User already exists': 'An account with this email address already exists.',
        'Bad Request': 'One or more fields are invalid. Please check your input.',
        'Token expired': 'Your session has expired. Please log in again.'
      };

      if (userMessage && messageMap[userMessage]) {
        userMessage = messageMap[userMessage];
      }

      if (!userMessage) {
        if (error.status === 0) userMessage = 'Unable to connect to the server. Please check your connection.';
        else if (error.status === 403) userMessage = 'Access denied. You do not have permission for this action.';
        else if (error.status === 500) userMessage = 'A server-side error occurred. Our team has been notified.';
        else userMessage = 'An unexpected error occurred. Please try again.';
      }

      // Show toast if:
      // 1. It's a mutation (User-initiated action like POST/PUT/DELETE)
      // 2. It's a critical system error (500, Forbidden, Connection lost)
      // AND it's not an auth request (Auth component handles its own inline errors)
      if ((isMutation || isCritical) && !isAuthRequest) {
        notificationService.error(userMessage);
      } else {
        // For standard GET failures or auth failures, we rely on Component-level inline error UI
        console.warn('Notification suppressed (handled by component or background):', userMessage);
      }

      if (error.status === 401) {
        // Unauthorized - clear session
        clearAuthData();
        
        // Only redirect to /auth if it's NOT a public GET request
        const isPublicGet = req.method === 'GET' && (
          req.url.includes('/api/v1/books') || 
          req.url.includes('/api/v1/reviews/book')
        );
        
        if (!isPublicGet) {
          router.navigate(['/auth']);
        }
      }

      return throwError(() => error);
    })
  );
};

// Helper to clear all sensitive session data from local storage
function clearAuthData() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('role');
  localStorage.removeItem('userId');
}
