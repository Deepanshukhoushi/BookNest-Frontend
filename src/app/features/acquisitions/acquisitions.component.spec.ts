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

  it('should handle cancel order', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    orderServiceSpy.cancelOrder = vi.fn().mockReturnValue(of({} as any));
    
    component.onCancelOrder(101);
    
    expect(orderServiceSpy.cancelOrder).toHaveBeenCalledWith(101);
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
