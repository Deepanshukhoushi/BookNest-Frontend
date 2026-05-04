import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../../core/services/auth.service';
import { OrderService } from '../../../core/services/order.service';
import { WalletService } from '../../../core/services/wallet.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { BookService } from '../../../core/services/book.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let authServiceSpy: any;
  let orderServiceSpy: any;
  let walletServiceSpy: any;
  let wishlistServiceSpy: any;
  let bookServiceSpy: any;
  let notificationServiceSpy: any;

  const mockUser = { userId: 1, fullName: 'Test User', role: 'USER', email: 'test@test.com', createdAt: '2023-05-01T10:00:00Z' };
  const mockWallet = { walletId: 1, userId: 1, balance: 500 };
  const mockOrders = [{ orderId: 1, amountPaid: 100, orderStatus: 'PLACED' }];

  beforeEach(async () => {
    authServiceSpy = {
      currentUser: signal(mockUser),
      updateProfile: vi.fn().mockReturnValue(of(mockUser)),
      changePassword: vi.fn().mockReturnValue(of('Success')),
      logout: vi.fn(),
      resolveImageUrl: vi.fn().mockReturnValue(null)
    };
    orderServiceSpy = {
      getOrdersByUser: vi.fn().mockReturnValue(of(mockOrders)),
      getAddressesByCustomer: vi.fn().mockReturnValue(of([])),
      saveAddress: vi.fn().mockReturnValue(of({})),
      updateAddress: vi.fn().mockReturnValue(of({})),
      deleteAddress: vi.fn().mockReturnValue(of({})),
      cancelOrder: vi.fn().mockReturnValue(of({ ...mockOrders[0], orderStatus: 'CANCELLED' })),
      downloadInvoicePdf: vi.fn().mockReturnValue(of(new Blob()))
    };
    walletServiceSpy = {
      wallet: signal(mockWallet),
      fetchWalletByUserId: vi.fn().mockReturnValue(of(mockWallet)),
      getStatements: vi.fn().mockReturnValue(of([]))
    };
    wishlistServiceSpy = {
      fetchWishlist: vi.fn().mockReturnValue(of({ items: [] })),
      removeFromWishlist: vi.fn().mockReturnValue(of({ items: [] }))
    };
    bookServiceSpy = {
      getBooks: vi.fn().mockReturnValue(of({ content: [] }))
    };
    notificationServiceSpy = {
      success: vi.fn(),
      error: vi.fn()
    };

    // Mock URL methods for PDF download
    window.URL.createObjectURL = vi.fn().mockReturnValue('mock-url');
    window.URL.revokeObjectURL = vi.fn();

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: WalletService, useValue: walletServiceSpy },
        { provide: WishlistService, useValue: wishlistServiceSpy },
        { provide: BookService, useValue: bookServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with user data', () => {
    expect(component.userProfile().name).toBe('Test User');
    expect(orderServiceSpy.getOrdersByUser).toHaveBeenCalledWith(1);
    expect(walletServiceSpy.fetchWalletByUserId).toHaveBeenCalledWith(1);
  });

  it('should switch tabs', () => {
    component.setTab('funds');
    expect(component.activeTab()).toBe('funds');
  });

  it('should handle profile updates', () => {
    component.nameInput.set('Updated Name');
    component.onUpdateProfile();
    expect(authServiceSpy.updateProfile).toHaveBeenCalledWith({ name: 'Updated Name' });
    expect(component.updateMessage().type).toBe('success');
  });

  it('should validate password change', () => {
    component.oldPasswordInput.set('old-pass');
    component.confirmPasswordInput.set('short');
    component.passwordInput.set('short');
    component.onChangePassword();
    expect(component.updateMessage().text).toContain('at least 8 characters');

    component.oldPasswordInput.set('old');
    component.passwordInput.set('newPassword123');
    component.confirmPasswordInput.set('mismatch');
    component.onChangePassword();
    expect(component.updateMessage().text).toContain('do not match');
  });

  it('should handle address management', () => {
    component.addressDraft.set({
      customerId: 1,
      fullName: 'John',
      mobileNumber: '1234567890',
      flatNumber: '123',
      city: 'City',
      state: 'ST',
      pincode: '123456'
    });
    component.submitAddress();
    expect(orderServiceSpy.saveAddress).toHaveBeenCalled();
    expect(notificationServiceSpy.success).toBeDefined();
  });

  it('should handle order cancellation', () => {
    component.cancelOrder(1);
    expect(orderServiceSpy.cancelOrder).toHaveBeenCalledWith(1);
    expect(notificationServiceSpy.success).toHaveBeenCalled();
  });

  it('should handle invoice download', () => {
    component.viewInvoice(1);
    expect(orderServiceSpy.downloadInvoicePdf).toHaveBeenCalledWith(1);
    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(notificationServiceSpy.success).toHaveBeenCalled();
  });

  it('should show logout confirmation', () => {
    component.logout();
    expect(component.showConfirmModal()).toBe(true);
    expect(component.confirmModalConfig().title).toBe('Logout Confirmation');
  });
});
