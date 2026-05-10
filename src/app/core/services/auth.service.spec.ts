
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { ApiResponse, User, Role, AuthProvider } from '../../shared/models/models';
import { of } from 'rxjs';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: any;

  const mockUser: User = {
    userId: 1,
    fullName: 'Test User',
    email: 'test@example.com',
    role: Role.USER,
    provider: AuthProvider.LOCAL,
    mobile: '1234567890',
    createdAt: new Date().toISOString()
  };

  const mockToken = 'header.' + btoa(JSON.stringify({ userId: 1, role: 'USER' })) + '.signature';

  beforeEach(() => {
    routerSpy = { navigate: vi.fn() };
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: routerSpy }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should login and fetch profile', () => {
      const credentials = { email: 'test@example.com', password: 'password' };
      const loginResponse: ApiResponse<string> = { data: mockToken, message: 'Success', success: true };
      const profileResponse: ApiResponse<User> = { data: mockUser, message: 'Success', success: true };

      service.login(credentials).subscribe(user => {
        expect(user).toEqual(mockUser);
        expect(localStorage.getItem('token')).toBe(mockToken);
        expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
      });

      const loginReq = httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`);
      expect(loginReq.request.method).toBe('POST');
      loginReq.flush(loginResponse);

      const profileReq = httpMock.expectOne(`${environment.apiBaseUrl}/auth/profile/1`);
      expect(profileReq.request.method).toBe('GET');
      profileReq.flush(profileResponse);
    });
  });

  describe('logout', () => {
    it('should clear session and navigate to auth', () => {
      localStorage.setItem('token', 'some-token');
      localStorage.setItem('user', JSON.stringify(mockUser));

      service.logout();

      const logoutReq = httpMock.expectOne(`${environment.apiBaseUrl}/auth/logout`);
      expect(logoutReq.request.method).toBe('POST');
      logoutReq.flush({ success: true });

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth']);
    });

    it('should clear session even if logout call fails', () => {
      localStorage.setItem('token', 'some-token');
      service.logout();

      const logoutReq = httpMock.expectOne(`${environment.apiBaseUrl}/auth/logout`);
      logoutReq.error(new ErrorEvent('Network error'));

      expect(localStorage.getItem('token')).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth']);
    });
  });

  describe('profile management', () => {
    it('should fetch profile and update state', () => {
      const profileResponse: ApiResponse<User> = { data: mockUser, message: 'Success', success: true };

      service.fetchProfile(1).subscribe(user => {
        expect(user).toEqual(mockUser);
        expect(service.currentUser()).toEqual(mockUser);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/profile/1`);
      req.flush(profileResponse);
    });

    it('should update profile', () => {
      const updatedUser = { ...mockUser, fullName: 'Updated Name' };
      const updateResponse: ApiResponse<User> = { data: updatedUser, message: 'Success', success: true };

      // Set initial user
      service['userSignal'].set(mockUser);

      service.updateProfile({ name: 'Updated Name' }).subscribe(user => {
        expect(user).toEqual(updatedUser);
        expect(service.currentUser()?.fullName).toBe('Updated Name');
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/users/update-profile`);
      expect(req.request.method).toBe('PUT');
      req.flush(updateResponse);
    });

    it('should preserve optimistic profile image when backend omits it', () => {
      const updateResponse: ApiResponse<User> = {
        data: { ...mockUser, fullName: 'Updated Name', profileImage: undefined },
        message: 'Success',
        success: true
      };

      service['userSignal'].set(mockUser);

      service.updateProfile({ name: 'Updated Name', profileImage: 'avatar.png' }).subscribe(user => {
        expect(user.fullName).toBe('Updated Name');
        expect(service.currentUser()?.profileImage).toBe('avatar.png');
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/users/update-profile`);
      req.flush(updateResponse);
    });
  });

  describe('utility methods', () => {
    it('should resolve image URLs correctly', () => {
      expect(service.resolveImageUrl(undefined)).toBeNull();
      expect(service.resolveImageUrl('')).toBeNull();
      expect(service.resolveImageUrl('data:image/png;base64,123')).toBe('data:image/png;base64,123');
      expect(service.resolveImageUrl('http://external.com/img.jpg')).toContain('http://external.com/img.jpg');
      expect(service.resolveImageUrl('/assets/test.png')).toBe('/assets/test.png');
    });

    it('getStoredUser should return null on invalid JSON', () => {
      localStorage.setItem('user', '{broken-json');

      expect((service as any).getStoredUser()).toBeNull();
    });

    it('should resolve uploaded profile filenames through the gateway', () => {
      const resolved = service.resolveImageUrl('avatar.png');

      expect(resolved).toContain('/uploads/profiles/avatar.png');
      expect(resolved).toContain('?v=');
    });

    it('should handle OAuth success by fetching the profile', () => {
      const profileResponse: ApiResponse<User> = { data: mockUser, message: 'Success', success: true };

      service.handleOAuthSuccess(mockToken).subscribe(user => {
        expect(user).toEqual(mockUser);
        expect(localStorage.getItem('token')).toBe(mockToken);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/profile/1`);
      req.flush(profileResponse);
    });

    it('should return null for OAuth tokens without a user id', () => {
      const tokenWithoutUserId = 'header.' + btoa(JSON.stringify({ role: 'USER' })) + '.signature';

      service.handleOAuthSuccess(tokenWithoutUserId).subscribe(user => {
        expect(user).toBeNull();
      });

      httpMock.expectNone(`${environment.apiBaseUrl}/auth/profile/1`);
    });

    it('should return null when extracting a user id from a malformed token', () => {
      expect((service as any).extractUserIdFromToken('malformed-token')).toBeNull();
    });
  });

  describe('admin user actions', () => {
    it('should fetch all users', () => {
      service.getAllUsers().subscribe(users => {
        expect(users).toEqual([mockUser]);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/all`);
      expect(req.request.method).toBe('GET');
      req.flush({ data: [mockUser], message: 'Success', success: true } as ApiResponse<User[]>);
    });

    it('should update a user role', () => {
      service.updateUserRole(1, 'ADMIN').subscribe(user => {
        expect(user.role).toBe('ADMIN');
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/users/1/role`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ role: 'ADMIN' });
      req.flush({ data: { ...mockUser, role: 'ADMIN' }, message: 'Success', success: true } as ApiResponse<User>);
    });

    it('should suspend a user', () => {
      service.suspendUser(1).subscribe(user => {
        expect(user.userId).toBe(1);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/users/1/suspend`);
      expect(req.request.method).toBe('PUT');
      req.flush({ data: mockUser, message: 'Success', success: true } as ApiResponse<User>);
    });

    it('should reactivate a user', () => {
      service.reactivateUser(1).subscribe(user => {
        expect(user.userId).toBe(1);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/users/1/reactivate`);
      expect(req.request.method).toBe('PUT');
      req.flush({ data: mockUser, message: 'Success', success: true } as ApiResponse<User>);
    });

    it('should delete a user', () => {
      service.deleteUser(1).subscribe(value => {
        expect(value).toBeUndefined();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/users/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ data: null, message: 'Success', success: true } as ApiResponse<null>);
    });
  });

  describe('session refresh and hydration', () => {
    it('should refresh the token and persist its claims', () => {
      const refreshedToken = 'header.' + btoa(JSON.stringify({ userId: 2, role: 'ADMIN' })) + '.signature';

      service.refresh().subscribe(token => {
        expect(token).toBe(refreshedToken);
        expect(localStorage.getItem('token')).toBe(refreshedToken);
        expect(localStorage.getItem('role')).toBe('ADMIN');
        expect(localStorage.getItem('userId')).toBe('2');
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBe(true);
      req.flush({ data: refreshedToken, message: 'Success', success: true } as ApiResponse<string>);
    });

    it('should fetch the profile on startup when a token exists without a cached user', () => {
      TestBed.resetTestingModule();
      localStorage.clear();
      localStorage.setItem('token', mockToken);

      const startupRouterSpy = { navigate: vi.fn() };
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: Router, useValue: startupRouterSpy }
        ]
      });

      const hydratedService = TestBed.inject(AuthService);
      const hydratedHttpMock = TestBed.inject(HttpTestingController);

      expect(hydratedService.isAuthenticated()).toBe(false);

      const req = hydratedHttpMock.expectOne(`${environment.apiBaseUrl}/auth/profile/1`);
      expect(req.request.method).toBe('GET');
      req.flush({ data: mockUser, message: 'Success', success: true } as ApiResponse<User>);

      expect(hydratedService.currentUser()).toEqual(mockUser);
      hydratedHttpMock.verify();
    });
  });
});
