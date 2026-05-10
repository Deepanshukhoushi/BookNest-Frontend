import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CheckoutComponent } from './checkout.component';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { NotificationService } from '../../core/services/notification.service';
import { CouponService } from '../../core/services/coupon.service';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { Address } from '../../shared/models/models';

describe('CheckoutComponent', () => {
  let component: CheckoutComponent;
  let fixture: ComponentFixture<CheckoutComponent>;
  let orderServiceSpy: any;
  let authServiceSpy: any;
  let cartServiceSpy: any;
  let notificationServiceSpy: any;
  let couponServiceSpy: any;
  let routerSpy: any;

  beforeEach(async () => {
    orderServiceSpy = {
      getAddressesByCustomer: vi.fn().mockReturnValue(of([])),
      checkout: vi.fn().mockReturnValue(of({} as any)),
      saveAddress: vi.fn(),
      initiatePayment: vi.fn(),
      getRazorpayPublicKey: vi.fn(),
      verifyPayment: vi.fn()
    };
    authServiceSpy = {
      currentUser: signal({ userId: 1, fullName: 'Test User' })
    };
    cartServiceSpy = {
      clearCart: vi.fn().mockReturnValue(of({} as any)),
      cart: signal({ items: [{ bookId: 1, bookTitle: 'Test' }], totalPrice: 1000 })
    };
    notificationServiceSpy = {
      success: vi.fn(),
      error: vi.fn()
    };
    couponServiceSpy = {
      validateCoupon: vi.fn().mockReturnValue(of({
        valid: true,
        code: 'SAVE20',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        discountAmount: 200,
        finalAmount: 800,
        message: 'ok'
      }))
    };
    routerSpy = {
      navigate: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [CheckoutComponent],
      providers: [
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: CartService, useValue: cartServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: CouponService, useValue: couponServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { params: of({}) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load saved addresses on init', () => {
    expect(orderServiceSpy.getAddressesByCustomer).toHaveBeenCalledWith(1);
  });

  it('should validate address form fields', () => {
    component.addressForm.fullName = '123'; // Invalid name
    component.updateAddressErrors();
    expect(component.addressErrors()['fullName']).toBe('Name cannot contain numeric characters.');

    component.addressForm.phone = '123'; // Invalid phone
    component.updateAddressErrors();
    expect(component.addressErrors()['phone']).toBe('Phone must be exactly 10 digits.');

    component.addressForm.pincode = '123'; // Invalid pincode
    component.updateAddressErrors();
    expect(component.addressErrors()['pincode']).toBe('Enter a valid 6-digit Indian pincode.');
  });

  it('should handle address selection', () => {
    const address: Address = {
      addressId: 1,
      customerId: 1,
      fullName: 'John Doe',
      mobileNumber: '1234567890',
      flatNumber: '123 St',
      city: 'City',
      state: 'State',
      pincode: '123456'
    };
    component.selectAddress(address);
    expect(component.selectedAddressId()).toBe(1);
    expect(component.addressForm.fullName).toBe('John Doe');
  });



  it('applyCoupon should set appliedCoupon on success', () => {
    component.couponCode.set('SAVE20');

    component.applyCoupon();

    expect(couponServiceSpy.validateCoupon).toHaveBeenCalledWith('SAVE20', 1000);
    expect(component.appliedCoupon()?.code).toBe('SAVE20');
    expect(component.couponError()).toBe('');
  });

  it('applyCoupon should require a code', () => {
    component.couponCode.set('   ');

    component.applyCoupon();

    expect(couponServiceSpy.validateCoupon).not.toHaveBeenCalled();
    expect(component.couponError()).toBe('Enter a coupon code to continue.');
  });

  it('applyCoupon should set couponError on failure', () => {
    couponServiceSpy.validateCoupon.mockReturnValueOnce(throwError(() => ({ error: { message: 'Invalid coupon' } })));
    component.couponCode.set('BAD');

    component.applyCoupon();

    expect(component.appliedCoupon()).toBeNull();
    expect(component.couponError()).toBe('Invalid coupon');
  });

  it('removeCoupon should clear applied coupon', () => {
    component.couponCode.set('SAVE20');
    component.appliedCoupon.set({
      valid: true,
      code: 'SAVE20',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      discountAmount: 200,
      finalAmount: 800,
      message: 'ok'
    });

    component.removeCoupon();

    expect(component.couponCode()).toBe('');
    expect(component.appliedCoupon()).toBeNull();
  });

  it('total should include discount when coupon is applied', () => {
    component.appliedCoupon.set({
      valid: true,
      code: 'SAVE20',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      discountAmount: 200,
      finalAmount: 800,
      message: 'ok'
    });

    expect(component.total()).toBe(880);
  });



  it('should handle order confirmation (WALLET)', () => {
    component.addressForm = {
      fullName: 'John Doe',
      phone: '1234567890',
      street: '123 St',
      city: 'City',
      state: 'State',
      pincode: '123456'
    };
    component.selectedAddressId.set(1);
    component.paymentMethod.set('WALLET');
    orderServiceSpy.checkout = vi.fn().mockReturnValue(of({} as any));

    component.confirmOrder();

    expect(orderServiceSpy.checkout).toHaveBeenCalled();
    expect(orderServiceSpy.checkout.mock.calls[0][0].discountCode).toBeUndefined();
    expect(cartServiceSpy.clearCart).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('confirmOrder with coupon should pass discountCode in payload', () => {
    component.addressForm = {
      fullName: 'John Doe',
      phone: '1234567890',
      street: '123 St',
      city: 'City',
      state: 'State',
      pincode: '123456'
    };
    component.selectedAddressId.set(1);
    component.appliedCoupon.set({
      valid: true,
      code: 'SAVE20',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      discountAmount: 200,
      finalAmount: 800,
      message: 'ok'
    });

    component.confirmOrder();

    expect(orderServiceSpy.checkout.mock.calls[0][0].discountCode).toBe('SAVE20');
  });

  it('should handle checkout error', () => {
    component.addressForm = {
      fullName: 'John Doe',
      phone: '1234567890',
      street: '123 St',
      city: 'City',
      state: 'State',
      pincode: '123456'
    };
    component.selectedAddressId.set(1);
    orderServiceSpy.checkout = vi.fn().mockReturnValue(throwError(() => ({ error: { message: 'Insufficient Balance' } })));

    component.confirmOrder();

    expect(notificationServiceSpy.error).toHaveBeenCalledWith('Insufficient Balance');
    expect(component.isProcessing()).toBe(false);
  });

  it('should clear form in addNewAddress', () => {
    component.addressForm.fullName = 'Some Name';
    component.selectedAddressId.set(1);
    component.addNewAddress();
    expect(component.selectedAddressId()).toBeNull();
    expect(component.addressForm.fullName).toBe('');
  });



  it('should handle onInputChange', () => {
    component.selectedAddressId.set(1);
    component.onInputChange();
    expect(component.selectedAddressId()).toBeNull();
  });

  it('should handle hasFieldError', () => {
    component.isSubmitted.set(false);
    component.addressErrors.set({ fullName: 'Full Name is required.' });
    expect(component.hasFieldError('fullName')).toBe(false);

    component.isSubmitted.set(true);
    expect(component.hasFieldError('fullName')).toBe(true);

    component.isSubmitted.set(false);
    component.addressErrors.set({ fullName: 'Invalid format.' });
    expect(component.hasFieldError('fullName')).toBe(true);
  });

  it('should initiate online payment flow', async () => {
    component.addressForm = {
      fullName: 'John Doe',
      phone: '1234567890',
      street: '123 St',
      city: 'City',
      state: 'State',
      pincode: '123456'
    };
    component.selectedAddressId.set(1);
    component.paymentMethod.set('ONLINE');
    orderServiceSpy.initiatePayment.mockReturnValue(of('order_123'));
    orderServiceSpy.getRazorpayPublicKey.mockReturnValue(of('rzp_key'));
    
    // Mock global Razorpay as a class
    (globalThis as any).Razorpay = class {
      open = vi.fn();
    };

    component.confirmOrder();

    expect(orderServiceSpy.initiatePayment).toHaveBeenCalledWith(1, 1, undefined);
    expect(orderServiceSpy.getRazorpayPublicKey).toHaveBeenCalled();
  });

  it('should initiate online payment flow with coupon code', () => {
    component.addressForm = {
      fullName: 'John Doe',
      phone: '1234567890',
      street: '123 St',
      city: 'City',
      state: 'State',
      pincode: '123456'
    };
    component.selectedAddressId.set(1);
    component.paymentMethod.set('ONLINE');
    component.appliedCoupon.set({
      valid: true,
      code: 'SAVE20',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      discountAmount: 200,
      finalAmount: 800,
      message: 'ok'
    });
    orderServiceSpy.initiatePayment.mockReturnValue(of('order_123'));
    orderServiceSpy.getRazorpayPublicKey.mockReturnValue(of('rzp_key'));
    (globalThis as any).Razorpay = class {
      open = vi.fn();
    };

    component.confirmOrder();

    expect(orderServiceSpy.initiatePayment).toHaveBeenCalledWith(1, 1, 'SAVE20');
  });

  it('should verify and finalize online order', () => {
    const response = { razorpay_order_id: 'o1', razorpay_payment_id: 'p1', razorpay_signature: 's1' };
    orderServiceSpy.verifyPayment.mockReturnValue(of([]));
    
    (component as any).verifyAndFinalizeOnlineOrder(1, response);

    expect(orderServiceSpy.verifyPayment).toHaveBeenCalledWith({
      orderId: 'o1',
      paymentId: 'p1',
      signature: 's1',
      addressId: undefined,
      discountCode: undefined
    });
    expect(cartServiceSpy.clearCart).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should handle online payment initiation error', () => {
    orderServiceSpy.initiatePayment.mockReturnValueOnce(throwError(() => ({ error: { message: 'Network error' } })));
    component.paymentMethod.set('ONLINE');
    component.selectedAddressId.set(1);
    component.addressForm = {
      fullName: 'John Doe',
      phone: '1234567890',
      street: '123 St',
      city: 'City',
      state: 'State',
      pincode: '123456'
    };
    
    component.confirmOrder();
    
    expect(notificationServiceSpy.error).toHaveBeenCalledWith('Network error');
    expect(component.isProcessing()).toBe(false);
  });

  it('should handle payment verification error', () => {
    const response = { razorpay_order_id: 'o1', razorpay_payment_id: 'p1', razorpay_signature: 's1' };
    orderServiceSpy.verifyPayment.mockReturnValueOnce(throwError(() => ({ error: { message: 'Signature mismatch' } })));
    
    (component as any).verifyAndFinalizeOnlineOrder(1, response);

    expect(notificationServiceSpy.error).toHaveBeenCalledWith('Signature mismatch');
    expect(component.isProcessing()).toBe(false);
  });

  it('should prevent checkout if total is zero or negative', () => {
    cartServiceSpy.cart.set({ items: [], totalPrice: 0 });
    component.confirmOrder();
    expect(notificationServiceSpy.error).toHaveBeenCalledWith('Your archives are empty. Please add items before checking out.');
  });

  it('should prevent checkout if no address is selected', () => {
    cartServiceSpy.cart.set({ items: [{ bookId: 1 }], totalPrice: 100 });
    component.selectedAddressId.set(null);
    component.confirmOrder();
    expect(notificationServiceSpy.error).toHaveBeenCalledWith('Missing shipping information.');
  });
});
