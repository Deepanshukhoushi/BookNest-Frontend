import { environment } from '../../../environments/environment';
import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { ApiResponse, Cart } from '../../shared/models/models';
import { tap, of, map } from 'rxjs';

/**
 * Service managing the shopping cart state and operations.
 * Uses Angular signals to provide reactive access to cart data across the app.
 */
@Injectable({
  providedIn: 'root'
})
export class CartService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly API_URL = environment.apiBaseUrl + '/cart';

  // State
  private cartSignal = signal<Cart | null>(null);
  cart = this.cartSignal.asReadonly();
  
  cartItemsCount = computed(() => {
    const items = this.cartSignal()?.items || [];
    return items.reduce((acc, item) => acc + item.quantity, 0);
  });

  cartTotal = computed(() => this.cartSignal()?.totalPrice || 0);

  constructor() {
    // Sync cart whenever user changes
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.fetchCart(user.userId).subscribe();
      } else {
        this.cartSignal.set(null);
      }
    });
  }

  // Fetches the shopping cart data for a specific user
  fetchCart(userId: number) {
    return this.http.get<ApiResponse<Cart>>(`${this.API_URL}/${userId}`).pipe(
      map(response => response.data),
      tap(cart => this.cartSignal.set(cart))
    );
  }

  // Adds a specified quantity of a book to the user's cart
  addToCart(bookId: number, quantity: number = 1) {
    const user = this.authService.currentUser();
    if (!user) return of(null as unknown as Cart); // Force type

    return this.http.post<ApiResponse<Cart>>(`${this.API_URL}/add`, {
      userId: user.userId,
      bookId,
      quantity
    }).pipe(
      map(response => response.data),
      tap(cart => this.cartSignal.set(cart))
    );
  }

  // Updates the quantity for a particular item already in the cart
  updateQuantity(itemId: number, quantity: number) {
    const user = this.authService.currentUser();
    if (!user) return of(null as unknown as Cart);

    return this.http.put<ApiResponse<Cart>>(`${this.API_URL}/update`, {
      userId: user.userId,
      itemId,
      quantity
    }).pipe(
      map(response => response.data),
      tap(cart => this.cartSignal.set(cart))
    );
  }

  // Removes a specific item from the shopping cart
  removeFromCart(itemId: number) {
    const user = this.authService.currentUser();
    if (!user) return of(null as unknown as Cart);

    return this.http.delete<ApiResponse<Cart>>(`${this.API_URL}/remove`, {
      body: {
        userId: user.userId,
        itemId
      }
    }).pipe(
      map(response => response.data),
      tap(cart => this.cartSignal.set(cart))
    );
  }

  // Clears all items from the user's shopping cart
  clearCart() {
    const user = this.authService.currentUser();
    if (!user) return of(null as unknown as string);

    return this.http.delete<ApiResponse<null>>(`${this.API_URL}/clear`, {
      body: { userId: user.userId },
    }).pipe(
      map(response => response.message),
      tap(() => this.cartSignal.set(null))
    );
  }
}
