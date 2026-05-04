import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OrderService } from './order.service';
import { environment } from '../../../environments/environment';
import { ApiResponse, Order, OrderStatus, Address } from '../../shared/models/models';

describe('OrderService', () => {
  let service: OrderService;
  let httpMock: HttpTestingController;

  const mockAddress: Address = {
    addressId: 1,
    customerId: 1,
    fullName: 'John Doe',
    mobileNumber: '1234567890',
    flatNumber: '101',
    city: 'Mumbai',
    state: 'MH',
    pincode: '400001'
  };

  const mockOrder: Order = {
    orderId: 1,
    userId: 1,
    orderDate: new Date().toISOString(),
    amountPaid: 100,
    orderStatus: OrderStatus.PLACED,
    quantity: 1,
    bookId: 101,
    bookName: 'Test Book',
    statusHistory: []
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OrderService]
    });
    service = TestBed.inject(OrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should save address', () => {
    const response: ApiResponse<Address> = { success: true, message: 'Saved', data: mockAddress };
    
    service.saveAddress(mockAddress).subscribe(addr => {
      expect(addr).toEqual(mockAddress);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/orders/address`);
    expect(req.request.method).toBe('POST');
    req.flush(response);
  });

  it('should fetch orders by user', () => {
    const response: ApiResponse<Order[]> = { success: true, message: '', data: [mockOrder] };

    service.getOrdersByUser(1).subscribe(orders => {
      expect(orders.length).toBe(1);
      expect(orders[0].orderId).toBe(1);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/orders/user/1`);
    expect(req.request.method).toBe('GET');
    req.flush(response);
  });

  it('should handle checkout', () => {
    const response: ApiResponse<Order[]> = { success: true, message: 'Success', data: [mockOrder] };
    const payload = { userId: 1, addressId: 1, paymentMethod: 'WALLET' as const };

    service.checkout(payload).subscribe(orders => {
      expect(orders[0]).toEqual(mockOrder);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/orders/checkout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(response);
  });

  it('should update order status', () => {
    const updatedOrder = { ...mockOrder, orderStatus: OrderStatus.SHIPPED };
    const response: ApiResponse<Order> = { success: true, message: 'Updated', data: updatedOrder };

    service.updateOrderStatus(1, 'SHIPPED').subscribe(order => {
      expect(order.orderStatus).toBe(OrderStatus.SHIPPED);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/orders/status`);
    expect(req.request.method).toBe('PUT');
    req.flush(response);
  });
});
