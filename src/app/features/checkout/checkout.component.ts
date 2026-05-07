import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { NotificationService } from '../../core/services/notification.service';
import { environment } from '../../../environments/environment';

type CheckoutStep = 'address' | 'payment' | 'review';
type PaymentMethod = 'WALLET' | 'ONLINE';

/**
 * Component managing the multi-step checkout process.
 * Handles shipping address collection, payment method selection, and final order confirmation.
 */
@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class CheckoutComponent implements OnInit {
  private orderService = inject(OrderService);
  private authService = inject(AuthService);
  private cartService = inject(CartService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  currentStep = signal<CheckoutStep>('address');
  isProcessing = signal(false);
  paymentMethod = signal<PaymentMethod>('WALLET');
  message = signal('');
  messageType = signal<'success' | 'error' | ''>('');

  addressForm = {
    fullName: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    pincode: ''
  };

  savedAddresses = signal<any[]>([]);
  isLoadingAddresses = signal(false);
  selectedAddressId = signal<number | null>(null);

  ngOnInit() {
    this.loadSavedAddresses();
  }

  // Fetches previously saved delivery addresses for the current user
  loadSavedAddresses() {
    const user = this.authService.currentUser();
    if (user) {
      this.isLoadingAddresses.set(true);
      this.orderService.getAddressesByCustomer(user.userId).subscribe({
        next: (addresses) => {
          this.savedAddresses.set(addresses);
          this.isLoadingAddresses.set(false);
          // Auto-select the first address if available to streamline checkout
          if (addresses && addresses.length > 0) {
            this.selectAddress(addresses[0]);
          }
        },
        error: () => this.isLoadingAddresses.set(false)
      });
    }
  }

  // Populates the address form with data from a selected saved address
  selectAddress(address: any) {
    this.selectedAddressId.set(address.addressId);
    this.addressForm = {
      fullName: address.fullName,
      phone: address.mobileNumber,
      street: address.flatNumber,
      city: address.city,
      state: address.state,
      pincode: address.pincode
    };
  }

  // Clears the form and selection to allow manual entry of a new address
  addNewAddress() {
    this.selectedAddressId.set(null);
    this.addressForm = {
      fullName: '',
      phone: '',
      street: '',
      city: '',
      state: '',
      pincode: ''
    };
  }

  // checkoutItems computed from cart signal
  checkoutItems = computed(() => {
    const items = this.cartService.cart()?.items || [];
    return items.map(item => ({
      title: item.bookTitle,
      author: 'Curated Selection',
      edition: 'Vintage Paperback',
      price: item.price,
      quantity: item.quantity,
      imageUrl: item.bookImageUrl || '/assets/images/book-fallback.svg'
    }));
  });

  private readonly TAX_RATE = environment.taxRate;
  private readonly SHIPPING_THRESHOLD = environment.shippingThreshold;
  private readonly BASE_SHIPPING = environment.baseShipping;

  subtotal = computed(() => this.cartService.cart()?.totalPrice || 0);
  shipping = computed(() => this.subtotal() > this.SHIPPING_THRESHOLD ? 0 : this.BASE_SHIPPING);
  tax = computed(() => this.subtotal() * this.TAX_RATE);
  total = computed(() => this.subtotal() + this.tax() + this.shipping());
  isFreeShipping = computed(() => this.subtotal() > this.SHIPPING_THRESHOLD);

  // Advances to the next step in the checkout process after validation
  nextStep() {
    if (this.currentStep() === 'address') {
      const validationError = this.getAddressValidationError();
      if (validationError) {
        this.notificationService.error(validationError);
        return;
      }
      this.currentStep.set('payment');
    } else if (this.currentStep() === 'payment') {
      this.currentStep.set('review');
    }
  }

  // Returns a validation error message, or null if the address is valid
  private getAddressValidationError(): string | null {
    const { fullName, phone, street, city, state, pincode } = this.addressForm;
    if (!fullName?.trim() || !phone?.trim() || !street?.trim() || !city?.trim() || !state?.trim() || !pincode?.trim()) {
      return 'Please complete all address fields.';
    }
    if (!/^[a-zA-Z\s]*$/.test(fullName.trim())) {
      return 'Full name must contain only characters.';
    }
    if (!/^[0-9]{10}$/.test(phone.trim())) {
      return 'Phone number must be exactly 10 digits.';
    }
    if (!/^[0-9]{6}$/.test(pincode.trim())) {
      return 'Pincode must be exactly 6 digits.';
    }
    return null;
  }

  // Helper to check if all required address fields are provided and valid
  private isAddressValid(): boolean {
    return this.getAddressValidationError() === null;
  }

  // Switches the active checkout step if current data is valid
  setStep(step: CheckoutStep) {
    if (step === 'payment' || step === 'review') {
      if (!this.isAddressValid()) {
        this.notificationService.error('Address is required before proceeding.');
        return;
      }
    }
    this.currentStep.set(step);
  }

  // Main entry point for confirming and submitting the user's order
  confirmOrder() {
    const user = this.authService.currentUser();
    if (!user || !user.userId) {
      this.notificationService.error('Session expired. Please login again.');
      this.router.navigate(['/auth'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }

    if (!this.isAddressValid()) {
      this.notificationService.error('Missing shipping information.');
      return;
    }

    if (this.paymentMethod() === 'ONLINE') {
      this.initiateOnlinePayment(user.userId);
    } else {
      this.executeOrderPlacement(user.userId);
    }
  }

  // Executes the order placement sequence for offline or wallet payments
  private executeOrderPlacement(userId: number) {
    this.isProcessing.set(true);
    const addressId = this.selectedAddressId();

    const processCheckout = (finalAddressId: number) => {
      const method = this.paymentMethod();
      return this.orderService.checkout({ 
        userId, 
        paymentMethod: method,
        addressId: finalAddressId 
      });
    };

    const checkoutFlow$ = addressId 
      ? processCheckout(addressId)
      : this.saveNewAddress(userId).pipe(switchMap(newAddr => processCheckout(newAddr.addressId!)));

    checkoutFlow$.pipe(
      switchMap(() => this.cartService.clearCart()),
      tap(() => {
        this.notificationService.success('Order placed successfully!');
        this.isProcessing.set(false);
        this.router.navigate(['/dashboard']);
      }),
      catchError(err => {
        console.error('Checkout error:', err);
        this.isProcessing.set(false);
        this.notificationService.error(err.error?.message || 'Transaction failed.');
        return of(null);
      })
    ).subscribe();
  }

  // Starts the online payment flow by saving the address (if new) and initiating the transaction
  private initiateOnlinePayment(userId: number) {
    this.isProcessing.set(true);
    const addressId = this.selectedAddressId();

    const startPayment = (finalAddressId: number) => {
       // Note: We currently don't pass addressId to initiatePayment in backend, 
       // but we'll use it in verifyPayment if we wanted. 
       // For now, the backend uses getLatestAddress in initiatePayment.
       // To fix duplicates, NOT saving is the key.
       return this.orderService.initiatePayment(userId);
    };

    const paymentFlow$ = addressId
      ? startPayment(addressId)
      : this.saveNewAddress(userId).pipe(switchMap(() => startPayment(0))); // 0 is dummy

    paymentFlow$.pipe(
      switchMap(orderId => this.orderService.getRazorpayPublicKey().pipe(
        tap(keyId => this.openRazorpayModal(orderId, userId, keyId))
      )),
      catchError(err => {
        console.error('Payment initiation error:', err);
        this.isProcessing.set(false);
        this.notificationService.error(err.error?.message || 'Payment initiation failed.');
        return of(null);
      })
    ).subscribe();
  }

  private saveNewAddress(userId: number) {
    const { fullName, phone, street, city, state, pincode } = this.addressForm;
    return this.orderService.saveAddress({
      customerId: userId,
      fullName: fullName.trim(),
      mobileNumber: phone.trim(),
      flatNumber: street.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim()
    });
  }

  // Configures and opens the external Razorpay payment dialog
  private openRazorpayModal(orderId: string, userId: number, keyId: string) {
    if (keyId === 'sim_public_key') {
      this.verifyAndFinalizeOnlineOrder(userId, {
        razorpay_order_id: orderId,
        razorpay_payment_id: `sim_payment_${Date.now()}`,
        razorpay_signature: 'sim_signature'
      });
      return;
    }

    const options = {
      key: keyId,
      amount: Math.round(this.total() * 100),
      currency: 'INR',
      name: 'BookNest',
      description: 'Acquiring Curated Editions',
      order_id: orderId,
      handler: (response: any) => {
        this.verifyAndFinalizeOnlineOrder(userId, response);
      },
      prefill: {
        name: this.addressForm.fullName,
        contact: this.addressForm.phone
      },
      theme: {
        color: '#012d1d'
      },
      modal: {
        ondismiss: () => this.isProcessing.set(false)
      }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  }

  // Verifies the online payment signature with the backend to finalize the order
  private verifyAndFinalizeOnlineOrder(userId: number, response: any) {
    const verifyPayload = {
      orderId: response.razorpay_order_id,
      paymentId: response.razorpay_payment_id,
      signature: response.razorpay_signature
    };

    this.orderService.verifyPayment(verifyPayload).pipe(
      switchMap(() => this.cartService.clearCart()),
      tap(() => {
        this.notificationService.success('Payment verified and order placed!');
        this.isProcessing.set(false);
        this.router.navigate(['/dashboard']);
      }),
      catchError(err => {
        console.error('Online checkout error:', err);
        this.isProcessing.set(false);
        
        let errorMessage = 'Payment verification failed.';
        if (err.error && typeof err.error === 'object') {
          errorMessage = err.error.message || errorMessage;
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        this.notificationService.error(errorMessage);
        return of(null);
      })
    ).subscribe();
  }
}
