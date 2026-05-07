import { Component, inject, signal, computed, OnInit } from '@angular/core';
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
export class AuthComponent implements OnInit {
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

  authMode = signal<AuthMode>('login');
  loading = signal(false);
  error = signal('');
  message = signal('');
  showPassword = signal(false);
  
  authData = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobile: ''
  };

  resetData = {
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  };

  isLogin = computed(() => this.authMode() === 'login');

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

    // Client-side validation for registration mode
    if (this.authMode() === 'register') {
      if (!this.authData.fullName || this.authData.fullName.trim().length < 2) {
        this.error.set('Full name must be at least 2 characters.');
        return;
      }
      if (this.authData.password.length < 8) {
        this.error.set('Password must be at least 8 characters.');
        return;
      }
      if (this.authData.password !== this.authData.confirmPassword) {
        this.error.set('Passwords do not match. Please try again.');
        return;
      }
      if (this.authData.mobile && !/^[0-9]{10}$/.test(this.authData.mobile)) {
        this.error.set('Mobile number must be exactly 10 digits.');
        return;
      }
    }

    this.loading.set(true);
    this.message.set('');

    const action: Observable<any> = this.isLogin() 
      ? this.authService.login({ email: this.authData.email, password: this.authData.password })
      : this.authService.register(this.authData);

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
      error: (err: any) => {
        this.loading.set(false);
        const backendMessage = err.error?.message;
        
        // Map technical messages to user-friendly ones
        const messageMap: Record<string, string> = {
          'Invalid credentials': 'The email or password you entered is incorrect. Please try again.',
          'User already exists': 'An account with this email address already exists.',
          'An account with this email address already exists': 'An account with this email address already exists.',
          'Bad Request': 'One or more fields are invalid. Please check your input.'
        };

        const userMessage = (backendMessage && messageMap[backendMessage]) 
          || backendMessage 
          || 'Authentication failed. Please verify your credentials.';

        this.error.set(userMessage);
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
    if (this.resetData.newPassword.length < 8) {
      this.error.set('New password must be at least 8 characters.');
      return;
    }
    if (this.resetData.newPassword !== this.resetData.confirmPassword) {
      this.error.set('Security keys do not match.');
      return;
    }
    if (!/^[0-9]{6}$/.test(this.resetData.otp)) {
      this.error.set('Verification code must be a 6-digit number.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const payload: ResetPasswordPayload = {
      email: this.resetData.email,
      otp: this.resetData.otp,
      newPassword: this.resetData.newPassword
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
    window.location.href = `${gatewayBase}/oauth2/authorization/google`;
  }

  // Initiates the GitHub OAuth2 authentication flow via the API gateway
  loginWithGithub() {
    const gatewayBase = environment.apiBaseUrl.replace('/api/v1', '');
    window.location.href = `${gatewayBase}/oauth2/authorization/github`;
  }
}
