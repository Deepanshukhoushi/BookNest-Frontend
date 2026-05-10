import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CouponService } from './coupon.service';
import { environment } from '../../../environments/environment';

describe('CouponService', () => {
  let service: CouponService;
  let httpMock: HttpTestingController;
  const API_URL = `${environment.apiBaseUrl}/coupons`;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CouponService]
    });
    service = TestBed.inject(CouponService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should validate coupon', () => {
    const mockResponse = { success: true, data: { code: 'SAVE10', discountAmount: 50 }, message: 'Valid' };
    service.validateCoupon('SAVE10', 500).subscribe(res => {
      expect(res.code).toBe('SAVE10');
    });

    const req = httpMock.expectOne(`${API_URL}/validate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ code: 'SAVE10', subtotal: 500 });
    req.flush(mockResponse);
  });

  it('should get all coupons', () => {
    const mockCoupons = [{ couponId: 1, code: 'C1' }];
    service.getAllCoupons().subscribe(res => {
      expect(res.length).toBe(1);
    });

    const req = httpMock.expectOne(API_URL);
    expect(req.request.method).toBe('GET');
    req.flush({ data: mockCoupons });
  });

  it('should create coupon', () => {
    const payload = { code: 'NEW' } as any;
    service.createCoupon(payload).subscribe(res => {
      expect(res.code).toBe('NEW');
    });

    const req = httpMock.expectOne(API_URL);
    expect(req.request.method).toBe('POST');
    req.flush({ data: { code: 'NEW' } });
  });

  it('should delete coupon', () => {
    service.deleteCoupon(1).subscribe();
    const req = httpMock.expectOne(`${API_URL}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true });
  });

  it('should toggle coupon', () => {
    service.toggleCoupon(1).subscribe();
    const req = httpMock.expectOne(`${API_URL}/1/toggle`);
    expect(req.request.method).toBe('PUT');
    req.flush({ data: {} });
  });
});
