import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthComponent } from './auth.component';
import { AuthService } from '../../core/services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

describe('AuthComponent', () => {
  let component: AuthComponent;
  let fixture: ComponentFixture<AuthComponent>;
  let authServiceSpy: any;
  let routerSpy: any;
  let activatedRouteSpy: any;

  beforeEach(async () => {
    authServiceSpy = {
      isAuthenticated: vi.fn().mockReturnValue(false),
      login: vi.fn(),
      register: vi.fn(),
      sendPasswordResetOtp: vi.fn(),
      resetPassword: vi.fn()
    };
    routerSpy = {
      navigate: vi.fn(),
      navigateByUrl: vi.fn()
    };
    activatedRouteSpy = {
      snapshot: {
        queryParamMap: {
          get: vi.fn().mockReturnValue(null)
        }
      }
    };

    await TestBed.configureTestingModule({
      imports: [AuthComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should redirect if already authenticated', () => {
    authServiceSpy.isAuthenticated.mockReturnValue(true);
    component.ngOnInit();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should toggle auth mode', () => {
    expect(component.authMode()).toBe('login');
    component.toggleMode();
    expect(component.authMode()).toBe('register');
    component.toggleMode();
    expect(component.authMode()).toBe('login');
  });

  it('should handle login success', () => {
    authServiceSpy.login.mockReturnValue(of({}));
    component.authData.email = 'test@example.com';
    component.authData.password = 'password123';
    
    component.onSubmit();
    
    expect(authServiceSpy.login).toHaveBeenCalled();
    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('should handle login failure', () => {
    authServiceSpy.login.mockReturnValue(throwError(() => ({ error: { message: 'Invalid credentials' } })));
    component.onSubmit();
    
    expect(component.error()).toContain('The email or password you entered is incorrect');
  });

  it('should validate registration data', () => {
    component.setMode('register');
    component.authData.fullName = 'A'; // Too short
    component.onSubmit();
    expect(component.error()).toContain('at least 2 characters');

    component.authData.fullName = 'Valid Name';
    component.authData.password = 'short';
    component.onSubmit();
    expect(component.error()).toContain('at least 8 characters');

    component.authData.password = 'password123';
    component.authData.confirmPassword = 'mismatch';
    component.onSubmit();
    expect(component.error()).toContain('do not match');
  });

  it('should handle registration success', () => {
    component.setMode('register');
    authServiceSpy.register.mockReturnValue(of({}));
    component.authData = {
      fullName: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      mobile: '9876543210'
    };

    component.onSubmit();
    
    expect(authServiceSpy.register).toHaveBeenCalled();
    expect(component.authMode()).toBe('login');
    expect(component.message()).toContain('successful');
  });

  it('should handle password reset flow', () => {
    component.setMode('forgot');
    authServiceSpy.sendPasswordResetOtp.mockReturnValue(of({ message: 'OTP Sent' }));
    component.resetData.email = 'test@example.com';
    
    component.onSendOtp();
    
    expect(authServiceSpy.sendPasswordResetOtp).toHaveBeenCalledWith('test@example.com');
    expect(component.authMode()).toBe('reset');

    // Finalize reset
    authServiceSpy.resetPassword.mockReturnValue(of({ message: 'Success' }));
    component.resetData.newPassword = 'newPassword123';
    component.resetData.confirmPassword = 'newPassword123';
    component.resetData.otp = '123456';
    
    component.onResetPassword();
    expect(authServiceSpy.resetPassword).toHaveBeenCalled();
    expect(component.authMode()).toBe('login');
  });
});
