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
import { of, throwError } from 'rxjs';
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

  const mockUser = { userId: 1, fullName: 'Test User', role: 'USER', email: 'test@test.com', createdAt: '2023-05-01T10:00:00Z', mobile: '1234567890' };
  const mockWallet = { walletId: 1, userId: 1, balance: 500 };
  const mockOrders = [{ orderId: 1, amountPaid: 100, orderStatus: 'PLACED' }];

  beforeEach(async () => {
    authServiceSpy = {
      currentUser: signal(mockUser),
      updateProfile: vi.fn().mockReturnValue(of(mockUser)),
      uploadProfileImage: vi.fn().mockReturnValue(of({ data: 'new-url' })),
      changePassword: vi.fn().mockReturnValue(of('Success')),
      logout: vi.fn(),
      resolveImageUrl: vi.fn().mockReturnValue('resolved-url')
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
      error: vi.fn(),
      warn: vi.fn()
    };

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
  });

  it('should handle address validation', () => {
    component.addressDraft.set({
      fullName: '',
      mobileNumber: '123',
      flatNumber: '',
      city: '',
      state: '',
      pincode: ''
    } as any);
    component.submitAddress();
    expect(component.updateMessage().type).toBe('error');
    expect(component.updateMessage().text).toContain('required');

    component.addressDraft.set({
      fullName: 'John 123',
      mobileNumber: '1234567890',
      flatNumber: 'A1',
      city: 'City',
      state: 'ST',
      pincode: '123456'
    } as any);
    component.submitAddress();
    expect(component.updateMessage().text).toContain('characters only');
  });

  it('should handle profile saving with image', () => {
    const payload = { name: 'New Name', imageFile: new File([], 'test.jpg') };
    component.onSaveProfile(payload);
    expect(authServiceSpy.uploadProfileImage).toHaveBeenCalled();
    expect(authServiceSpy.updateProfile).toHaveBeenCalledWith({ name: 'New Name', profileImage: 'new-url' });
  });

  it('should handle profile saving without image', () => {
    const payload = { name: 'New Name' };
    component.onSaveProfile(payload);
    expect(authServiceSpy.updateProfile).toHaveBeenCalledWith({ name: 'New Name' });
  });

  it('should handle wish list item removal', () => {
    component.onWishlistItemRemoved(123);
    expect(component.wishlistItems()).toEqual([]);
  });

  it('should correctly determine if order can be cancelled', () => {
    expect(component.canCancel({ orderStatus: 'PLACED' } as any)).toBe(true);
    expect(component.canCancel({ orderStatus: 'DELIVERED' } as any)).toBe(false);
  });

  it('should handle top up success', () => {
    component.onTopUpSuccess();
    expect(component.updateMessage().type).toBe('success');
  });

  it('should handle address deletion', () => {
    component.removeAddress(1);
    expect(orderServiceSpy.deleteAddress).toHaveBeenCalledWith(1);
  });

  it('should handle image error', () => {
    component.onImageError();
    expect(component.profileImageError()).toBe(true);
  });

  it('should handle onUpdateProfile success', () => {
    component.nameInput.set('New Name');
    component.onUpdateProfile();
    expect(authServiceSpy.updateProfile).toHaveBeenCalledWith({ name: 'New Name' });
    expect(component.updateMessage().type).toBe('success');
  });

  it('should handle onChangePassword success', () => {
    component.oldPasswordInput.set('old-pass');
    component.passwordInput.set('new-password');
    component.confirmPasswordInput.set('new-password');
    component.onChangePassword();
    expect(authServiceSpy.changePassword).toHaveBeenCalledWith('old-pass', 'new-password');
    expect(component.updateMessage().type).toBe('success');
  });

  it('should handle onChangePassword validation error', () => {
    component.oldPasswordInput.set('old-pass');
    component.passwordInput.set('short');
    component.confirmPasswordInput.set('short');
    component.onChangePassword();
    expect(component.updateMessage().type).toBe('error');
    expect(component.updateMessage().text).toContain('at least 8 characters');
  });

  it('should fetch transactions on init if wallet exists', () => {
    expect(walletServiceSpy.getStatements).toHaveBeenCalledWith(1);
  });

  it('should handle editAddress', () => {
    const address = { addressId: 1, fullName: 'John' } as any;
    component.editAddress(address);
    expect(component.editingAddressId()).toBe(1);
    expect(component.addressDraft().fullName).toBe('John');
    expect(component.activeTab()).toBe('settings');
  });

  it('should handle cancelOrder', () => {
    component.cancelOrder(1);
    expect(orderServiceSpy.cancelOrder).toHaveBeenCalledWith(1);
    expect(notificationServiceSpy.success).toHaveBeenCalled();
  });

  it('should handle logout confirmation', () => {
    component.logout();
    expect(component.showConfirmModal()).toBe(true);
    expect(component.confirmModalConfig().title).toBe('Logout Confirmation');
    
    component.onConfirmAction();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });

  it('should handle viewInvoice', () => {
    component.viewInvoice(1);
    expect(orderServiceSpy.downloadInvoicePdf).toHaveBeenCalledWith(1);
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  it('should handle setTab', () => {
    component.setTab('funds');
    expect(component.activeTab()).toBe('funds');
  });
});
