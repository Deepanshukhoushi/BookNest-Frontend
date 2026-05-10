import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BookDetailComponent } from './book-detail.component';
import { BookService } from '../../core/services/book.service';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { AuthService } from '../../core/services/auth.service';
import { ReviewService } from '../../core/services/review.service';
import { OrderService } from '../../core/services/order.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

describe('BookDetailComponent', () => {
  let component: BookDetailComponent;
  let fixture: ComponentFixture<BookDetailComponent>;
  let bookServiceSpy: any;
  let cartServiceSpy: any;
  let wishlistServiceSpy: any;
  let authServiceSpy: any;
  let reviewServiceSpy: any;
  let orderServiceSpy: any;
  let routerSpy: any;

  const mockBook = {
    bookId: 1,
    title: 'Test Book',
    author: 'Test Author',
    price: 1200,
    isbn: '1234567890',
    stock: 10,
    genre: 'Fiction'
  };

  beforeEach(async () => {
    bookServiceSpy = {
      getBookById: vi.fn().mockReturnValue(of(mockBook as any))
    };
    cartServiceSpy = {
      addToCart: vi.fn().mockReturnValue(of({} as any))
    };
    wishlistServiceSpy = {
      fetchWishlist: vi.fn().mockReturnValue(of({ items: [] } as any)),
      addToWishlist: vi.fn().mockReturnValue(of({} as any)),
      removeFromWishlist: vi.fn().mockReturnValue(of({} as any))
    };
    authServiceSpy = {
      currentUser: signal({ userId: 1, fullName: 'User' }),
      resolveImageUrl: vi.fn()
    };
    reviewServiceSpy = {
      getByBook: vi.fn().mockReturnValue(of([])),
      getByUser: vi.fn().mockReturnValue(of([])),
      addReview: vi.fn().mockReturnValue(of({} as any)),
      updateReview: vi.fn().mockReturnValue(of({} as any)),
      deleteReview: vi.fn().mockReturnValue(of({} as any))
    };
    orderServiceSpy = {
      getOrdersByUser: vi.fn().mockReturnValue(of([]))
    };
    routerSpy = {
      navigate: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [BookDetailComponent],
      providers: [
        { provide: BookService, useValue: bookServiceSpy },
        { provide: CartService, useValue: cartServiceSpy },
        { provide: WishlistService, useValue: wishlistServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ReviewService, useValue: reviewServiceSpy },
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: { params: of({ id: '1' }) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BookDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load book details on init', () => {
    expect(bookServiceSpy.getBookById).toHaveBeenCalledWith(1);
    expect(component.book()).toEqual(mockBook as any);
  });

  it('should calculate discount correctly', () => {
    expect(component.discount).toBe(10); // 1200 >= 1000
    component.book.set({ ...mockBook, price: 2500 } as any);
    expect(component.discount).toBe(15);
    component.book.set({ ...mockBook, price: 600 } as any);
    expect(component.discount).toBe(5);
    component.book.set({ ...mockBook, price: 100 } as any);
    expect(component.discount).toBe(0);
  });

  it('should increment and decrement quantity', () => {
    component.incrementQuantity();
    expect(component.quantity()).toBe(2);
    component.decrementQuantity();
    expect(component.quantity()).toBe(1);
    component.decrementQuantity(); // Should not go below 1
    expect(component.quantity()).toBe(1);
  });

  it('should handle add to cart', () => {
    component.addToCart();
    expect(cartServiceSpy.addToCart).toHaveBeenCalledWith(1, 1);
  });

  it('should toggle wishlist (add)', () => {
    component.isFavorited.set(false);
    component.toggleWishlist();
    expect(wishlistServiceSpy.addToWishlist).toHaveBeenCalled();
    expect(component.isFavorited()).toBe(true);
  });

  it('should toggle wishlist (remove)', () => {
    component.isFavorited.set(true);
    component.toggleWishlist();
    expect(wishlistServiceSpy.removeFromWishlist).toHaveBeenCalled();
    expect(component.isFavorited()).toBe(false);
  });

  it('should calculate review stats', () => {
    const reviews = [
      { rating: 5 },
      { rating: 3 }
    ] as any[];
    component.calculateStats(reviews);
    expect(component.totalReviews()).toBe(2);
    expect(component.avgRating()).toBe(4.0);
  });

  it('should set rating and clear error', () => {
    component.reviewError.set('Error');
    component.setRating(5);
    expect(component.reviewRating()).toBe(5);
    expect(component.reviewError()).toBe('');
  });

  it('should submit review', () => {
    component.reviewRating.set(5);
    component.reviewComment.set('This is a great book!');
    component.submitReview();
    expect(reviewServiceSpy.addReview).toHaveBeenCalled();
  });

  it('should handle submit review error', () => {
    component.reviewRating.set(5);
    component.reviewComment.set('This is a great book!');
    reviewServiceSpy.addReview = vi.fn().mockReturnValue(throwError(() => ({ error: { message: 'Only verified purchasers' } })));
    
    component.submitReview();
    
    expect(component.reviewError()).toBe('Only verified purchasers');
  });
});
