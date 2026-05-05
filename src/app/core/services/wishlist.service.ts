import { environment } from '../../../environments/environment';
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiResponse, Book, Wishlist } from '../../shared/models/models';
import { map, tap } from 'rxjs';

/**
 * Service responsible for managing the user's personal wishlist.
 * Provides methods to add, remove, and transfer items to the cart.
 */
@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.apiBaseUrl + '/wishlist';

  // State
  private wishlistSignal = signal<Wishlist | null>(null);
  wishlist = this.wishlistSignal.asReadonly();

  // Retrieves all items in the wishlist for a given user ID
  fetchWishlist(userId: number) {
    return this.http.get<ApiResponse<Wishlist>>(`${this.API_URL}/${userId}`).pipe(
      map(response => response.data),
      tap(wishlist => this.wishlistSignal.set(wishlist))
    );
  }

  // Adds a specific book to the user's personal wishlist
  addToWishlist(userId: number, bookId: number) {
    return this.http.post<ApiResponse<Wishlist>>(`${this.API_URL}/add`, { userId, bookId }).pipe(
      map(response => response.data),
      tap(wishlist => this.wishlistSignal.set(wishlist))
    );
  }

  // Removes a specific book from the user's wishlist
  removeFromWishlist(userId: number, bookId: number) {
    return this.http.delete<ApiResponse<Wishlist>>(`${this.API_URL}/remove`, {
      body: { userId, bookId }
    }).pipe(
      map(response => response.data),
      tap(wishlist => this.wishlistSignal.set(wishlist))
    );
  }

  // Transfers an item from the wishlist to the shopping cart
  moveToCart(userId: number, bookId: number) {
    return this.http.post(`${this.API_URL}/moveToCart`, { userId, bookId });
  }
}
