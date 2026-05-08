import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationService } from './notification.service';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { signal } from '@angular/core';

describe('NotificationService', () => {
  let service: NotificationService;
  let authServiceSpy: any;

  beforeEach(() => {
    vi.useFakeTimers();
    
    authServiceSpy = {
      currentUser: signal({ userId: 1, fullName: 'Test User' })
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        NotificationService,
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should add and remove toasts', () => {
    service.success('Test Success');
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].message).toBe('Test Success');
    expect(service.toasts()[0].type).toBe('success');

    const id = service.toasts()[0].id;
    service.removeToast(id);
    expect(service.toasts().length).toBe(0);
  });

  it('should handle error toasts', () => {
    service.error('Test Error');
    expect(service.toasts()[0].type).toBe('error');
  });

  it('should handle warn toasts', () => {
    service.warn('Test Warning');
    expect(service.toasts()[0].type).toBe('warning');
  });

  it('should deduplicate toasts with same message within 3s', () => {
    service.success('Duplicate');
    service.success('Duplicate');
    expect(service.toasts().length).toBe(1);

    vi.advanceTimersByTime(3001);
    service.success('Duplicate');
    expect(service.toasts().length).toBe(2);
  });

  it('should rate limit toasts to max 3', () => {
    service.success('Msg 1');
    service.success('Msg 2');
    service.success('Msg 3');
    service.success('Msg 4');
    expect(service.toasts().length).toBe(3);
    expect(service.toasts()[0].message).toBe('Msg 2'); // Msg 1 removed
  });

  it('should auto-dismiss toasts after 5s', () => {
    service.success('Auto dismiss');
    expect(service.toasts().length).toBe(1);
    
    vi.advanceTimersByTime(5001);
    expect(service.toasts().length).toBe(0);
  });

  it('should clear all toasts', () => {
    service.success('M1');
    service.success('M2');
    service.clearAllToasts();
    expect(service.toasts().length).toBe(0);
  });

  it('should handle ID generation fallback when crypto is unavailable', () => {
    const originalCrypto = window.crypto;
    // @ts-ignore
    delete (window as any).crypto;
    
    // We need to re-instantiate or just call addToast if it was private, 
    // but success() calls it.
    service.success('Fallback ID');
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].id).toBeDefined();
    
    // Restore
    (window as any).crypto = originalCrypto;
  });

  it('should fetch notifications', () => {
    const mockNotifications = [{ notificationId: 1, message: 'Test', createdAt: new Date().toISOString(), isRead: false }];
    service.getNotifications(1).subscribe(list => {
      expect(list.length).toBe(1);
      expect(list[0].message).toBe('Test');
    });

    const httpMock = TestBed.inject(HttpTestingController);
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/notifications/user/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockNotifications);
    httpMock.verify();
  });

  it('should mark notification as read', () => {
    const mockNotification = { notificationId: 1, message: 'Test', isRead: true };
    service.markAsRead(1).subscribe(res => {
      expect(res.isRead).toBe(true);
    });

    const httpMock = TestBed.inject(HttpTestingController);
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/notifications/read/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(mockNotification);
    httpMock.verify();
  });

  it('should mark all as read', () => {
    service.markAllAsRead().subscribe(res => {
      expect(res).toBe('All marked read');
    });

    const httpMock = TestBed.inject(HttpTestingController);
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/notifications/readAll/1`);
    expect(req.request.method).toBe('PUT');
    req.flush('All marked read');
    httpMock.verify();
  });

  it('should delete all notifications', () => {
    service.deleteAll().subscribe(res => {
      expect(res).toBe('All deleted');
    });

    const httpMock = TestBed.inject(HttpTestingController);
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/notifications/user/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush('All deleted');
    httpMock.verify();
  });
});
