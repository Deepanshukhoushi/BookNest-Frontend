
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

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: routerSpy }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Clear localStorage before each test
    localStorage.clear();
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
  });

  describe('utility methods', () => {
    it('should resolve image URLs correctly', () => {
      expect(service.resolveImageUrl(undefined)).toBeNull();
      expect(service.resolveImageUrl('')).toBeNull();
      expect(service.resolveImageUrl('data:image/png;base64,123')).toBe('data:image/png;base64,123');
      expect(service.resolveImageUrl('http://external.com/img.jpg')).toContain('http://external.com/img.jpg');
      expect(service.resolveImageUrl('/assets/test.png')).toBe('/assets/test.png');
    });
  });
});
