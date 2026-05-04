import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookCardComponent } from './book-card.component';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

describe('BookCardComponent', () => {
  let component: BookCardComponent;
  let fixture: ComponentFixture<BookCardComponent>;
  let cartServiceSpy: any;
  let wishlistServiceSpy: any;
  let authServiceSpy: any;
  let notificationServiceSpy: any;

  const mockUser = { userId: 1, fullName: 'Test User' };

  beforeEach(async () => {
    cartServiceSpy = {
      addToCart: vi.fn().mockReturnValue(of({}))
    };
    wishlistServiceSpy = {
      addToWishlist: vi.fn().mockReturnValue(of({})),
      removeFromWishlist: vi.fn().mockReturnValue(of({}))
    };
    authServiceSpy = {
      currentUser: signal(mockUser),
      resolveImageUrl: vi.fn().mockImplementation((url: string) => url.startsWith('/uploads') ? 'resolved-url' : null)
    };
    notificationServiceSpy = {
      error: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [BookCardComponent],
      providers: [
        { provide: CartService, useValue: cartServiceSpy },
        { provide: WishlistService, useValue: wishlistServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BookCardComponent);
    component = fixture.componentInstance;

    // Set required inputs
    fixture.componentRef.setInput('bookId', 1);
    fixture.componentRef.setInput('title', 'Test Book');
    fixture.componentRef.setInput('author', 'Test Author');
    fixture.componentRef.setInput('price', 10.99);
    fixture.componentRef.setInput('imageUrl', 'http://example.com/image.jpg');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add book to cart', () => {
    const event = new MouseEvent('click');
    const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');
    component.addToCart(event);
    expect(cartServiceSpy.addToCart).toHaveBeenCalledWith(1);
    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  it('should handle add to cart error', () => {
    cartServiceSpy.addToCart.mockReturnValue(throwError(() => new Error('Error')));
    component.addToCart(new MouseEvent('click'));
    expect(notificationServiceSpy.error).toHaveBeenCalledWith('Failed to add book to cart.');
  });

  it('should add to wishlist', () => {
    component.addToWishlist(new MouseEvent('click'));
    expect(wishlistServiceSpy.addToWishlist).toHaveBeenCalledWith(1, 1);
  });

  it('should handle wishlist error if not logged in', () => {
    authServiceSpy.currentUser.set(null);
    component.addToWishlist(new MouseEvent('click'));
    expect(notificationServiceSpy.error).toHaveBeenCalledWith('Please log in to save volumes to your wishlist.');
  });

  it.skip('should validate image URL correctly', () => {
    // Valid URL
    fixture.componentRef.setInput('imageUrl', 'http://example.com/image.jpg');
    fixture.detectChanges();
    expect(component.getSafeImageUrl()).toBe('http://example.com/image.jpg');

    // Broken URL
    fixture.componentRef.setInput('imageUrl', 'http://via.placeholder.com/150');
    fixture.detectChanges();
    expect(component.getSafeImageUrl()).toBe(component.fallbackImage);

    // Upload URL
    fixture.componentRef.setInput('imageUrl', '/uploads/book.jpg');
    fixture.detectChanges();
    expect(component.getSafeImageUrl()).toBe('resolved-url');
  });

  it('should calculate star fill correctly', () => {
    fixture.componentRef.setInput('rating', 3.5);
    fixture.detectChanges();
    expect(component.getStarFill(1)).toBe(100);
    expect(component.getStarFill(3)).toBe(100);
    expect(component.getStarFill(4)).toBe(50);
    expect(component.getStarFill(5)).toBe(0);
  });
});
