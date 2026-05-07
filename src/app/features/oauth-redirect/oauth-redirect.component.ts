import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, take } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

function readTokenFromFragment(fragment: string | null): string | null {
  if (!fragment) return null;
  const params = new URLSearchParams(fragment);
  return (
    params.get('token') ||
    params.get('access_token') ||
    params.get('id_token') ||
    null
  );
}

function isSafeReturnUrl(value: string | null): value is string {
  return !!value && value.startsWith('/') && !value.startsWith('//');
}

@Component({
  selector: 'app-oauth-redirect',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oauth-redirect.component.html',
  styleUrl: './oauth-redirect.component.css'
})
export class OAuthRedirectComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  loading = signal(true);

  ngOnInit() {
    combineLatest([this.route.queryParamMap, this.route.fragment])
      .pipe(take(1))
      .subscribe(([query, fragment]) => {
        const error = query.get('error');
        if (error) {
          this.loading.set(false);
          this.router.navigate(['/auth'], { 
            queryParams: { error }, 
            replaceUrl: true 
          });
          return;
        }

        const tokenFromQuery = query.get('token') || query.get('access_token');
        const tokenFromFragment = readTokenFromFragment(fragment);
        const token = tokenFromQuery || tokenFromFragment;

        if (!token) {
          this.loading.set(false);
          this.router.navigate(['/auth'], { replaceUrl: true });
          return;
        }

        // Persist token immediately; AuthService will also persist it.
        localStorage.setItem('token', token);

        const returnUrl = query.get('returnUrl');
        const target = isSafeReturnUrl(returnUrl) ? returnUrl : '/';

        this.authService.handleOAuthSuccess(token).subscribe({
          next: () => this.router.navigateByUrl(target, { replaceUrl: true }),
          error: () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            this.loading.set(false);
            this.router.navigate(['/auth'], { replaceUrl: true });
          }
        });
      });
  }
}

