import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CartComponent } from './cart.component';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';

describe('CartComponent', () => {
  let component: CartComponent;
  let fixture: ComponentFixture<CartComponent>;
  let cartServiceSpy: any;
  let wishlistServiceSpy: any;
  let authServiceSpy: any;
  let notificationServiceSpy: any;
  let routerSpy: any;

  const mockCart = {
    cartId: 1,
    userId: 101,
    items: [
      { itemId: 1, bookId: 1, bookTitle: 'Book 1', price: 100, quantity: 1 }
    ],
    totalPrice: 100
  };

  const mockUser = { userId: 101, fullName: 'Test User' };

  beforeEach(async () => {
    cartServiceSpy = {
      cart: signal(mockCart),
      updateQuantity: vi.fn().mockReturnValue(of(mockCart)),
      removeFromCart: vi.fn().mockReturnValue(of(mockCart)),
      addToCart: vi.fn().mockReturnValue(of(mockCart))
    };
    wishlistServiceSpy = {
      fetchWishlist: vi.fn().mockReturnValue(of({ items: [] })),
      removeFromWishlist: vi.fn().mockReturnValue(of({}))
    };
    authServiceSpy = {
      currentUser: signal(mockUser)
    };
    notificationServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    };
    routerSpy = {
      navigate: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [CartComponent],
      providers: [
        provideRouter([]),
        { provide: CartService, useValue: cartServiceSpy },
        { provide: WishlistService, useValue: wishlistServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CartComponent);
    component = fixture.componentInstance;
    // Mock the actual router's navigate method since we're using provideRouter
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    routerSpy = router;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate totals correctly', () => {
    expect(component.subtotal()).toBe(100);
    expect(component.shipping()).toBe(12); // Under 250
    expect(component.tax()).toBe(8);
    expect(component.total()).toBe(120);

    // Free shipping test
    cartServiceSpy.cart.set({ ...mockCart, totalPrice: 300 });
    expect(component.shipping()).toBe(0);
  });

  it('should update item quantity', () => {
    component.updateQuantity(1, 2);
    expect(cartServiceSpy.updateQuantity).toHaveBeenCalledWith(1, 2);
  });

  it('should remove item', () => {
    component.removeItem(1);
    expect(cartServiceSpy.removeFromCart).toHaveBeenCalledWith(1);
  });

  it('should navigate to checkout', () => {
    component.checkout();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/checkout']);
  });

  it('should move item from wishlist to cart', () => {
    const mockWishlistItem = { itemId: 1, bookId: 2, bookTitle: 'Wishlist Book', bookPrice: 500, addedAt: new Date().toISOString() };
    component.moveToCart(mockWishlistItem);
    
    expect(cartServiceSpy.addToCart).toHaveBeenCalledWith(2, 1);
    expect(wishlistServiceSpy.removeFromWishlist).toHaveBeenCalledWith(101, 2);
  });

  it('should handle quantity limits', () => {
    // Mock item with stock 5
    cartServiceSpy.cart.set({
      ...mockCart,
      items: [{ ...mockCart.items[0], stockAvailable: 5 }]
    });
    
    component.updateQuantity(1, 6);
    expect(notificationServiceSpy.error).toHaveBeenCalledWith('Only 5 copies available in stock.');
    expect(cartServiceSpy.updateQuantity).not.toHaveBeenCalled();
  });

  it('should redirect to auth if moving to cart without login', () => {
    authServiceSpy.currentUser.set(null);
    const mockWishlistItem = { itemId: 1, bookId: 2, bookTitle: 'Wishlist Book', bookPrice: 500, addedAt: new Date().toISOString() };
    component.moveToCart(mockWishlistItem);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth'], expect.any(Object));
  });

  it('should have trackBy functions', () => {
    expect(component.trackByItemId(0, { itemId: 123 } as any)).toBe(123);
    expect(component.trackByWishlistId(0, { itemId: 456 } as any)).toBe(456);
  });
});
