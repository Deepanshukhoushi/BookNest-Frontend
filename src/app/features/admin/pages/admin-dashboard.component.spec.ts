import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { BookService } from '../../../core/services/book.service';
import { OrderService } from '../../../core/services/order.service';
import { ReviewService } from '../../../core/services/review.service';
import { AuthService } from '../../../core/services/auth.service';
import { CouponService } from '../../../core/services/coupon.service';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';
import { signal } from '@angular/core';

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let bookServiceSpy: any;
  let orderServiceSpy: any;
  let reviewServiceSpy: any;
  let authServiceSpy: any;
  let couponServiceSpy: any;
  let routerSpy: any;

  beforeEach(async () => {
    bookServiceSpy = {
      getBooks: vi.fn().mockReturnValue(of({ content: [], totalElements: 0 })),
      addBook: vi.fn().mockReturnValue(of({})),
      updateBook: vi.fn().mockReturnValue(of({})),
      deleteBook: vi.fn().mockReturnValue(of({}))
    };
    orderServiceSpy = {
      getAllOrders: vi.fn().mockReturnValue(of([])),
      updateOrderStatus: vi.fn().mockReturnValue(of({})),
      getAdminAlerts: vi.fn().mockReturnValue(of({ lowStock: [], newOrders: [] }))
    };
    reviewServiceSpy = {
      getAllReviews: vi.fn().mockReturnValue(of([])),
      getStatusCounts: vi.fn().mockReturnValue(of({ PENDING: 0, APPROVED: 0, REJECTED: 0 })),
      approveReview: vi.fn().mockReturnValue(of({})),
      rejectReview: vi.fn().mockReturnValue(of({})),
      deleteReview: vi.fn().mockReturnValue(of({}))
    };
    authServiceSpy = {
      getAllUsers: vi.fn().mockReturnValue(of([])),
      logout: vi.fn(),
      resolveImageUrl: vi.fn(),
      currentUser: signal({ userId: 1, fullName: 'Admin', role: 'ADMIN' })
    };
    couponServiceSpy = {
      getAllCoupons: vi.fn().mockReturnValue(of([])),
      createCoupon: vi.fn().mockReturnValue(of({ code: 'SAVE20', couponId: 1 })),
      deleteCoupon: vi.fn().mockReturnValue(of(void 0)),
      toggleCoupon: vi.fn().mockReturnValue(of({ code: 'SAVE20', couponId: 1, active: false }))
    };
    routerSpy = {
      navigate: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent, ReactiveFormsModule],
      providers: [
        { provide: BookService, useValue: bookServiceSpy },
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: ReviewService, useValue: reviewServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: CouponService, useValue: couponServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { params: of({}) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should handle book creation', () => {
    component.openAddBookModal();
    component.bookForm.patchValue({
      title: 'New Book',
      author: 'Author',
      price: 500,
      isbn: '1234567890',
      genre: 'Fiction',
      stock: 10
    });
    component.submitBookForm();
    expect(bookServiceSpy.addBook).toHaveBeenCalled();
  });

  it('should handle book update', () => {
    component.openEditBookModal({ 
      bookId: 1, 
      title: 'Existing', 
      author: 'Author', 
      isbn: '123', 
      price: 100, 
      stock: 5 
    } as any);
    component.submitBookForm();
    expect(bookServiceSpy.updateBook).toHaveBeenCalledWith(1, expect.any(Object));
  });

  it('should handle book deletion', () => {
    component.inventory.set([{ bookId: 1, title: 'Test' } as any]);
    fixture.detectChanges();
    component.deleteBook(1);
    expect(component.showConfirmModal()).toBe(true);
    component.onConfirmAction();
    expect(bookServiceSpy.deleteBook).toHaveBeenCalledWith(1);
  });

  it('should approve review', () => {
    component.approveReview(101);
    expect(reviewServiceSpy.approveReview).toHaveBeenCalledWith(101);
  });

  it('should reject review', () => {
    component.rejectReview(101);
    expect(reviewServiceSpy.rejectReview).toHaveBeenCalledWith(101);
  });

  it('should remove review', () => {
    component.removeReview(101);
    expect(reviewServiceSpy.deleteReview).toHaveBeenCalledWith(101);
  });

  it('should handle review filtering', () => {
    const reviews = [
      { reviewId: 1, status: 'PENDING' },
      { reviewId: 2, status: 'APPROVED' }
    ] as any[];
    component.allReviews.set(reviews);
    component.setReviewTab('PENDING');
    expect(component.filteredReviews().length).toBe(1);
  });

  it('should calculate category breakdown', () => {
    component.inventory.set([
      { genre: 'Fiction' },
      { genre: 'Fiction' },
      { genre: 'Sci-Fi' }
    ] as any[]);
    const breakdown = component.categoryBreakdown();
    expect(breakdown.find(b => b.genre === 'Fiction')?.count).toBe(2);
    expect(breakdown.find(b => b.genre === 'Sci-Fi')?.count).toBe(1);
  });

  it('should update user role', () => {
    authServiceSpy.updateUserRole = vi.fn().mockReturnValue(of({ userId: 1, fullName: 'U1', role: 'ADMIN' }));
    component.updateUserRole(1, 'ADMIN');
    expect(authServiceSpy.updateUserRole).toHaveBeenCalledWith(1, 'ADMIN');
  });

  it('should toggle user suspension', () => {
    authServiceSpy.suspendUser = vi.fn().mockReturnValue(of({ userId: 1, suspended: true }));
    component.toggleSuspension({ userId: 1, suspended: false } as any);
    expect(authServiceSpy.suspendUser).toHaveBeenCalledWith(1);
  });

  it('should delete user', () => {
    authServiceSpy.deleteUser = vi.fn().mockReturnValue(of({}));
    component.deleteUser({ userId: 1, fullName: 'U1' } as any);
    expect(component.showConfirmModal()).toBe(true);
    component.onConfirmAction();
    expect(authServiceSpy.deleteUser).toHaveBeenCalledWith(1);
  });

  it('should copy dispatch info', () => {
    const mockClipboard = {
      writeText: vi.fn().mockReturnValue(Promise.resolve())
    };
    (navigator as any).clipboard = mockClipboard;
    (window as any).isSecureContext = true;

    component.copyDispatchInfo({ 
      orderId: 1, 
      orderStatus: 'PLACED', 
      bookName: 'B1', 
      quantity: 1, 
      amountPaid: 100,
      address: { fullName: 'John' }
    } as any);

    expect(mockClipboard.writeText).toHaveBeenCalled();
  });

  it('should load more books', () => {
    const initial = component.booksToShow();
    component.loadMoreBooks();
    expect(component.booksToShow()).toBe(initial + 15);
  });

  it('should handle genre filtering', () => {
    component.setGenreFilter('Fiction');
    expect(component.selectedGenre()).toBe('Fiction');
    component.clearGenreFilter();
    expect(component.selectedGenre()).toBeNull();
  });

  it('should handle search changes', () => {
    const event = { target: { value: 'search' } } as any;
    component.onSearchChange(event);
    expect(component.searchTerm()).toBe('search');
    component.clearSearch();
    expect(component.searchTerm()).toBe('');
  });

  it('should handle order search changes', () => {
    const event = { target: { value: 'order-search' } } as any;
    component.onOrderSearchChange(event);
    expect(component.orderSearchTerm()).toBe('order-search');
    component.clearOrderSearch();
    expect(component.orderSearchTerm()).toBe('');
  });

  it('should get safe image URL', () => {
    authServiceSpy.resolveImageUrl.mockReturnValue('resolved-url');
    expect(component.getSafeImageUrl('img.png')).toBe('resolved-url');
    expect(component.getSafeImageUrl('http://external.com/img.png')).toBe('http://external.com/img.png');
    expect(component.getSafeImageUrl('')).toContain('fallback');
  });

  it('should handle admin image error', () => {
    component.onAdminImageError();
    expect(component.adminProfileImageError()).toBe(true);
  });

  it('should open and close coupon modal', () => {
    component.openCouponModal();
    expect(component.showCouponModal()).toBe(true);
    expect(component.couponForm.get('discountType')?.value).toBe('PERCENTAGE');

    component.closeCouponModal();
    expect(component.showCouponModal()).toBe(false);
  });

  it('should not create coupon when form is invalid', () => {
    component.couponForm.patchValue({ code: '', discountValue: 0 });

    component.createCoupon();

    expect(couponServiceSpy.createCoupon).not.toHaveBeenCalled();
    expect(component.actionError()).toBe('Please complete the coupon form correctly.');
  });

  it('should create coupon with normalized payload', () => {
    component.openCouponModal();
    component.couponForm.patchValue({
      code: ' save20 ',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      minOrderAmount: 100,
      maxUsage: '5',
      expiryDate: '2026-12-31T10:30'
    });

    component.createCoupon();

    expect(couponServiceSpy.createCoupon).toHaveBeenCalledWith({
      code: 'SAVE20',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      minOrderAmount: 100,
      maxUsage: 5,
      expiryDate: '2026-12-31T10:30'
    });
    expect(component.showCouponModal()).toBe(false);
    expect(component.actionMessage()).toContain('Coupon SAVE20 created successfully.');
  });

  it('should handle coupon creation error', () => {
    couponServiceSpy.createCoupon.mockReturnValueOnce(throwError(() => ({ error: { message: 'Duplicate code' } })));
    component.couponForm.patchValue({
      code: 'SAVE20',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      minOrderAmount: 100
    });

    component.createCoupon();

    expect(component.actionError()).toBe('Duplicate code');
    expect(component.couponSubmitting()).toBe(false);
  });

  it('should delete coupon and update list', () => {
    component.allCoupons.set([
      { couponId: 1, code: 'SAVE20' },
      { couponId: 2, code: 'FLAT50' }
    ] as any);

    component.deleteCoupon(1);

    expect(couponServiceSpy.deleteCoupon).toHaveBeenCalledWith(1);
    expect(component.allCoupons().map(c => c.couponId)).toEqual([2]);
    expect(component.actionMessage()).toBe('Coupon deleted successfully.');
  });

  it('should handle coupon deletion error', () => {
    couponServiceSpy.deleteCoupon.mockReturnValueOnce(throwError(() => ({ error: { message: 'Delete failed' } })));

    component.deleteCoupon(1);

    expect(component.actionError()).toBe('Delete failed');
  });

  it('should toggle coupon and update list', () => {
    component.allCoupons.set([
      { couponId: 1, code: 'SAVE20', active: true }
    ] as any);
    couponServiceSpy.toggleCoupon.mockReturnValueOnce(of({ couponId: 1, code: 'SAVE20', active: false }));

    component.toggleCoupon(1);

    expect(couponServiceSpy.toggleCoupon).toHaveBeenCalledWith(1);
    expect(component.allCoupons()[0].active).toBe(false);
    expect(component.actionMessage()).toBe('Coupon SAVE20 updated.');
  });

  it('should handle coupon toggle error', () => {
    couponServiceSpy.toggleCoupon.mockReturnValueOnce(throwError(() => ({ error: { message: 'Toggle failed' } })));

    component.toggleCoupon(1);

    expect(component.actionError()).toBe('Toggle failed');
  });

  it('should handle logout', () => {
    component.logout();
    expect(component.showConfirmModal()).toBe(true);
    component.onConfirmAction();
    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth']);
  });
});
