import { environment } from '../../../environments/environment';
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, map, of, Observable, switchMap } from 'rxjs';
import { ApiResponse, User } from '../../shared/models/models';

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLength);
  return decodeURIComponent(
    atob(padded)
      .split('')
      .map(c => '%' + ('00' + c.codePointAt(0)!.toString(16)).slice(-2))
      .join('')
  );
}

type JwtPayload = {
  sub?: string;
  role?: string;
  userId?: number | string;
};

/**
 * Service responsible for user authentication, profile management, and session handling.
 * Manages the authentication state using Angular signals and persists tokens in local storage.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly API_URL = environment.apiBaseUrl + '/auth';
  private readonly USER_API_URL = environment.apiBaseUrl + '/users';
  private readonly gatewayOrigin = environment.apiBaseUrl.startsWith('http') 
    ? new URL(environment.apiBaseUrl).origin 
    : typeof window !== 'undefined' ? window.location.origin : '';

  // State
  private userSignal = signal<User | null>(this.getStoredUser());
  private profileImageVersion = signal(Date.now());
  currentUser = this.userSignal.asReadonly();
  isAuthenticated = computed(() => !!this.userSignal());

  constructor() {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token) {
      this.persistClaimsFromToken(token);
    }
    // If we have a token but no cached user, rehydrate via profile endpoint
    if (token && !storedUser) {
      const userId = this.extractUserIdFromToken(token);
      if (userId) {
        this.fetchProfile(userId).subscribe();
      }
    }
  }

  // Registers a new user with the provided data
  register(userData: unknown) {
    return this.http.post<ApiResponse<string>>(`${this.API_URL}/register`, userData).pipe(
      map(response => response.message)
    );
  }

  // Logs in a user, stores the JWT, and fetches their profile
  login(credentials: { email: string; password: string }) {
    return this.http.post<ApiResponse<string>>(`${this.API_URL}/login`, credentials).pipe(
      map(response => response.data),
      tap(token => {
        localStorage.setItem('token', token);
        this.persistClaimsFromToken(token);
      }),
      switchMap(token => {
        const userId = this.extractUserIdFromToken(token);
        if (userId) {
          return this.fetchProfile(userId);
        }
        return of(null);
      })
    );
  }

  // Logs out the user, clears storage, and redirects to the auth page
  logout() {
    const token = localStorage.getItem('token');
    if (!token) {
      this.clearSession();
      return;
    }

    this.http.post<ApiResponse<null>>(`${this.API_URL}/logout`, {}).subscribe({
      next: () => this.clearSession(),
      error: () => this.clearSession()
    });
  }

  // Retrieves profile data for a specific user ID
  fetchProfile(userId: number): Observable<User> {
    return this.http.get<ApiResponse<User>>(`${this.API_URL}/profile/${userId}`).pipe(
      map(response => response.data),
      tap(user => {
        this.userSignal.set(user);
        this.profileImageVersion.set(Date.now());
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userId', String(user.userId));
        if (user.role) localStorage.setItem('role', user.role);
      })
    );
  }

  // Updates the current user's name and profile image
  updateProfile(payload: { name: string, profileImage?: string }) {
    return this.http.put<ApiResponse<User>>(`${this.USER_API_URL}/update-profile`, payload).pipe(
      map(response => {
        const currentUser = this.userSignal();
        if (currentUser) {
          const merged = { ...currentUser, ...response.data };
          // If we sent a profileImage but the backend response omitted it,
          // apply it manually so the sidebar updates immediately.
          if (payload.profileImage && !merged.profileImage) {
            merged.profileImage = payload.profileImage;
          }
          this.userSignal.set(merged);
          this.profileImageVersion.set(Date.now());
          localStorage.setItem('user', JSON.stringify(merged));
        }
        return response.data;
      })
    );
  }

  uploadProfileImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<string>>(`${this.USER_API_URL}/upload-profile-image`, formData);
  }

  // Updates the password for the currently logged-in user
  changePassword(oldPassword: string, newPassword: string) {
    return this.http.post<ApiResponse<string>>(`${this.USER_API_URL}/change-password`, { oldPassword, newPassword }).pipe(
      map(response => response.message)
    );
  }

  // Initiates the password recovery process by sending an OTP
  sendPasswordResetOtp(email: string) {
    return this.http.post<ApiResponse<string>>(`${this.API_URL}/forgot-password`, null, {
      params: { email }
    });
  }

  // Resets the user's password using the received OTP
  resetPassword(payload: any) {
    return this.http.post<ApiResponse<string>>(`${this.API_URL}/reset-password`, payload);
  }

  resolveImageUrl(path: string | undefined): string | null {
    if (!path) return null;

    const sanitizedPath = path.trim().replace(/\\/g, '/');
    if (!sanitizedPath) return null;
    if (sanitizedPath.startsWith('data:')) return sanitizedPath;

    if (sanitizedPath.startsWith('/assets/') || sanitizedPath.startsWith('assets/')) {
      return sanitizedPath.startsWith('/') ? sanitizedPath : `/${sanitizedPath}`;
    }

    if (sanitizedPath.startsWith('http://') || sanitizedPath.startsWith('https://')) {
      return this.withProfileCacheBust(sanitizedPath);
    }

    const normalizedPath = sanitizedPath.startsWith('/') ? sanitizedPath : `/${sanitizedPath}`;
    return this.withProfileCacheBust(`${this.gatewayOrigin}${encodeURI(normalizedPath)}`);
  }

  private withProfileCacheBust(url: string): string {
    const version = this.profileImageVersion();

    try {
      const parsedUrl = new URL(url, this.gatewayOrigin);
      if (parsedUrl.pathname.startsWith('/uploads/profiles/')) {
        parsedUrl.searchParams.set('v', String(version));
      }
      return parsedUrl.toString();
    } catch {
      return url;
    }
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<ApiResponse<User[]>>(`${this.API_URL}/all`).pipe(
      map(response => response.data)
    );
  }

  updateUserRole(userId: number, role: string): Observable<User> {
    return this.http.put<ApiResponse<User>>(`${this.API_URL}/users/${userId}/role`, { role }).pipe(
      map(response => response.data)
    );
  }

  suspendUser(userId: number): Observable<User> {
    return this.http.put<ApiResponse<User>>(`${this.API_URL}/users/${userId}/suspend`, {}).pipe(
      map(response => response.data)
    );
  }

  reactivateUser(userId: number): Observable<User> {
    return this.http.put<ApiResponse<User>>(`${this.API_URL}/users/${userId}/reactivate`, {}).pipe(
      map(response => response.data)
    );
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<ApiResponse<null>>(`${this.API_URL}/users/${userId}`).pipe(
      map(() => void 0)
    );
  }

  handleOAuthSuccess(token: string): Observable<User | null> {
    localStorage.setItem('token', token);
    try {
      this.persistClaimsFromToken(token);
      const userId = this.extractUserIdFromToken(token);
      if (userId) {
        return this.fetchProfile(userId);
      }
    } catch (e) {
      console.error('Failed to decode OAuth token', e);
    }
    return of(null);
  }

  private persistClaimsFromToken(token: string) {
    try {
      const payload = this.decodeToken(token);
      if (payload.role) localStorage.setItem('role', payload.role);
      if (payload.userId !== undefined && payload.userId !== null) {
        localStorage.setItem('userId', String(payload.userId));
      }
    } catch {
      // Ignore
    }
  }

  private extractUserIdFromToken(token: string): number | null {
    try {
      const payload = this.decodeToken(token);
      if (payload.userId === undefined || payload.userId === null) return null;
      return Number(payload.userId);
    } catch {
      return null;
    }
  }

  private decodeToken(token: string): JwtPayload {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return {};
    const payloadJson = base64UrlDecode(payloadBase64);
    return JSON.parse(payloadJson) as JwtPayload;
  }

  private getStoredUser(): User | null {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  }

  private clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    this.userSignal.set(null);
    this.router.navigate(['/auth']);
  }
}
