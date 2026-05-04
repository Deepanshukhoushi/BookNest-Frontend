import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';


// This component manages and displays toast notifications on the screen
@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <!-- Clear All Option -->
      @if (notificationService.toasts().length > 1) {
        <button class="clear-all-btn" (click)="clearAll()">
          <span class="material-symbols-outlined">delete_sweep</span>
          Clear All
        </button>
      }

      <!-- Loop through and show all active toasts -->
      @for (toast of notificationService.toasts(); track toast.id) {
        <div class="toast" [class]="'toast-' + toast.type" (click)="remove(toast.id)">
          <div class="toast-icon">
            <!-- Display icons based on toast type -->
            @switch (toast.type) {
              @case ('success') { <span class="material-symbols-outlined">check_circle</span> }
              @case ('error') { <span class="material-symbols-outlined">error</span> }
              @case ('warning') { <span class="material-symbols-outlined">warning</span> }
            }
          </div>
          <div class="toast-message">{{ toast.message }}</div>
          <button class="toast-close" (click)="remove(toast.id); $event.stopPropagation()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      min-width: 280px;
      max-width: 420px;
      padding: 1rem 1.25rem;
      background: rgba(30, 33, 31, 0.95);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      gap: 0.875rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-left: 4px solid var(--border-color);
      animation: slideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      cursor: pointer;
      position: relative;
      transition: transform 0.2s, opacity 0.2s;
    }
    .toast:hover {
      transform: translateY(-2px);
    }
    .toast-success { border-left-color: var(--color-success); border-color: rgba(39, 174, 96, 0.3); }
    .toast-error { border-left-color: var(--color-error); border-color: rgba(231, 76, 60, 0.3); }
    .toast-warning { border-left-color: var(--color-warning); border-color: rgba(241, 196, 15, 0.3); }

    .toast-message {
      font-size: 0.875rem;
      font-weight: 500;
      flex: 1;
      padding-right: 1.5rem;
    }
    .toast-icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .toast-icon .material-symbols-outlined { font-size: 1.25rem; }

    .toast-close {
      background: none;
      border: none;
      color: currentColor;
      opacity: 0.5;
      cursor: pointer;
      padding: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: opacity 0.2s, background 0.2s;
      position: absolute;
      right: 0.75rem;
    }
    .toast-close:hover {
      opacity: 1;
      background: rgba(255,255,255,0.05);
    }

    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .clear-all-btn {
      align-self: flex-end;
      background: rgba(30, 33, 31, 0.8);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.7);
      padding: 0.5rem 0.75rem;
      border-radius: 20px;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      transition: all 0.2s;
      pointer-events: auto;
      margin-bottom: 0.25rem;
    }
    .clear-all-btn:hover {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary-light);
    }
    .clear-all-btn .material-symbols-outlined {
      font-size: 1rem;
    }

    /* Handling stacking/exit is simplified for now; Signal update handles DOM removal */
  `]
})
export class ToastContainerComponent {
  protected notificationService = inject(NotificationService);

  // Removes a toast from the active list by its unique ID
  remove(id: string) {
    this.notificationService.removeToast(id);
  }

  clearAll() {
    this.notificationService.clearAllToasts();
  }
}
