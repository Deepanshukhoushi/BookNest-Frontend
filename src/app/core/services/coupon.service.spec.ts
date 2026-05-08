import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CouponService } from './coupon.service';
import { environment } from '../../../environments/environment';
import { ApiResponse, Coupon, CouponValidateResponse } from '../../shared/models/models';

describe('CouponService', () => {
  let service: CouponService;
  let httpMock: HttpTestingController;

  const mockCoupon: Coupon = {
    couponId: 1,
    code: 'SAVE20',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    minOrderAmount: 100,
    maxUsage: 10,
    usageCount: 2,
    expiryDate: null,
    active: true,
    createdAt: new Date().toISOString(),
    isExpired: false,
    isExhausted: false
  };

  beforeEach(() => {
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

  it('getAllCoupons returns mapped data', () => {
    const response: ApiResponse<Coupon[]> = { success: true, message: '', data: [mockCoupon] };

    service.getAllCoupons().subscribe(coupons => {
      expect(coupons).toEqual([mockCoupon]);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/coupons`);
    expect(req.request.method).toBe('GET');
    req.flush(response);
  });

  it('createCoupon posts correctly', () => {
    service.createCoupon({
      code: 'SAVE20',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      minOrderAmount: 100,
      maxUsage: 10,
      expiryDate: null
    }).subscribe(coupon => {
      expect(coupon.code).toBe('SAVE20');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/coupons`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.code).toBe('SAVE20');
    req.flush({ success: true, message: '', data: mockCoupon });
  });

  it('validateCoupon calls correct endpoint with subtotal', () => {
    const payload: CouponValidateResponse = {
      valid: true,
      code: 'SAVE20',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      discountAmount: 40,
      finalAmount: 160,
      message: 'ok'
    };

    service.validateCoupon('SAVE20', 200).subscribe(response => {
      expect(response.finalAmount).toBe(160);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/coupons/validate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ code: 'SAVE20', subtotal: 200 });
    req.flush({ success: true, message: '', data: payload });
  });

  it('deleteCoupon sends DELETE', () => {
    service.deleteCoupon(1).subscribe(value => {
      expect(value).toBeUndefined();
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/coupons/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, message: '', data: null });
  });

  it('toggleCoupon sends PUT', () => {
    service.toggleCoupon(1).subscribe(coupon => {
      expect(coupon).toEqual(mockCoupon);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/coupons/1/toggle`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({});
    req.flush({ success: true, message: '', data: mockCoupon });
  });
});
