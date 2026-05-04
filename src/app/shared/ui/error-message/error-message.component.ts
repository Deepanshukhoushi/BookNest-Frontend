import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-message',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-inline glass-card">
      <div class="error-icon">
        <span class="material-symbols-outlined">error_outline</span>
      </div>
      <div class="error-body">
        <p class="error-text">{{ message }}</p>
        @if (showRetry) {
          <button class="retry-btn" (click)="retry.emit()">
            <span class="material-symbols-outlined">refresh</span>
            Retry Operation
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .error-inline {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding: 2rem;
      background: #fdf2f2;
      border: 1px solid #f8d7da;
      border-radius: 16px;
      margin: 1.5rem 0;
    }
    .error-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: rgba(201, 76, 76, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #c94c4c;
    }
    .error-icon .material-symbols-outlined { font-size: 24px; }
    
    .error-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .error-text {
      color: var(--text-primary);
      font-weight: 500;
      margin: 0;
      font-size: 0.95rem;
      opacity: 0.8;
    }
    .retry-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      width: fit-content;
      transition: background 0.2s, transform 0.1s;
    }
    .retry-btn:hover {
      background: var(--color-primary-light);
    }
    .retry-btn:active {
      transform: scale(0.98);
    }
    .retry-btn .material-symbols-outlined { font-size: 1.1rem; }
  `]
})
export class ErrorMessageComponent {
  @Input() message: string = 'Something went wrong while retrieving data.';
  @Input() showRetry: boolean = true;
  @Output() retry = new EventEmitter<void>();
}
