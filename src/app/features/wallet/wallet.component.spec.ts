import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WalletComponent } from './wallet.component';
import { AuthService } from '../../core/services/auth.service';
import { WalletService } from '../../core/services/wallet.service';
import { CartService } from '../../core/services/cart.service';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';

describe('WalletComponent', () => {
  let component: WalletComponent;
  let fixture: ComponentFixture<WalletComponent>;
  let authServiceSpy: any;
  let walletServiceSpy: any;
  let cartServiceSpy: any;

  beforeEach(async () => {
    authServiceSpy = {
      currentUser: signal({ userId: 1 })
    };
    walletServiceSpy = {
      wallet: signal({ balance: 500 }),
      fetchWalletByUserId: vi.fn().mockReturnValue(of({}))
    };
    cartServiceSpy = {
      cartTotal: signal(200)
    };

    await TestBed.configureTestingModule({
      imports: [WalletComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: WalletService, useValue: walletServiceSpy },
        { provide: CartService, useValue: cartServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WalletComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load wallet on init', () => {
    expect(walletServiceSpy.fetchWalletByUserId).toHaveBeenCalledWith(1);
    expect(component.loading()).toBe(false);
  });

  it('should calculate insufficient balance correctly', () => {
    cartServiceSpy.cartTotal.set(600);
    expect(component.insufficientBalance()).toBe(true);
    
    cartServiceSpy.cartTotal.set(400);
    expect(component.insufficientBalance()).toBe(false);
  });

  it('should handle error if user not logged in', () => {
    authServiceSpy.currentUser.set(null);
    component.ngOnInit();
    expect(component.error()).toBe('Please login to view wallet details.');
  });

  it('should handle wallet fetch error', () => {
    walletServiceSpy.fetchWalletByUserId.mockReturnValue(throwError(() => ({ error: { message: 'Fetch Failed' } })));
    component.ngOnInit();
    expect(component.error()).toBe('Fetch Failed');
    expect(component.loading()).toBe(false);
  });
});
