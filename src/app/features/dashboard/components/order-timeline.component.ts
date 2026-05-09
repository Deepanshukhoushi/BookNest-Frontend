import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Order, OrderStatusLog } from '../../../shared/models/models';

@Component({
  selector: 'app-order-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="timeline-container">
      <div class="steps-progress">
        <div *ngFor="let step of steps; let i = index" class="step-wrapper" [style.flex]="i < steps.length - 1 ? '1' : '0'">
          <!-- Progress Line -->
          <div class="step-line" *ngIf="i < steps.length - 1">
            <div class="line-fill" [class.filled]="isCompleted(steps[i+1])"></div>
          </div>
          
          <!-- Step Icon and Label -->
          <div class="step-node" [class.active]="isActive(step)" [class.completed]="isCompleted(step)">
            <div class="step-icon-wrapper">
              <span class="material-symbols-outlined">{{ getIcon(step) }}</span>
            </div>
            
            <div class="step-label">
              <p class="step-title">{{ formatLabel(step) }}</p>
              <p class="step-time" *ngIf="getTimestamp(step)">
                {{ getTimestamp(step) | date:'dd/MM/yyyy':'+0530' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .timeline-container {
      padding: 1.5rem 0.5rem 2.5rem;
      width: 100%;
    }

    .steps-progress {
      display: flex;
      align-items: flex-start;
      width: 90%; /* Span most of the card but not all the way */
    }

    .step-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .step-line {
      position: absolute;
      top: 13px; /* Center of smaller icon */
      left: 13px;
      right: -13px;
      height: 2px;
      background: rgba(127, 22, 53, 0.1);
      z-index: 1;
    }

    .line-fill {
      height: 100%;
      width: 0;
      background: var(--color-primary);
      transition: width 0.6s ease;
    }

    .line-fill.filled {
      width: 100%;
    }

    .step-node {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 26px;
    }

    .step-icon-wrapper {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: white;
      border: 1.5px solid rgba(127, 22, 53, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.4s ease;
    }

    .step-icon-wrapper span {
      font-size: 0.9rem;
      color: var(--color-primary);
      opacity: 0.4;
    }

    .step-node.completed .step-icon-wrapper {
      background: var(--color-primary);
      border-color: var(--color-primary);
    }

    .step-node.completed .step-icon-wrapper span {
      color: white;
      opacity: 1;
      font-variation-settings: 'FILL' 1;
    }

    .step-node.active .step-icon-wrapper {
      border-color: var(--color-primary);
      border-width: 2px;
    }

    .step-node.active .step-icon-wrapper span {
      color: var(--color-primary);
      opacity: 1;
    }

    .step-label {
      position: absolute;
      top: 32px;
      text-align: center;
      width: 80px;
    }

    .step-title {
      font-weight: 700;
      font-size: 10px;
      color: var(--color-primary);
      margin: 0;
      white-space: nowrap;
      text-transform: uppercase;
      letter-spacing: 0.01em;
      opacity: 0.35;
    }

    .step-node.active .step-title,
    .step-node.completed .step-title {
      opacity: 0.9;
    }

    .step-time {
      font-size: 9px;
      color: var(--on-surface-variant);
      margin-top: 1px;
      font-weight: 500;
    }
  `]
})
export class OrderTimelineComponent {
  @Input() order!: Order;

  get steps(): string[] {
    if (this.order.paymentMethod === 'COD') {
      return ['PLACED', 'CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    }
    // For WALLET/ONLINE, PAID usually happens immediately after PLACED
    return ['PLACED', 'PAID', 'CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  }

  isCompleted(step: string): boolean {
    const currentSteps = this.steps;
    const statusIdx = currentSteps.indexOf(this.order.orderStatus);
    const stepIdx = currentSteps.indexOf(step);
    
    // If current status is not in the list (e.g. CANCELLED), or step is not in the list
    if (statusIdx === -1 || stepIdx === -1) {
      // Specialized logic: if order is PAID, then PLACED is definitely completed
      if (this.order.orderStatus === 'PAID' && step === 'PLACED') return true;
      return false;
    }
    
    return stepIdx <= statusIdx && this.order.orderStatus !== 'CANCELLED' && this.order.orderStatus !== 'FAILED';
  }

  isActive(step: string): boolean {
    return this.order.orderStatus === step;
  }

  getTimestamp(step: string): string | null {
    const log = this.order.statusHistory?.find((h: OrderStatusLog) => h.status === step);
    return log ? log.updatedAt : null;
  }

  getIcon(step: string): string {
    switch (step) {
      case 'PLACED': return 'shopping_bag';
      case 'CONFIRMED': return 'verified';
      case 'PAID': return 'payments';
      case 'SHIPPED': return 'local_shipping';
      case 'OUT_FOR_DELIVERY': return 'delivery_dining';
      case 'DELIVERED': return 'check_circle';
      default: return 'help';
    }
  }

  formatLabel(step: string): string {
    return step.replaceAll('_', ' ').toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
