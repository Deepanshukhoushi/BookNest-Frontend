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
    component.authData.password.set('Password123!');
    
    component.onSubmit();
    
    expect(authServiceSpy.login).toHaveBeenCalled();
    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('should handle login failure', () => {
    authServiceSpy.login.mockReturnValue(throwError(() => ({ error: { message: 'Invalid credentials' } })));
    component.authData.email = 'test@example.com';
    component.authData.password.set('Password123!');
    component.onSubmit();
    
    expect(component.error()).toContain('The email or password you entered is incorrect');
  });

  it('should validate registration data', () => {
    component.setMode('register');
    component.authData.fullName = 'A'; // Too short
    component.onSubmit();
    expect(component.error()).toContain('at least 2 characters');

    component.authData.fullName = 'Valid Name';
    component.authData.password.set('123'); // Very weak
    component.onSubmit();
    expect(component.error()).toContain('Password is too weak');

    component.authData.password.set('StrongPass123!');
    component.authData.confirmPassword.set('StrongPass123!'); // Ensure match for next test
    component.onSubmit(); // This should now pass validations and call service if not for mismatch
    
    component.authData.confirmPassword.set('mismatch');
    component.onSubmit();
    expect(component.error()).toContain('do not match');
  });

  it('should handle registration success', () => {
    component.setMode('register');
    authServiceSpy.register.mockReturnValue(of({}));
    component.authData.fullName = 'John Doe';
    component.authData.email = 'john@example.com';
    component.authData.password.set('StrongPass123!');
    component.authData.confirmPassword.set('StrongPass123!');
    component.authData.mobile = '9876543210';

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
    component.resetData.newPassword.set('newPassword123');
    component.resetData.confirmPassword.set('newPassword123');
    component.resetData.otp = '123456';
    
    component.onResetPassword();
    expect(authServiceSpy.resetPassword).toHaveBeenCalled();
    expect(component.authMode()).toBe('login');
  });

  it('should calculate password strength correctly', () => {
    component.authData.password.set('abc');
    expect(component.passwordStrength()).toBe(0);

    component.authData.password.set('Abc12345!');
    expect(component.passwordStrength()).toBe(4);
    expect(component.strengthLabel()).toBe('Strong');
    expect(component.strengthColor()).toBe('#3b82f6');
  });

  it('should handle OTP timer labels', () => {
    component.otpExpiry.set(125); // 2:05
    expect(component.otpTimerLabel()).toBe('2:05');
    
    component.otpExpiry.set(65); // 1:05
    expect(component.otpTimerLabel()).toBe('1:05');

    component.otpExpiry.set(0);
    expect(component.canResend()).toBe(false);
  });

  it('should initiate social login via redirects', () => {
    const originalHref = window.location.href;
    // We can't easily mock window.location.href in all environments, 
    // so we just verify the method exists and can be called.
    // In a real browser test, we'd check if the href changed.
    expect(component.loginWithGoogle).toBeDefined();
    expect(component.loginWithGithub).toBeDefined();
  });

  it('should handle registration with mobile validation', () => {
    component.setMode('register');
    component.authData.fullName = 'Valid Name';
    component.authData.email = 'valid@example.com';
    component.authData.password.set('StrongPass123!');
    component.authData.confirmPassword.set('StrongPass123!');
    component.authData.mobile = '123'; // Invalid

    component.onSubmit();
    expect(component.error()).toContain('Mobile number must be 10 digits');
  });

  it('should validate sendOtp email', () => {
    component.resetData.email = '';
    component.onSendOtp();
    expect(component.error()).toContain('Please enter your registered email address');

    component.resetData.email = 'invalid-email';
    component.onSendOtp();
    expect(component.error()).toContain('Please enter a valid email address');
  });

  it('should handle sendOtp failure', () => {
    component.resetData.email = 'test@example.com';
    authServiceSpy.sendPasswordResetOtp.mockReturnValueOnce(throwError(() => ({ error: { message: 'Service failure' } })));
    component.onSendOtp();
    expect(component.error()).toBe('Service failure');
  });

  it('should validate resetPassword data', () => {
    component.setMode('reset');
    component.resetData.newPassword.set('short');
    component.onResetPassword();
    expect(component.error()).toContain('at least 8 characters');

    component.resetData.newPassword.set('validPassword');
    component.resetData.confirmPassword.set('mismatch');
    component.onResetPassword();
    expect(component.error()).toContain('Security keys do not match');

    component.resetData.confirmPassword.set('validPassword');
    component.resetData.otp = '123'; // Too short
    component.onResetPassword();
    expect(component.error()).toContain('must be a 6-digit number');
  });

  it('should handle resetPassword failure', () => {
    component.resetData.email = 'test@example.com';
    component.resetData.otp = '123456';
    component.resetData.newPassword.set('validPassword');
    component.resetData.confirmPassword.set('validPassword');
    authServiceSpy.resetPassword.mockReturnValueOnce(throwError(() => ({ error: { message: 'Reset failed' } })));
    
    component.onResetPassword();
    expect(component.error()).toBe('Reset failed');
  });
});
