import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, Coupon, CouponRequestPayload, CouponValidateResponse } from '../../shared/models/models';

@Injectable({
  providedIn: 'root'
})
export class CouponService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiBaseUrl}/coupons`;

  getAllCoupons() {
    return this.http.get<ApiResponse<Coupon[]>>(this.API_URL).pipe(
      map(response => response.data)
    );
  }

  createCoupon(payload: CouponRequestPayload) {
    return this.http.post<ApiResponse<Coupon>>(this.API_URL, payload).pipe(
      map(response => response.data)
    );
  }

  deleteCoupon(id: number) {
    return this.http.delete<ApiResponse<null>>(`${this.API_URL}/${id}`).pipe(
      map(() => void 0)
    );
  }

  toggleCoupon(id: number) {
    return this.http.put<ApiResponse<Coupon>>(`${this.API_URL}/${id}/toggle`, {}).pipe(
      map(response => response.data)
    );
  }

  validateCoupon(code: string, subtotal: number) {
    return this.http.post<ApiResponse<CouponValidateResponse>>(`${this.API_URL}/validate`, { code, subtotal }).pipe(
      map(response => response.data)
    );
  }
}
