import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TopUpModalComponent } from './top-up-modal.component';
import { WalletService } from '../../../core/services/wallet.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

describe('TopUpModalComponent', () => {
  let component: TopUpModalComponent;
  let fixture: ComponentFixture<TopUpModalComponent>;
  let walletServiceSpy: any;
  let authServiceSpy: any;

  beforeEach(async () => {
    walletServiceSpy = {
      initiateRazorpayTopUp: vi.fn().mockReturnValue(of('order_123')),
      getRazorpayPublicKey: vi.fn().mockReturnValue(of('sim_public_key')),
      verifyRazorpayTopUp: vi.fn().mockReturnValue(of({}))
    };
    authServiceSpy = {
      currentUser: signal({ fullName: 'Test', email: 'test@test.com' })
    };

    // Mock Razorpay
    (window as any).Razorpay = vi.fn().mockImplementation(() => ({
      open: vi.fn()
    }));

    await TestBed.configureTestingModule({
      imports: [TopUpModalComponent, ReactiveFormsModule],
      providers: [
        { provide: WalletService, useValue: walletServiceSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TopUpModalComponent);
    component = fixture.componentInstance;
    component.walletId = 1;
    component.userId = 1;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should handle form submission with simulated payment', () => {
    component.topUpForm.patchValue({ amount: 1000 });
    component.onSubmit();
    expect(walletServiceSpy.initiateRazorpayTopUp).toHaveBeenCalled();
    expect(walletServiceSpy.verifyRazorpayTopUp).toHaveBeenCalled();
    expect(component.isSubmitting()).toBe(false);
  });

  it('should handle payment initiation error', () => {
    walletServiceSpy.initiateRazorpayTopUp.mockReturnValue(throwError(() => ({ error: { message: 'Failed' } })));
    component.onSubmit();
    expect(component.errorMessage()).toBe('Failed');
    expect(component.isSubmitting()).toBe(false);
  });

  it('should handle payment verification error', () => {
    walletServiceSpy.verifyRazorpayTopUp.mockReturnValue(throwError(() => ({ error: { message: 'Verify Failed' } })));
    component.onSubmit();
    expect(component.errorMessage()).toBe('Verify Failed');
  });

  it('should validate amount', () => {
    component.topUpForm.patchValue({ amount: 50 });
    expect(component.topUpForm.invalid).toBe(true);
    
    component.topUpForm.patchValue({ amount: 100001 });
    expect(component.topUpForm.invalid).toBe(true);
  });

  it('should reset on close', () => {
    component.errorMessage.set('Error');
    component.onClose();
    expect(component.errorMessage()).toBe('');
    expect(component.topUpForm.value.amount).toBe(500);
  });
});
