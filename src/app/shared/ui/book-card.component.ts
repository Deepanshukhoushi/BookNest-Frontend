import { Component, input, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

/**
 * A reusable UI component that renders a book preview card.
 * Provides interactive actions for adding books to the cart or wishlist directly from lists.
 */
@Component({
  selector: 'app-book-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './book-card.component.html',
  styleUrl: './book-card.component.css'
})
export class BookCardComponent {
  bookId = input.required<number>();
  title = input.required<string>();
  author = input.required<string>();
  price = input.required<number | string>();
  imageUrl = input.required<string>();
  category = input<string>();
  rating = input<number>(0);
  reviewCount = input<number>(0);
  tag = input<string>();
  stock = input<number>(1);
  variant = input<'home' | 'listing'>('home');
  isWishlist = input<boolean>(false);

  removed = output<number>();

  private cartService = inject(CartService);
  private wishlistService = inject(WishlistService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  isAddingToCart = signal(false);
  fallbackImage = '/assets/images/book-fallback.svg';

  isNumber(val: any): boolean {
    return val !== null && val !== undefined && !isNaN(Number(val));
  }

  // Sends a request to the cart service to add the specific book to the shopping cart
  addToCart(event: Event) {
    event.stopPropagation();
    if (this.isAddingToCart()) return;

    this.isAddingToCart.set(true);
    this.cartService.addToCart(this.bookId()).subscribe({
      next: () => {
        this.isAddingToCart.set(false);
        // Notification is now handled globally by ApiInterceptor
      },
      error: () => {
        this.isAddingToCart.set(false);
        this.notificationService.error('Failed to add book to cart.');
      }
    });
  }

  // Persists the book to the user's personal wishlist
  addToWishlist(event: Event) {
    event.stopPropagation();
    const user = this.authService.currentUser();
    if (user) {
      this.wishlistService.addToWishlist(user.userId, this.bookId()).subscribe({
        next: () => {
          // Notification is now handled globally by ApiInterceptor
        },
        error: () => {
          this.notificationService.error('Could not update your wishlist.');
        }
      });
    } else {
      this.notificationService.error('Please log in to save volumes to your wishlist.');
    }
  }

  removeFromWishlist(event: Event) {
    event.stopPropagation();
    const user = this.authService.currentUser();
    if (user) {
      this.wishlistService.removeFromWishlist(user.userId, this.bookId()).subscribe({
        next: () => {
          // Notification is now handled globally by ApiInterceptor
          this.removed.emit(this.bookId());
        },
        error: () => {
          this.notificationService.error('Could not remove item from wishlist.');
        }
      });
    }
  }

  // Validates the book image source and provides a reliable fallback for missing or broken links
  getSafeImageUrl(): string {
    const url = this.imageUrl();
    if (!url) return this.fallbackImage;

    // Detect known broken placeholder domains from dummy data
    const brokenDomains = ['img.com', 'example.com', 'via.placeholder.com'];
    const isBrokenPlaceholder = brokenDomains.some(domain => url.toLowerCase().includes(domain));

    if (isBrokenPlaceholder) {
      return this.fallbackImage;
    }

    if (url.startsWith('http') || url.startsWith('/assets/') || url.startsWith('data:')) {
      return url;
    }

    return this.authService.resolveImageUrl(url) || this.fallbackImage;
  }

  onImageError(event: any) {
    event.target.src = this.fallbackImage;
  }

  getStarFill(starIndex: number): number {
    const rating = this.rating();
    if (rating >= starIndex) return 100;
    if (rating > starIndex - 1) return (rating % 1) * 100;
    return 0;
  }
}
