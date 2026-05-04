import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { signal } from '@angular/core';
import { NotificationType } from '../../shared/models/models';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;
  let authServiceSpy: any;

  const mockUser = { userId: 1, fullName: 'Test User' };
  const mockNotifications = [
    { notificationId: 1, userId: 1, message: 'Message 1', isRead: false, type: NotificationType.SYSTEM, createdAt: new Date().toISOString() },
    { notificationId: 2, userId: 1, message: 'Message 2', isRead: true, type: NotificationType.SYSTEM, createdAt: new Date().toISOString() }
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    authServiceSpy = {
      currentUser: signal<any>(null)
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        NotificationService,
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start polling when user becomes available', () => {
    authServiceSpy.currentUser.set(mockUser);
    TestBed.flushEffects();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/notifications/user/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockNotifications);

    expect(service.notifications().length).toBe(2);

    // Advance time by 60s for polling
    vi.advanceTimersByTime(60000);
    const pollReq = httpMock.expectOne(`${environment.apiBaseUrl}/notifications/user/1`);
    pollReq.flush(mockNotifications);

    service['stopPolling']();
  });

  it('should show and auto-dismiss toasts', () => {
    service.success('Success message');
    expect(service.toasts().length).toBe(1);

    vi.advanceTimersByTime(5000);
    expect(service.toasts().length).toBe(0);
  });

  it('should prevent duplicate toasts within 3s', () => {
    service.error('Error message');
    service.error('Error message');
    expect(service.toasts().length).toBe(1);

    vi.advanceTimersByTime(3001);
    service.error('Error message');
    expect(service.toasts().length).toBe(2);
  });

  it('should mark notification as read', () => {
    const updatedNotification = { ...mockNotifications[0], isRead: true };
    service['notificationsSignal'].set(mockNotifications);

    service.markAsRead(1).subscribe(n => {
      expect(n.isRead).toBe(true);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/notifications/read/1`);
    req.flush(updatedNotification);

    expect(service.notifications()[0].isRead).toBe(true);
  });

  it('should stop polling and clear notifications on 401', () => {
    authServiceSpy.currentUser.set(mockUser);
    TestBed.flushEffects();

    // Flush the initial fetch with a 401
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/notifications/user/1`);
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    // Polling should now be inactive and notifications cleared
    expect(service['pollingActive']).toBe(false);
    expect(service.notifications().length).toBe(0);
  });

  it('should compute unread count correctly', () => {
    service['notificationsSignal'].set(mockNotifications);
    // mockNotifications has 1 unread (isRead: false)
    expect(service.unreadCount()).toBe(1);
  });

  it('should limit visible toasts to 3', () => {
    service.success('Message 1');
    service.success('Message 2');
    service.success('Message 3');
    // Advance past deduplication window so 4th is allowed
    vi.advanceTimersByTime(3001);
    service.success('Message 4');
    // Should have removed oldest to keep max 3
    expect(service.toasts().length).toBe(3);
  });
});
