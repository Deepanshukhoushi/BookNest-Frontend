import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WishlistService } from './wishlist.service';

describe('WishlistService', () => {
  let service: WishlistService;
  let httpMock: HttpTestingController;

  const mockWishlist = {
    wishlistId: 1,
    userId: 1,
    items: [{ bookId: 10, title: 'Test Book', price: 299 }]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        WishlistService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    service = TestBed.inject(WishlistService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize wishlist signal as null', () => {
    expect(service.wishlist()).toBeNull();
  });

  it('fetchWishlist() should GET and update the wishlist signal', () => {
    service.fetchWishlist(1).subscribe(w => expect(w).toEqual(mockWishlist));

    const req = httpMock.expectOne(r => r.url.includes('/wishlist/1'));
    expect(req.request.method).toBe('GET');
    req.flush(mockWishlist);

    expect(service.wishlist()).toEqual(mockWishlist);
  });

  it('addToWishlist() should POST and update the wishlist signal', () => {
    service.addToWishlist(1, 10).subscribe(w => expect(w).toEqual(mockWishlist));

    const req = httpMock.expectOne(r => r.url.includes('/wishlist/add'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ userId: 1, bookId: 10 });
    req.flush(mockWishlist);

    expect(service.wishlist()).toEqual(mockWishlist);
  });

  it('removeFromWishlist() should DELETE and update the wishlist signal', () => {
    const updatedWishlist = { ...mockWishlist, items: [] };
    service.removeFromWishlist(1, 10).subscribe(w => expect(w).toEqual(updatedWishlist));

    const req = httpMock.expectOne(r => r.url.includes('/wishlist/remove'));
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ userId: 1, bookId: 10 });
    req.flush(updatedWishlist);

    expect(service.wishlist()).toEqual(updatedWishlist);
  });

  it('moveToCart() should POST to moveToCart endpoint', () => {
    service.moveToCart(1, 10).subscribe();

    const req = httpMock.expectOne(r => r.url.includes('/wishlist/moveToCart'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ userId: 1, bookId: 10 });
    req.flush({ success: true });
  });
});
