import { environment } from '../../../environments/environment';
import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { ApiResponse, Notification as UserNotification, NotificationType } from '../../shared/models/models';
import { map, interval, switchMap, of, takeWhile, catchError, EMPTY } from 'rxjs';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning';
  timestamp: number;
}

/**
 * Service managing persistent user notifications and temporary UI toasts.
 * Handles server-side notification polling and provides methods for manual toast triggers.
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly API_URL = environment.apiBaseUrl + '/notifications';

  private notificationsSignal = signal<UserNotification[]>([]);
  notifications = this.notificationsSignal.asReadonly();
  
  private toastsSignal = signal<Toast[]>([]);
  toasts = this.toastsSignal.asReadonly();

  unreadCount = computed(() => 
    this.notifications().filter(n => !n.isRead).length
  );

  private pollingActive = false;

  constructor() {
    // Automatically start polling when user logs in and stop when they log out
    effect(() => {
      const user = this.authService.currentUser();
      if (user && !this.pollingActive) {
        this.startPolling(user.userId);
      } else if (!user) {
        this.stopPolling();
      }
    });
  }

  // Retrieves all notifications for the specified user from the backend
  getNotifications(userId: number) {
    return this.http.get<UserNotification[]>(`${this.API_URL}/user/${userId}`).pipe(
      map((notifications: UserNotification[]) => {
        // Sort by date descending
        return notifications.sort((a: UserNotification, b: UserNotification) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      })
    );
  }

  // Marks a single notification as read by its ID
  markAsRead(notificationId: number) {
    return this.http.put<UserNotification>(`${this.API_URL}/read/${notificationId}`, {}).pipe(
      map((updated: UserNotification) => {
        this.notificationsSignal.update((list: UserNotification[]) => 
          list.map((n: UserNotification) => n.notificationId === notificationId ? { ...n, isRead: true } : n)
        );
        return updated;
      })
    );
  }

  // Marks every notification for the current user as read
  markAllAsRead() {
    const user = this.authService.currentUser();
    if (!user) return of('');

    return this.http.put(`${this.API_URL}/readAll/${user.userId}`, {}, { responseType: 'text' }).pipe(
      map(res => {
        this.notificationsSignal.update((list: UserNotification[]) => 
          list.map((n: UserNotification) => ({ ...n, isRead: true }))
        );
        return res;
      })
    );
  }

  // Permanently removes all notifications for the current user from the system
  deleteAll() {
    const user = this.authService.currentUser();
    if (!user) return of('');

    return this.http.delete(`${this.API_URL}/user/${user.userId}`, { responseType: 'text' }).pipe(
      map(res => {
        this.notificationsSignal.set([]);
        return res;
      })
    );
  }

  // Starts periodic polling to check for new notifications from the server
  private startPolling(userId: number) {
    this.pollingActive = true;
    
    // Initial fetch (ignore errors — user might just have logged in)
    this.getNotifications(userId).pipe(
      catchError((err) => {
        if (err.status === 401) {
          this.stopPolling();
        }
        return EMPTY;
      })
    ).subscribe((list: UserNotification[]) => this.notificationsSignal.set(list));

    // Poll every 60 seconds
    interval(60000).pipe(
      takeWhile(() => this.pollingActive),
      switchMap(() =>
        this.getNotifications(userId).pipe(
          catchError((err) => {
            if (err.status === 401) {
              // Token expired — stop polling immediately; the interceptor will redirect
              this.stopPolling();
            }
            // Return EMPTY so the interval stream continues until takeWhile stops it
            return EMPTY;
          })
        )
      )
    ).subscribe({
      next: (list: UserNotification[]) => {
        this.notificationsSignal.set(list);
      }
    });
  }

  // Stops the notification polling process and clears current notifications
  private stopPolling() {
    this.pollingActive = false;
    this.notificationsSignal.set([]);
  }

  // --- UI Toast System ---

  // Shows a success toast with the specified message
  success(message: string) {
    this.addToast(message, 'success');
  }

  // Shows an error toast with the specified message
  error(message: string) {
    this.addToast(message, 'error');
  }

  // Shows a warning toast with the specified message
  warn(message: string) {
    this.addToast(message, 'warning');
  }

  // Helper to add a new toast with deduplication and auto-dismiss logic
  private addToast(message: string, type: 'success' | 'error' | 'warning') {
    const now = Date.now();
    const currentToasts = this.toastsSignal();

    // 1. Deduplication (don't show same message within 3s)
    const isDuplicate = currentToasts.some((t: Toast) => 
      t.message === message && (now - t.timestamp) < 3000
    );
    if (isDuplicate) return;

    // 2. Rate Limiting (max 3 visible)
    if (currentToasts.length >= 3) {
      // Remove oldest to make room
      this.toastsSignal.update((list: Toast[]) => list.slice(1));
    }

    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : Date.now().toString(36) + Date.now().toString(36).substring(2);
    const newToast: Toast = { id, message, type, timestamp: now };

    this.toastsSignal.update((list: Toast[]) => [...list, newToast]);

    // 3. Auto-dismiss (5s)
    setTimeout(() => this.removeToast(id), 5000);
  }

  // Removes a specific toast from the display list
  removeToast(id: string) {
    this.toastsSignal.update((list: Toast[]) => list.filter((t: Toast) => t.id !== id));
  }

  // Wipes all active toasts from the screen immediately
  clearAllToasts() {
    this.toastsSignal.set([]);
  }
}
