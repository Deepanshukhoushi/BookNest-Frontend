import { environment } from '../../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { Address, ApiResponse, Invoice, Order, CheckoutPayload } from '../../shared/models/models';

/**
 * Service responsible for managing orders, shipping addresses, and payment processing.
 * Connects the frontend to the backend order and payment microservices.
 */
@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.apiBaseUrl + '/orders';
  private readonly PAYMENT_URL = environment.apiBaseUrl + '/payments';

  // Saves a new shipping address for the user
  saveAddress(address: Address) {
    return this.http.post<ApiResponse<Address>>(`${this.API_URL}/address`, address).pipe(
      map(response => response.data)
    );
  }

  getAddressesByCustomer(userId: number) {
    return this.http.get<ApiResponse<Address[]>>(`${this.API_URL}/address/${userId}`).pipe(
      map(response => response.data)
    );
  }

  updateAddress(addressId: number, address: Address) {
    return this.http.put<ApiResponse<Address>>(`${this.API_URL}/address/${addressId}`, address).pipe(
      map(response => response.data)
    );
  }

  deleteAddress(addressId: number) {
    return this.http.delete<ApiResponse<null>>(`${this.API_URL}/address/${addressId}`).pipe(
      map(response => response.data)
    );
  }

  // Retrieves a list of orders for a specific user ID
  getOrdersByUser(userId: number) {
    return this.http.get<ApiResponse<Order[]>>(`${this.API_URL}/user/${userId}`).pipe(
      map(response => response.data)
    );
  }

  // Fetches details for a single order by its ID
  getOrderById(orderId: number) {
    return this.http.get<ApiResponse<Order>>(`${this.API_URL}/${orderId}`).pipe(
      map(response => response.data)
    );
  }

  trackOrder(orderId: number) {
    return this.http.get<ApiResponse<Order>>(`${this.API_URL}/${orderId}/track`).pipe(
      map(response => response.data)
    );
  }

  // Initiates the checkout process for standard or wallet payments
  checkout(payload: CheckoutPayload) {
    return this.http.post<ApiResponse<Order[]>>(`${this.API_URL}/checkout`, payload, {
      headers: { 'X-Skip-Toast': 'true' }
    }).pipe(
      map(response => response.data)
    );
  }

  // Starts an online payment session on the backend
  initiatePayment(userId: number, addressId?: number | null, discountCode?: string | null) {
    return this.http.post<ApiResponse<string>>(`${this.PAYMENT_URL}/initiate`, { userId, addressId, discountCode }).pipe(
      map(response => response.data)
    );
  }

  // Verifies the authenticity of a completed online payment
  verifyPayment(verifyPayload: Record<string, unknown>) {
    return this.http.post<ApiResponse<Order[]>>(`${this.PAYMENT_URL}/verify`, verifyPayload, {
      headers: { 'X-Skip-Toast': 'true' }
    }).pipe(
      map(response => response.data)
    );
  }

  getRazorpayPublicKey() {
    return this.http.get<ApiResponse<string>>(`${this.PAYMENT_URL}/config/public-key`).pipe(
      map(response => response.data)
    );
  }

  // Admin feature: Retrieves all orders from the system
  getAllOrders() {
    return this.http.get<ApiResponse<Order[]>>(`${this.API_URL}`).pipe(
      map(response => response.data)
    );
  }

  // Admin feature: Updates the status of an existing order
  updateOrderStatus(orderId: number, status: string) {
    return this.http.put<ApiResponse<Order>>(`${this.API_URL}/status`, { orderId, status }).pipe(
      map(response => response.data)
    );
  }

  cancelOrder(orderId: number) {
    return this.http.put<ApiResponse<Order>>(`${this.API_URL}/${orderId}/cancel`, {}).pipe(
      map(response => response.data)
    );
  }

  getInvoice(orderId: number) {
    return this.http.get<ApiResponse<Invoice>>(`${this.API_URL}/${orderId}/invoice`).pipe(
      map(response => response.data)
    );
  }

  /**
   * Downloads a professional PDF invoice by triggering a browser file-save.
   * The backend streams raw PDF bytes; the frontend constructs a Blob URL and clicks it.
   */
  downloadInvoicePdf(orderId: number) {
    return this.http.get(`${this.API_URL}/${orderId}/invoice/pdf`, {
      responseType: 'blob'
    });
  }
}
