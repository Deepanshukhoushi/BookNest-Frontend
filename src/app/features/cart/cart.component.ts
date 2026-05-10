import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { switchMap } from 'rxjs';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { LogoComponent } from '../../shared/ui/logo/logo.component';
import { Cart, CartItem, WishlistItem } from '../../shared/models/models';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css'
})
export class CartComponent implements OnInit {
  private cartService = inject(CartService);
  private wishlistService = inject(WishlistService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  // Cart from service (signal)
  cart = this.cartService.cart;
  
  // Derived signals for the template
  cartItems = computed(() => this.cart()?.items || []);
  wishlistItems = signal<WishlistItem[]>([]);
  
  shipping = computed(() => {
    const sub = this.subtotal();
    if (sub === 0) return 0;
    return sub > 250 ? 0 : 12.00;
  });
  
  subtotal = computed(() => this.cart()?.totalPrice || 0);
  tax = computed(() => this.subtotal() * 0.08);
  total = computed(() => this.subtotal() + this.shipping() + this.tax());

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user) {
      this.wishlistService.fetchWishlist(user.userId).subscribe({
        next: (wishlist) => this.wishlistItems.set(wishlist?.items || []),
        error: () => {} // non-critical; wishlist section hidden when empty
      });
    }
  }

  updateQuantity(itemId: number, quantity: number) {
    const item = this.cartItems().find(i => i.itemId === itemId);
    const max = item?.stockAvailable ?? 99;
    
    if (quantity < 1 || quantity > max) {
      if (quantity > max) {
        this.notificationService.error(`Only ${max} copies available in stock.`);
      }
      return;
    }
    
    this.cartService.updateQuantity(itemId, quantity).subscribe({
      error: () => {} // error handled globally by apiInterceptor
    });
  }

  removeItem(itemId: number) {
    this.cartService.removeFromCart(itemId).subscribe({
      error: () => {} // error handled globally by apiInterceptor
    });
  }

  moveToCart(item: WishlistItem) {
    const user = this.authService.currentUser();
    if (!user) {
      this.router.navigate(['/auth'], { queryParams: { returnUrl: '/cart' } });
      return;
    }

    // Flat switchMap chain — no nested subscribes
    this.cartService.addToCart(item.bookId, 1).pipe(
      switchMap(() => this.wishlistService.removeFromWishlist(user.userId, item.bookId)),
      switchMap(() => this.wishlistService.fetchWishlist(user.userId))
    ).subscribe({
      next: (wishlist) => this.wishlistItems.set(wishlist?.items || []),
      error: () => {} // global interceptor shows toast
    });
  }

  checkout() {
    this.router.navigate(['/checkout']);
  }

  trackByItemId(_: number, item: CartItem): number {
    return item.itemId;
  }

  trackByWishlistId(_: number, item: WishlistItem): number {
    return item.itemId;
  }
}
