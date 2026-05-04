import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { NotificationService } from '../../core/services/notification.service';
import { Invoice, OrderStatus } from '../../shared/models/models';

type UiOrder = {
  orderId: number;
  amount: number;
  paymentMethod: string;
  status: string;
  canCancel: boolean;
};

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './order-history.component.html'
})
export class OrderHistoryComponent implements OnInit {
  private authService = inject(AuthService);
  private orderService = inject(OrderService);
  private notificationService = inject(NotificationService);

  loading = signal(false);
  error = signal('');
  orders = signal<UiOrder[]>([]);

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (!user) {
      this.error.set('Please login to view order history.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.orderService.getOrdersByUser(user.userId).subscribe({
      next: (orders: any[]) => {
        const mapped: UiOrder[] = orders.map((order) => ({
          orderId: order.orderId,
          amount: order.amountPaid ?? order.totalAmount ?? 0,
          paymentMethod: order.paymentMethod ?? order.modeOfPayment ?? 'N/A',
          status: order.orderStatus ?? order.status ?? 'N/A',
          canCancel: [OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.PAID, OrderStatus.PENDING].includes(order.orderStatus)
        }));
        this.orders.set(mapped);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Failed to load order history');
      }
    });
  }

  cancelOrder(orderId: number): void {
    this.orderService.cancelOrder(orderId).subscribe({
      next: (order) => {
        this.orders.set(this.orders().map(existing =>
          existing.orderId === order.orderId
            ? { ...existing, status: order.orderStatus, canCancel: false }
            : existing
        ));
        this.notificationService.success(`Order #${orderId} cancelled.`);
      },
      error: (err) => {
        this.notificationService.error(err?.error?.message || 'Failed to cancel order.');
      }
    });
  }

  viewInvoice(orderId: number): void {
    this.orderService.getInvoice(orderId).subscribe({
      next: (invoice) => this.downloadInvoice(invoice),
      error: () => this.notificationService.error('Failed to fetch invoice.')
    });
  }

  private downloadInvoice(invoice: Invoice): void {
    const contents = [
      `Invoice Number: ${invoice.invoiceNumber}`,
      `Order ID: ${invoice.orderId}`,
      `Book: ${invoice.bookName}`,
      `Quantity: ${invoice.quantity}`,
      `Amount Paid: INR ${invoice.amountPaid}`,
      `Payment Method: ${invoice.paymentMethod}`,
      `Shipping Address: ${invoice.shippingAddress}`
    ].join('\n');

    const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoice.invoiceNumber}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
