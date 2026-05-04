import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CartService } from './cart.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { ApiResponse, Cart, Role, AuthProvider } from '../../shared/models/models';
import { signal } from '@angular/core';

describe('CartService', () => {
  let service: CartService;
  let httpMock: HttpTestingController;
  let authServiceSpy: any;

  const mockUser = {
    userId: 1,
    fullName: 'Test User',
    email: 'test@example.com',
    role: Role.USER,
    provider: AuthProvider.LOCAL,
    createdAt: new Date().toISOString()
  };

  const mockCart: Cart = {
    cartId: 1,
    userId: 1,
    items: [
      { itemId: 1, bookId: 101, bookTitle: 'Book 1', price: 10, quantity: 2 }
    ],
    totalPrice: 20
  };

  beforeEach(() => {
    authServiceSpy = {
      currentUser: signal<any>(null)
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CartService,
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    service = TestBed.inject(CartService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch cart when user becomes available', () => {
    // Set user to trigger the effect
    authServiceSpy.currentUser.set(mockUser);
    TestBed.flushEffects();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/cart/1`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: mockCart });

    expect(service.cart()).toEqual(mockCart);
  });

  it('should add item to cart', () => {
    authServiceSpy.currentUser.set(mockUser);
    const response: ApiResponse<Cart> = { success: true, message: 'Added', data: mockCart };
    
    service.addToCart(101, 2).subscribe(cart => {
      expect(cart).toEqual(mockCart);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/cart/add`);
    expect(req.request.method).toBe('POST');
    req.flush(response);
  });

  it('should update item quantity', () => {
    authServiceSpy.currentUser.set(mockUser);
    const updatedCart = { ...mockCart, totalPrice: 30 };
    const response: ApiResponse<Cart> = { success: true, message: 'Updated', data: updatedCart };

    service.updateQuantity(1, 3).subscribe(cart => {
      expect(cart?.totalPrice).toBe(30);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/cart/update`);
    expect(req.request.method).toBe('PUT');
    req.flush(response);
  });

  it('should remove item from cart', () => {
    authServiceSpy.currentUser.set(mockUser);
    const response: ApiResponse<Cart> = { success: true, message: 'Removed', data: mockCart };

    service.removeFromCart(1).subscribe(cart => {
      expect(cart).toEqual(mockCart);
    });

    const req = httpMock.expectOne(r => r.url === `${environment.apiBaseUrl}/cart/remove` && r.method === 'DELETE');
    req.flush(response);
  });

  it('should clear cart', () => {
    authServiceSpy.currentUser.set(mockUser);
    const response: ApiResponse<null> = { success: true, message: 'Cleared', data: null };

    service.clearCart().subscribe(msg => {
      expect(msg).toBe('Cleared');
    });

    const req = httpMock.expectOne(r => r.url === `${environment.apiBaseUrl}/cart/clear` && r.method === 'DELETE');
    req.flush(response);
  });
});
