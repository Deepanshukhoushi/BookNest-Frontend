import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

/**
 * Styled 404 error page — "Chapter Not Found".
 * Displayed when a user navigates to a URL that matches no known route.
 */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="not-found-container">
      <div class="not-found-content">
        <div class="error-badge">404</div>
        <h1>Chapter Not Found</h1>
        <p class="subtitle">
          It seems this page has gone out of print. The chapter you're looking for
          doesn't exist or may have been moved to a different shelf.
        </p>
        <div class="cta-row">
          <button class="btn-primary" (click)="goHome()">
            <span class="material-symbols-outlined">home</span>
            Back to Library
          </button>
          <button class="btn-ghost" (click)="goBack()">
            <span class="material-symbols-outlined">arrow_back</span>
            Previous Page
          </button>
        </div>
        <div class="decorative-books">
          <span class="book-icon">📚</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--color-background, #0f0a14);
    }

    .not-found-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
      background: radial-gradient(ellipse at center, rgba(173,20,87,0.08) 0%, transparent 70%);
    }

    .not-found-content {
      text-align: center;
      max-width: 520px;
    }

    .error-badge {
      display: inline-block;
      font-size: clamp(5rem, 15vw, 8rem);
      font-weight: 900;
      letter-spacing: -0.04em;
      background: linear-gradient(135deg, var(--color-primary, #ad1457) 0%, #d4a017 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
      margin-bottom: 1rem;
    }

    h1 {
      font-size: clamp(1.5rem, 4vw, 2.5rem);
      font-weight: 700;
      color: var(--text-primary, #f5f0e8);
      margin-bottom: 1rem;
    }

    .subtitle {
      font-size: 1rem;
      color: var(--text-secondary, #a09080);
      line-height: 1.7;
      margin-bottom: 2.5rem;
    }

    .cta-row {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: 3rem;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.75rem;
      background: var(--color-primary, #ad1457);
      color: white;
      border: none;
      border-radius: 999px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 20px rgba(173,20,87,0.3);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 28px rgba(173,20,87,0.45);
    }

    .btn-ghost {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.75rem;
      background: transparent;
      color: var(--text-secondary, #a09080);
      border: 1px solid var(--border-color, rgba(255,255,255,0.1));
      border-radius: 999px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s, color 0.2s;
    }

    .btn-ghost:hover {
      background: rgba(255,255,255,0.06);
      color: var(--text-primary, #f5f0e8);
    }

    .material-symbols-outlined {
      font-size: 1.1rem;
    }

    .decorative-books {
      font-size: 4rem;
      opacity: 0.15;
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-12px); }
    }
  `]
})
export class NotFoundComponent {
  private router = inject(Router);

  goHome() {
    this.router.navigate(['/']);
  }

  goBack() {
    window.history.back();
  }
}
