import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrderTimelineComponent } from './order-timeline.component';
import { OrderStatus } from '../../../shared/models/models';

describe('OrderTimelineComponent', () => {
  let component: OrderTimelineComponent;
  let fixture: ComponentFixture<OrderTimelineComponent>;

  const mockOrder = {
    orderId: 1,
    orderStatus: 'PLACED',
    paymentMethod: 'WALLET',
    statusHistory: [
      { status: 'PLACED', updatedAt: '2023-05-01T10:00:00Z' }
    ]
  } as any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderTimelineComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(OrderTimelineComponent);
    component = fixture.componentInstance;
    component.order = mockOrder;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should determine steps based on payment method', () => {
    component.order.paymentMethod = 'COD';
    expect(component.steps).not.toContain('PAID');
    
    component.order.paymentMethod = 'WALLET';
    expect(component.steps).toContain('PAID');
  });

  it('should check if step is completed', () => {
    component.order.orderStatus = OrderStatus.CONFIRMED;
    expect(component.isCompleted('PLACED')).toBe(true);
    expect(component.isCompleted('CONFIRMED')).toBe(true);
    expect(component.isCompleted('SHIPPED')).toBe(false);
  });

  it('should check if step is active', () => {
    component.order.orderStatus = OrderStatus.PLACED;
    expect(component.isActive('PLACED')).toBe(true);
    expect(component.isActive('PAID')).toBe(false);
  });

  it('should get timestamp for a step', () => {
    expect(component.getTimestamp('PLACED')).toBe('2023-05-01T10:00:00Z');
    expect(component.getTimestamp('PAID')).toBeNull();
  });

  it('should get icon for a step', () => {
    expect(component.getIcon('PLACED')).toBe('shopping_bag');
    expect(component.getIcon('DELIVERED')).toBe('check_circle');
    expect(component.getIcon('UNKNOWN')).toBe('help');
  });

  it('should format label', () => {
    expect(component.formatLabel('OUT_FOR_DELIVERY')).toBe('Out For Delivery');
  });
});
