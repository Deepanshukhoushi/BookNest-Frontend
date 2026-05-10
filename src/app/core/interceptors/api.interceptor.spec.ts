import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpRequest,
  HttpResponse,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { NotificationService } from '../services/notification.service';
import { AuthService } from '../services/auth.service';
import { apiInterceptor } from './api.interceptor';
import { throwError, of } from 'rxjs';

describe('apiInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let notificationServiceSpy: any;
  let authServiceSpy: any;
  let router: Router;

  beforeEach(async () => {
    notificationServiceSpy = {
      success: vi.fn(),
      error: vi.fn()
    };
    authServiceSpy = {
      refresh: vi.fn().mockReturnValue(throwError(() => new Error('Refresh failed')))
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should attach Authorization header when token is present', () => {
    localStorage.setItem('token', 'test-jwt-token');

    httpClient.get('/api/v1/books').subscribe();

    const req = httpMock.expectOne('/api/v1/books');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-jwt-token');
    req.flush([]);
  });

  it('should NOT attach Authorization header when no token', () => {
    httpClient.get('/api/v1/books').subscribe();

    const req = httpMock.expectOne('/api/v1/books');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('should show success toast on successful POST mutation with message', () => {
    httpClient.post('/api/v1/cart/add', {}).subscribe();

    const req = httpMock.expectOne('/api/v1/cart/add');
    req.flush({ success: true, message: 'Added to cart!' });

    expect(notificationServiceSpy.success).toHaveBeenCalledWith('Added to cart!');
  });

  it('should NOT show success toast for GET requests', () => {
    httpClient.get('/api/v1/books').subscribe();

    const req = httpMock.expectOne('/api/v1/books');
    req.flush({ success: true, message: 'Books loaded' });

    expect(notificationServiceSpy.success).not.toHaveBeenCalled();
  });

  it('should NOT show success toast for auth requests', () => {
    httpClient.post('/api/v1/auth/login', {}).subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/v1/auth/login');
    req.flush({ success: true, message: 'Logged in' });

    expect(notificationServiceSpy.success).not.toHaveBeenCalled();
  });

  it('should show error toast for POST failures with user-friendly message', () => {
    httpClient.post('/api/v1/cart/add', {}).subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/v1/cart/add');
    req.flush({ message: 'Item not found' }, { status: 400, statusText: 'Bad Request' });

    expect(notificationServiceSpy.error).toHaveBeenCalledWith('Item not found');
  });

  it('should translate known error messages to user-friendly text', () => {
    httpClient.post('/api/v1/orders', {}).subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/v1/orders');
    req.flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(notificationServiceSpy.error).toHaveBeenCalledWith(
      'The email or password you entered is incorrect.'
    );
  });

  it('should clear localStorage and navigate to /auth on 401', () => {
    localStorage.setItem('token', 'expired-token');
    localStorage.setItem('user', 'user@test.com');

    httpClient.post('/api/v1/orders', {}).subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/v1/orders');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth']);
  });

  it('should NOT redirect on 401 for public GET book routes', () => {
    localStorage.setItem('token', 'old-token');

    httpClient.get('/api/v1/books?page=0').subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/v1/books?page=0');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should show generic error message for 500 status', () => {
    httpClient.post('/api/v1/orders', {}).subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/v1/orders');
    req.flush({}, { status: 500, statusText: 'Internal Server Error' });

    expect(notificationServiceSpy.error).toHaveBeenCalledWith(
      'A server-side error occurred. Our team has been notified.'
    );
  });

  it('should show connection error message for status 0', () => {
    httpClient.post('/api/v1/orders', {}).subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/v1/orders');
    req.flush(null, { status: 0, statusText: 'Unknown Error' });

    expect(notificationServiceSpy.error).toHaveBeenCalledWith(
      'Unable to connect to the server. Please check your connection.'
    );
  });
});
