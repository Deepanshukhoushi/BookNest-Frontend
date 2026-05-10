import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AcquisitionsComponent } from './acquisitions.component';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

describe('AcquisitionsComponent', () => {
  let component: AcquisitionsComponent;
  let fixture: ComponentFixture<AcquisitionsComponent>;
  let authServiceSpy: any;
  let orderServiceSpy: any;

  beforeEach(async () => {
    authServiceSpy = {
      currentUser: signal({ userId: 1 })
    };
    orderServiceSpy = {
      getOrdersByUser: vi.fn().mockReturnValue(of([])),
      cancelOrder: vi.fn().mockReturnValue(of({} as any))
    };

    await TestBed.configureTestingModule({
      imports: [AcquisitionsComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: ActivatedRoute, useValue: { params: of({}) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AcquisitionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load orders on init', () => {
    expect(orderServiceSpy.getOrdersByUser).toHaveBeenCalledWith(1);
  });

  it('should map order data correctly', () => {
    const rawOrder = {
      orderId: 101,
      orderStatus: 'DELIVERED',
      amountPaid: 500,
      bookName: 'Test Book',
      quantity: 1,
      orderDate: '2023-01-01'
    };
    orderServiceSpy.getOrdersByUser = vi.fn().mockReturnValue(of([rawOrder]));
    
    component.ngOnInit();
    
    expect(component.orders().length).toBe(1);
    expect(component.orders()[0].status).toBe('DELIVERED');
    expect(component.orders()[0].items[0].title).toBe('Test Book');
  });

  it('should map nested order items when present', () => {
    orderServiceSpy.getOrdersByUser = vi.fn().mockReturnValue(of([{
      orderId: 202,
      orderStatus: 'PLACED',
      totalAmount: 900,
      paymentMethod: 'ONLINE',
      orderDate: '2023-02-01',
      items: [
        { bookTitle: 'Book One', quantity: 2, price: 300 },
        { bookName: 'Book Two', quantity: 1, amountPaid: 300 }
      ]
    }]));

    component.ngOnInit();

    expect(component.orders()[0].items).toEqual([
      { title: 'Book One', quantity: 2, price: 300 },
      { title: 'Book Two', quantity: 1, price: 300 }
    ]);
  });

  it('should show a login message when no user is available', async () => {
    authServiceSpy.currentUser.set(null);

    const noUserFixture = TestBed.createComponent(AcquisitionsComponent);
    const noUserComponent = noUserFixture.componentInstance;
    noUserFixture.detectChanges();

    expect(noUserComponent.error()).toBe('Please login to view orders.');
    expect(orderServiceSpy.getOrdersByUser).not.toHaveBeenCalledWith(undefined);
  });

  it('should surface order loading errors', () => {
    orderServiceSpy.getOrdersByUser = vi.fn().mockReturnValue(
      throwError(() => ({ error: { message: 'Load failed' } }))
    );

    component.ngOnInit();

    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('Load failed');
  });

  it('should handle cancel order', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    orderServiceSpy.cancelOrder = vi.fn().mockReturnValue(of({} as any));
    
    component.onCancelOrder(101);
    
    expect(orderServiceSpy.cancelOrder).toHaveBeenCalledWith(101);
  });

  it('should not cancel an order when confirmation is declined', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    component.onCancelOrder(101);

    expect(orderServiceSpy.cancelOrder).not.toHaveBeenCalled();
  });

  it('should alert when order cancellation fails', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    orderServiceSpy.cancelOrder = vi.fn().mockReturnValue(
      throwError(() => ({ error: { message: 'Cancel failed' } }))
    );

    component.onCancelOrder(101);

    expect(alertSpy).toHaveBeenCalledWith('Cancel failed');
  });

  it('should determine status classes', () => {
    expect(component.statusClass('DELIVERED')).toBe('delivered');
  });

  it('should check if timeline is active', () => {
    expect(component.isTimelineActive('SHIPPED', 'PLACED')).toBe(true);
    expect(component.isTimelineActive('SHIPPED', 'SHIPPED')).toBe(true);
    expect(component.isTimelineActive('SHIPPED', 'DELIVERED')).toBe(false);
  });

  it('should check if order can be cancelled', () => {
    expect(component.canCancel('PLACED')).toBe(true);
    expect(component.canCancel('SHIPPED')).toBe(false);
  });
});
