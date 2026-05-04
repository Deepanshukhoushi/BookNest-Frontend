import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { WalletService } from '../../../core/services/wallet.service';
import { catchError, of, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-top-up-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './top-up-modal.component.html',
  styleUrl: './top-up-modal.component.css'
})
export class TopUpModalComponent {
  private fb = inject(FormBuilder);
  private walletService = inject(WalletService);
  private authService = inject(AuthService);

  @Input() open = false;
  @Input() walletId?: number;
  @Input() userId?: number;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  topUpForm: FormGroup;
  isSubmitting = signal(false);
  errorMessage = signal('');

  quickAmounts = [100, 500, 1000, 2000, 5000];

  constructor() {
    this.topUpForm = this.fb.group({
      amount: [500, [Validators.required, Validators.min(100), Validators.max(100000), Validators.pattern('^[0-9]*$')]]
    });
  }

  onClose() {
    this.errorMessage.set('');
    this.topUpForm.reset({ amount: 500 });
    this.close.emit();
  }

  onSubmit() {
    if (this.topUpForm.invalid || !this.walletId) {
      this.topUpForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const { amount } = this.topUpForm.value;

    this.walletService.initiateRazorpayTopUp(this.userId!, this.walletId, amount).pipe(
      switchMap(orderId => this.walletService.getRazorpayPublicKey().pipe(
        tap(keyId => this.openRazorpayModal(orderId, amount, keyId))
      )),
      catchError(err => {
        console.error('Top-up initiation error:', err);
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.message || 'Payment initiation failed.');
        return of(null);
      })
    ).subscribe();
  }

  private openRazorpayModal(orderId: string, amount: number, keyId: string) {
    if (keyId === 'sim_public_key') {
      this.verifyRazorpayPayment({
        orderId: orderId,
        paymentId: `sim_payment_${Date.now()}`,
        signature: 'sim_signature',
        amount: amount
      });
      return;
    }

    const user = this.authService.currentUser();
    const options = {
      key: keyId,
      amount: Math.round(amount * 100),
      currency: 'INR',
      name: 'BookNest',
      description: 'Wallet Top-Up',
      order_id: orderId,
      handler: (response: any) => {
        this.verifyRazorpayPayment({
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
          amount: amount
        });
      },
      prefill: {
        name: user?.fullName || '',
        email: user?.email || '',
      },
      theme: {
        color: '#012d1d'
      },
      modal: {
        ondismiss: () => this.isSubmitting.set(false)
      }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  }

  private verifyRazorpayPayment(verificationData: any) {
    this.walletService.verifyRazorpayTopUp(verificationData).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.success.emit();
        this.onClose();
      },
      error: (err) => {
        console.error('Top-up verification error:', err);
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.message || 'Transaction verification failed.');
      }
    });
  }
}
