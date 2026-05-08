import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrderHistoryComponent } from './order-history.component';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { NotificationService } from '../../core/services/notification.service';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { OrderStatus } from '../../shared/models/models';

describe('OrderHistoryComponent', () => {
  let component: OrderHistoryComponent;
  let fixture: ComponentFixture<OrderHistoryComponent>;
  let authServiceSpy: any;
  let orderServiceSpy: any;
  let notificationServiceSpy: any;

  beforeEach(async () => {
    authServiceSpy = {
      currentUser: signal({ userId: 1 })
    };
    orderServiceSpy = {
      getOrdersByUser: vi.fn().mockReturnValue(of([])),
      cancelOrder: vi.fn().mockReturnValue(of({})),
      getInvoice: vi.fn().mockReturnValue(of({}))
    };
    notificationServiceSpy = {
      success: vi.fn(),
      error: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [OrderHistoryComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrderHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load orders on init', () => {
    const mockOrders = [
      { orderId: 1, amountPaid: 100, paymentMethod: 'COD', orderStatus: OrderStatus.PLACED }
    ];
    orderServiceSpy.getOrdersByUser.mockReturnValue(of(mockOrders));
    component.ngOnInit();
    expect(component.orders().length).toBe(1);
    expect(component.orders()[0].canCancel).toBe(true);
  });

  it('should handle cancelOrder', () => {
    const initialOrders = [{ orderId: 1, status: 'PLACED', canCancel: true } as any];
    component.orders.set(initialOrders);
    orderServiceSpy.cancelOrder.mockReturnValue(of({ orderId: 1, orderStatus: 'CANCELLED' }));
    
    component.cancelOrder(1);
    
    expect(orderServiceSpy.cancelOrder).toHaveBeenCalledWith(1);
    expect(component.orders()[0].status).toBe('CANCELLED');
    expect(component.orders()[0].canCancel).toBe(false);
    expect(notificationServiceSpy.success).toHaveBeenCalled();
  });

  it('should handle viewInvoice', () => {
    const mockInvoice = { invoiceNumber: 'INV1', orderId: 1 } as any;
    orderServiceSpy.getInvoice.mockReturnValue(of(mockInvoice));
    
    // Mock URL.createObjectURL and revoke
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:url');
    globalThis.URL.revokeObjectURL = vi.fn();
    
    component.viewInvoice(1);
    
    expect(orderServiceSpy.getInvoice).toHaveBeenCalledWith(1);
  });

  it('should handle error if not logged in', () => {
    authServiceSpy.currentUser.set(null);
    component.ngOnInit();
    expect(component.error()).toBe('Please login to view order history.');
  });
});
