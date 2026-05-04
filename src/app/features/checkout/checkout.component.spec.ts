import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CheckoutComponent } from './checkout.component';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { NotificationService } from '../../core/services/notification.service';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

describe('CheckoutComponent', () => {
  let component: CheckoutComponent;
  let fixture: ComponentFixture<CheckoutComponent>;
  let orderServiceSpy: any;
  let authServiceSpy: any;
  let cartServiceSpy: any;
  let notificationServiceSpy: any;
  let routerSpy: any;

  const mockUser = { userId: 1, fullName: 'Test User' };
  const mockCart = {
    totalPrice: 300,
    items: [{ bookId: 1, bookTitle: 'Book 1', price: 150, quantity: 2 }]
  };
  const mockAddresses = [
    { addressId: 1, fullName: 'Home', mobileNumber: '1234567890', flatNumber: '123 St', city: 'City', state: 'State', pincode: '123456' }
  ];

  beforeEach(async () => {
    orderServiceSpy = {
      getAddressesByCustomer: vi.fn().mockReturnValue(of(mockAddresses)),
      saveAddress: vi.fn().mockReturnValue(of(mockAddresses[0])),
      checkout: vi.fn().mockReturnValue(of({})),
      initiatePayment: vi.fn().mockReturnValue(of('order_123')),
      getRazorpayPublicKey: vi.fn().mockReturnValue(of('rzp_test')),
      verifyPayment: vi.fn().mockReturnValue(of({}))
    };
    authServiceSpy = {
      currentUser: signal(mockUser)
    };
    cartServiceSpy = {
      cart: signal(mockCart),
      clearCart: vi.fn().mockReturnValue(of({}))
    };
    notificationServiceSpy = {
      success: vi.fn(),
      error: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [CheckoutComponent],
      providers: [
        provideRouter([]),
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: CartService, useValue: cartServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutComponent);
    component = fixture.componentInstance;
    
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    routerSpy = router;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load saved addresses on init', () => {
    expect(orderServiceSpy.getAddressesByCustomer).toHaveBeenCalledWith(1);
    expect(component.savedAddresses().length).toBe(1);
    expect(component.selectedAddressId()).toBe(1);
  });

  it('should calculate order totals correctly', () => {
    expect(component.subtotal()).toBe(300);
    expect(component.isFreeShipping()).toBe(true);
    expect(component.shipping()).toBe(0);
    expect(component.tax()).toBe(300 * 0.08);
    expect(component.total()).toBe(300 + (300 * 0.08));
  });

  it('should validate address before moving to payment', () => {
    component.addressForm.fullName = ''; // Invalid
    component.nextStep();
    expect(notificationServiceSpy.error).toHaveBeenCalled();
    expect(component.currentStep()).toBe('address');

    component.addressForm = {
      fullName: 'John Doe',
      phone: '1234567890',
      street: '123 Main St',
      city: 'Metropolis',
      state: 'NY',
      pincode: '100001'
    };
    component.nextStep();
    expect(component.currentStep()).toBe('payment');
  });

  it('should handle wallet checkout', () => {
    component.selectedAddressId.set(1);
    component.paymentMethod.set('WALLET');
    component.confirmOrder();
    
    expect(orderServiceSpy.checkout).toHaveBeenCalledWith({
      userId: 1,
      paymentMethod: 'WALLET',
      addressId: 1
    });
    expect(cartServiceSpy.clearCart).toHaveBeenCalled();
    expect(notificationServiceSpy.success).toHaveBeenCalled();
  });

  it('should handle simulated online payment', () => {
    // Mock sim key
    orderServiceSpy.getRazorpayPublicKey.mockReturnValue(of('sim_public_key'));
    component.paymentMethod.set('ONLINE');
    component.confirmOrder();

    expect(orderServiceSpy.initiatePayment).toHaveBeenCalled();
    expect(orderServiceSpy.verifyPayment).toHaveBeenCalled();
    expect(notificationServiceSpy.success).toHaveBeenCalledWith('Payment verified and order placed!');
  });

  it('should handle checkout errors', () => {
    orderServiceSpy.checkout.mockReturnValue(throwError(() => ({ error: { message: 'Insufficient funds' } })));
    component.confirmOrder();
    expect(notificationServiceSpy.error).toHaveBeenCalledWith('Insufficient funds');
    expect(component.isProcessing()).toBe(false);
  });
});
