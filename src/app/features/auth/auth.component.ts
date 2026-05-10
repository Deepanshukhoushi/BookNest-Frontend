import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

function isSafeReturnUrl(value: string | null): value is string {
  return !!value && value.startsWith('/') && !value.startsWith('//');
}

export type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

/** Typed payload for the reset-password API call */
interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}

/**
 * Component handling user authentication flows.
 * Manages login, registration, password recovery, and social OAuth2 integrations.
 */
@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  
  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/']);
    }

    const error = this.route.snapshot.queryParamMap.get('error');
    if (error) {
      this.error.set(error);
    }
  }

  ngOnDestroy() {
    if (this.otpInterval) clearInterval(this.otpInterval);
  }

  authMode = signal<AuthMode>('login');
  loading = signal(false);
  error = signal('');
  message = signal('');
  showPassword = signal(false);
  
  authData = {
    fullName: '',
    email: '',
    password: signal(''),
    confirmPassword: signal(''),
    mobile: ''
  };

  resetData = {
    email: '',
    otp: '',
    newPassword: signal(''),
    confirmPassword: signal('')
  };

  isLogin = computed(() => this.authMode() === 'login');

  passwordStrength = computed(() => {
    const p = this.authData.password();
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score; // 0–4
  });

  strengthLabel = computed(() =>
    ['', 'Weak', 'Fair', 'Good', 'Strong'][this.passwordStrength()]
  );

  strengthColor = computed(() => {
    const s = this.passwordStrength();
    if (s <= 1) return '#ef4444'; // red-500
    if (s === 2) return '#f59e0b'; // amber-500
    if (s === 3) return '#10b981'; // emerald-500
    return '#3b82f6'; // blue-500
  });

  otpExpiry = signal(0);
  otpTimerLabel = computed(() => {
    const m = Math.floor(this.otpExpiry() / 60);
    const s = this.otpExpiry() % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  });

  canResend = computed(() => this.otpExpiry() > 0 && this.otpExpiry() <= 540); // 60s elapsed

  private otpInterval?: ReturnType<typeof setInterval>;

  private startOtpTimer() {
    if (this.otpInterval) clearInterval(this.otpInterval);
    this.otpExpiry.set(600); // 10 minutes
    this.otpInterval = setInterval(() => {
      this.otpExpiry.update(v => {
        if (v <= 1) {
          if (this.otpInterval) clearInterval(this.otpInterval);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  }

  // Sets the current authentication view (login, register, etc.) and clears alerts
  setMode(mode: AuthMode) {
    this.authMode.set(mode);
    this.error.set('');
    this.message.set('');
  }

  // Toggles the view between login and registration modes
  toggleMode() {
    this.setMode(this.isLogin() ? 'register' : 'login');
  }

  // Handles the main form submission for authenticating or creating a new account
  onSubmit() {
    this.error.set('');
    const validationError = this.getSubmitValidationError();
    if (validationError) {
      this.error.set(validationError);
      return;
    }

    this.loading.set(true);
    this.message.set('');

    const action = this.buildSubmitAction();

    action.subscribe({
      next: () => {
        this.loading.set(false);
        if (this.isLogin()) {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          const target = isSafeReturnUrl(returnUrl) ? returnUrl : '/';
          this.router.navigateByUrl(target);
        } else {
          this.setMode('login');
          this.message.set('Registration successful! You can now access the library.');
        }
      },
      error: (err: { error?: { message?: string } }) => {
        this.loading.set(false);
        this.error.set(this.getAuthErrorMessage(err?.error?.message));
      }
    });
  }

  // Requests a password reset verification code to be sent to the user's email
  onSendOtp() {
    if (!this.resetData.email) {
      this.error.set('Please enter your registered email address.');
      return;
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(this.resetData.email)) {
      this.error.set('Please enter a valid email address.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.authService.sendPasswordResetOtp(this.resetData.email).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.setMode('reset');
        this.startOtpTimer();
        this.message.set(res.message || 'Verification code dispatched to your inbox.');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Failed to dispatch verification code.');
      }
    });
  }

  // Finalizes the password reset process using the verification code and new password
  onResetPassword() {
    if (this.resetData.newPassword().length < 8) {
      this.error.set('New password must be at least 8 characters.');
      return;
    }
    if (this.resetData.newPassword() !== this.resetData.confirmPassword()) {
      this.error.set('Security keys do not match.');
      return;
    }
    if (!/^\d{6}$/.test(this.resetData.otp)) {
      this.error.set('Verification code must be a 6-digit number.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const payload: ResetPasswordPayload = {
      email: this.resetData.email,
      otp: this.resetData.otp,
      newPassword: this.resetData.newPassword()
    };

    this.authService.resetPassword(payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.setMode('login');
        this.message.set(res.message || 'Security vault updated. You may now login.');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Failed to update security vault.');
      }
    });
  }

  // Initiates the Google OAuth2 authentication flow via the API gateway
  loginWithGoogle() {
    const gatewayBase = environment.apiBaseUrl.replace('/api/v1', '');
    globalThis.location.href = `${gatewayBase}/oauth2/authorization/google`;
  }

  // Initiates the GitHub OAuth2 authentication flow via the API gateway
  loginWithGithub() {
    const gatewayBase = environment.apiBaseUrl.replace('/api/v1', '');
    globalThis.location.href = `${gatewayBase}/oauth2/authorization/github`;
  }

  private getSubmitValidationError(): string | null {
    return this.isLogin() ? this.validateLoginForm() : this.validateRegistrationForm();
  }

  private validateLoginForm(): string | null {
    if (!this.authData.email.trim()) {
      return 'Please enter your email address.';
    }
    if (!this.isValidEmail(this.authData.email)) {
      return 'Please enter a valid email address.';
    }
    if (!this.authData.password()) {
      return 'Please enter your password.';
    }
    return null;
  }

  private validateRegistrationForm(): string | null {
    if (!this.authData.fullName || this.authData.fullName.trim().length < 2) {
      return 'Full name must be at least 2 characters.';
    }
    if (this.passwordStrength() < 3) {
      return 'Password is too weak. Please use uppercase, numbers, and special characters.';
    }
    if (this.authData.password() !== this.authData.confirmPassword()) {
      return 'Passwords do not match. Please try again.';
    }
    if (!this.isValidEmail(this.authData.email)) {
      return 'Please enter a valid email address.';
    }
    if (this.authData.mobile && !/^[6-9]\d{9}$/.test(this.authData.mobile)) {
      return 'Mobile number must be 10 digits and start with 6-9.';
    }
    return null;
  }

  private buildSubmitAction(): Observable<unknown> {
    if (this.isLogin()) {
      return this.authService.login({
        email: this.authData.email,
        password: this.authData.password()
      });
    }

    return this.authService.register({
      ...this.authData,
      password: this.authData.password(),
      confirmPassword: this.authData.confirmPassword()
    });
  }

  private isValidEmail(email: string): boolean {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  }

  private getAuthErrorMessage(backendMessage?: string): string {
    const messageMap: Record<string, string> = {
      'Invalid credentials': 'The email or password you entered is incorrect. Please try again.',
      'User already exists': 'An account with this email address already exists.',
      'An account with this email address already exists': 'An account with this email address already exists.',
      'Bad Request': 'One or more fields are invalid. Please check your input.'
    };

    return (backendMessage && messageMap[backendMessage])
      || backendMessage
      || 'Authentication failed. Please verify your credentials.';
  }
}
