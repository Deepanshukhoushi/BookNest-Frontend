import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';

type OrderItemView = {
  title: string;
  quantity: number;
  price: number;
};

type OrderView = {
  orderId: number;
  orderDate: string;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  items: OrderItemView[];
};

@Component({
  selector: 'app-acquisitions',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './acquisitions.component.html',
  styleUrl: './acquisitions.component.css'
})
export class AcquisitionsComponent implements OnInit {
  private authService = inject(AuthService);
  private orderService = inject(OrderService);

  loading = signal(false);
  error = signal('');
  orders = signal<OrderView[]>([]);

  readonly timelineSteps = ['PLACED', 'SHIPPED', 'DELIVERED'] as const;

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (!user) {
      this.error.set('Please login to view orders.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.orderService.getOrdersByUser(user.userId).subscribe({
      next: (orders: unknown[]) => {
        const mapped = (orders as Array<Record<string, any>>).map((order) => this.mapOrder(order));
        this.orders.set(mapped);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Failed to load orders.');
      }
    });
  }

  statusClass(status: string): string {
    return (status || '').toLowerCase();
  }

  isTimelineActive(orderStatus: string, step: string): boolean {
    const current = this.timelineSteps.indexOf((orderStatus || '').toUpperCase() as (typeof this.timelineSteps)[number]);
    const check = this.timelineSteps.indexOf(step as (typeof this.timelineSteps)[number]);
    return current >= 0 && check <= current;
  }

  canCancel(status: string): boolean {
    return ['PLACED', 'CONFIRMED', 'PAID', 'PAYMENT_PENDING', 'PENDING'].includes(status.toUpperCase());
  }

  onCancelOrder(orderId: number): void {
    if (!confirm(`Are you sure you want to cancel order #${orderId}?`)) return;

    this.orderService.cancelOrder(orderId).subscribe({
      next: () => {
        // Refresh orders
        this.ngOnInit();
      },
      error: (err) => {
        alert(err?.error?.message || 'Failed to cancel order.');
      }
    });
  }

  private mapOrder(order: Record<string, any>): OrderView {
    const status = (order['orderStatus'] || order['status'] || 'PLACED').toUpperCase();
    const paymentMethod = order['paymentMethod'] || order['modeOfPayment'] || 'N/A';
    const totalAmount = order['totalAmount'] ?? order['amountPaid'] ?? 0;

    let items: OrderItemView[] = [];
    if (Array.isArray(order['items']) && order['items'].length > 0) {
      items = (order['items'] as Array<Record<string, any>>).map((item: Record<string, any>) => ({
        title: item['bookTitle'] || item['bookName'] || item['title'] || `Book #${item['bookId'] ?? ''}`,
        quantity: item['quantity'] ?? 1,
        price: item['price'] ?? item['amountPaid'] ?? 0
      }));
    } else {
      items = [{
        title: order['bookName'] || `Book #${order['bookId'] ?? ''}`,
        quantity: order['quantity'] ?? 1,
        price: totalAmount
      }];
    }

    return {
      orderId: order['orderId'],
      orderDate: order['orderDate'],
      totalAmount,
      paymentMethod,
      status,
      items
    };
  }
}
