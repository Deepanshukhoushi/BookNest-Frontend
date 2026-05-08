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

  it('should save a new address', () => {
    const response: ApiResponse<Address> = { success: true, message: '', data: mockAddress };
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
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/orders/user/1`);
    req.flush(response);
  });

  it('should fetch order by ID', () => {
    const response: ApiResponse<Order> = { success: true, message: '', data: mockOrder };
    service.getOrderById(1).subscribe(order => {
      expect(order).toEqual(mockOrder);
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/orders/1`);
    req.flush(response);
  });

  it('should track order', () => {
    const response: ApiResponse<Order> = { success: true, message: '', data: mockOrder };
    service.trackOrder(1).subscribe(order => {
      expect(order).toEqual(mockOrder);
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/orders/1/track`);
    req.flush(response);
  });

  it('should handle checkout', () => {
    const payload = { userId: 1, paymentMethod: 'WALLET' as any, addressId: 1 };
    const response: ApiResponse<Order[]> = { success: true, message: '', data: [mockOrder] };
    service.checkout(payload).subscribe(orders => {
      expect(orders.length).toBe(1);
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/orders/checkout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('X-Skip-Toast')).toBe('true');
    req.flush(response);
  });

  it('should initiate payment', () => {
    const response: ApiResponse<string> = { success: true, message: '', data: 'razorpay_order_id' };
    service.initiatePayment(1, 4, 'SAVE20').subscribe(orderId => {
      expect(orderId).toBe('razorpay_order_id');
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/payments/initiate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ userId: 1, addressId: 4, discountCode: 'SAVE20' });
    req.flush(response);
  });

  it('should verify payment', () => {
    const payload = { razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: 'sig_1' };
    const response: ApiResponse<Order[]> = { success: true, message: '', data: [mockOrder] };
    service.verifyPayment(payload).subscribe(orders => {
      expect(orders.length).toBe(1);
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/payments/verify`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('X-Skip-Toast')).toBe('true');
    req.flush(response);
  });

  it('should get Razorpay public key', () => {
    const response: ApiResponse<string> = { success: true, message: '', data: 'rzp_key' };
    service.getRazorpayPublicKey().subscribe(key => {
      expect(key).toBe('rzp_key');
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/payments/config/public-key`);
    req.flush(response);
  });

  it('should update order status', () => {
    const response: ApiResponse<Order> = { success: true, message: '', data: mockOrder };
    service.updateOrderStatus(1, 'CONFIRMED').subscribe(order => {
      expect(order).toEqual(mockOrder);
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/orders/status`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ orderId: 1, status: 'CONFIRMED' });
    req.flush(response);
  });

  it('should get invoice', () => {
    const mockInvoice = { invoiceId: 1, orderId: 1, items: [] } as any;
    const response: ApiResponse<any> = { success: true, message: '', data: mockInvoice };
    service.getInvoice(1).subscribe(invoice => {
      expect(invoice).toEqual(mockInvoice);
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/orders/1/invoice`);
    req.flush(response);
  });

  it('should fetch addresses by customer', () => {
    const response: ApiResponse<Address[]> = { success: true, message: '', data: [mockAddress] };
    service.getAddressesByCustomer(1).subscribe(addrs => {
      expect(addrs.length).toBe(1);
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/orders/address/1`);
    req.flush(response);
  });

  it('should update address', () => {
    const response: ApiResponse<Address> = { success: true, message: '', data: mockAddress };
    service.updateAddress(1, mockAddress).subscribe(addr => {
      expect(addr).toEqual(mockAddress);
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/orders/address/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(response);
  });

  it('should delete address', () => {
    const response: ApiResponse<null> = { success: true, message: 'Deleted', data: null };
    service.deleteAddress(1).subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/orders/address/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(response);
  });

  it('should cancel order', () => {
    const cancelledOrder = { ...mockOrder, orderStatus: OrderStatus.CANCELLED };
    const response: ApiResponse<Order> = { success: true, message: '', data: cancelledOrder };
    service.cancelOrder(1).subscribe(order => {
      expect(order.orderStatus).toBe(OrderStatus.CANCELLED);
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/orders/1/cancel`);
    expect(req.request.method).toBe('PUT');
    req.flush(response);
  });

  it('should fetch all orders for admin', () => {
    const response: ApiResponse<Order[]> = { success: true, message: '', data: [mockOrder] };
    service.getAllOrders().subscribe(orders => {
      expect(orders.length).toBe(1);
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/orders`);
    req.flush(response);
  });

  it('should download invoice PDF', () => {
    const blob = new Blob(['pdf-content'], { type: 'application/pdf' });
    service.downloadInvoicePdf(1).subscribe(res => {
      expect(res).toBeInstanceOf(Blob);
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/orders/1/invoice/pdf`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(blob);
  });
});
