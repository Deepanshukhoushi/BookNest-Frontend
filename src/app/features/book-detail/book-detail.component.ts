import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { BookService } from '../../core/services/book.service';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { AuthService } from '../../core/services/auth.service';
import { ReviewService } from '../../core/services/review.service';
import { OrderService } from '../../core/services/order.service';
import { Book, Wishlist, WishlistItem, Review, Order } from '../../shared/models/models';

import { ErrorMessageComponent } from '../../shared/ui/error-message/error-message.component';
import { FormsModule } from '@angular/forms';

/**
 * Component responsible for displaying detailed information about a book.
 * Handles book metadata, user reviews, ratings, and wishlist/cart interactions.
 */
@Component({
  selector: 'app-book-detail',
  standalone: true,
  imports: [CommonModule, ErrorMessageComponent, FormsModule, RouterModule],
  templateUrl: './book-detail.component.html',
  styleUrl: './book-detail.component.css'
})
export class BookDetailComponent implements OnInit, OnDestroy {
  private bookService = inject(BookService);
  private cartService = inject(CartService);
  private wishlistService = inject(WishlistService);
  private authService = inject(AuthService);
  private reviewService = inject(ReviewService);
  private orderService = inject(OrderService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private routeParamsSub?: Subscription;

  book = signal<Book | null>(null);
  reviews = signal<Review[]>([]);
  loading = signal(true);
  quantity = signal(1);
  activeInfoTab = signal<'synopsis' | 'details'>('synopsis');
  isFavorited = signal(false);
  hasError = signal(false);
  errorMessage = signal('');

  // Review System State
  userReview = signal<Review | null>(null);
  avgRating = signal(0);
  totalReviews = signal(0);
  hasOrdered = signal(false);
  
  // Refined Form Signals
  reviewRating = signal(0);
  reviewComment = signal('');
  reviewLoading = signal(false);
  reviewError = signal('');
  isEditing = signal(false);
  pendingDeleteConfirm = signal(false);
  addToCartLoading = signal(false); // prevents double-click spam

  isLoggedIn = computed(() => !!this.authService.currentUser());

  // Initializes the component by subscribing to route parameters to get the book ID
  ngOnInit() {
    this.routeParamsSub = this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.currentBookId = Number(id);
        this.loadBookDetails(this.currentBookId);
      }
    });
  }

  ngOnDestroy() {
    this.routeParamsSub?.unsubscribe();
  }

  private currentBookId: number | null = null;

  retryFetch() {
    if (this.currentBookId) this.loadBookDetails(this.currentBookId);
  }

  // Fetches core book information and triggers subsequent data loads
  loadBookDetails(id: number) {
    this.loading.set(true);
    this.hasError.set(false);
    this.bookService.getBookById(id).subscribe({
      next: (book) => {
        this.book.set(book);
        this.loadReviews(id);
        this.checkWishlistStatus(id);
        this.checkPurchaseStatus(id);
      },
      error: () => {
        this.loading.set(false);
        this.hasError.set(true);
        this.errorMessage.set('Unearthed a problem while reaching the archives for this volume.');
      }
    });
  }

  // Retrieves all user reviews for the specific book
  loadReviews(bookId: number) {
    this.reviewService.getByBook(bookId).subscribe({
      next: (reviews) => {
        this.reviews.set(reviews);
        this.calculateStats(reviews);
        this.checkUserReview(bookId);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  // Computes average rating and total review count from the reviews list
  calculateStats(reviews: Review[]) {
    this.totalReviews.set(reviews.length);
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      this.avgRating.set(Number((sum / reviews.length).toFixed(1)));
    } else {
      this.avgRating.set(0);
    }
  }

  checkUserReview(bookId: number) {
    const user = this.authService.currentUser();
    if (user) {
      this.reviewService.getByUser(user.userId).subscribe({
        next: (userReviews) => {
          const found = userReviews.find(r => r.bookId === bookId);
          this.userReview.set(found || null);
          if (found) {
            this.reviewRating.set(found.rating);
            this.reviewComment.set(found.comment);
            if (found.status === 'REJECTED') this.isEditing.set(true);
          }
        }
      });
    }
  }

  setRating(r: number) {
    this.reviewRating.set(r);
    this.reviewError.set('');
  }

  onCommentChange(ev: Event) {
    const val = (ev.target as HTMLTextAreaElement).value;
    this.reviewComment.set(val);
    this.reviewError.set('');
  }

  // Submits a new review or updates an existing one based on the form state
  submitReview() {
    const book = this.book();
    const user = this.authService.currentUser();
    if (!book || !user) return;

    if (this.reviewRating() === 0) {
      this.reviewError.set('Please select a star rating.');
      return;
    }
    const comment = this.reviewComment().trim();
    if (!comment) {
      this.reviewError.set('Please share your thoughts about this book.');
      return;
    }
    if (comment.length < 10) {
      this.reviewError.set('Review must be at least 10 characters.');
      return;
    }
    if (comment.length > 1000) {
      this.reviewError.set('Review cannot exceed 1000 characters.');
      return;
    }

    const payload: Review = {
      bookId: book.bookId,
      userId: user.userId,
      rating: this.reviewRating(),
      comment: comment,
      reviewerName: user.fullName
    };

    this.reviewLoading.set(true);
    this.reviewError.set('');

    const existing = this.userReview();
    const obs$ = (existing && existing.reviewId)
      ? this.reviewService.updateReview(existing.reviewId, payload)
      : this.reviewService.addReview(payload);

    obs$.subscribe({
      next: () => this.handleReviewSuccess(),
      error: (err) => {
        const msg = err.error?.message || 'Only verified purchasers can submit a review.';
        this.reviewLoading.set(false);
        this.reviewError.set(msg);
      }
    });
  }

  handleReviewSuccess() {
    this.reviewLoading.set(false);
    this.isEditing.set(false);
    const id = this.book()?.bookId;
    if (id) {
      this.loadReviews(id);
      // Clear form for fresh state
      this.reviewRating.set(0);
      this.reviewComment.set('');
    }
  }

  // Marks a review as pending deletion — prompts inline confirmation instead of native dialog
  deleteReview() {
    const existing = this.userReview();
    if (existing && existing.reviewId) {
      this.pendingDeleteConfirm.set(true);
    }
  }

  // Confirms and performs the actual review deletion after user accepts inline prompt
  confirmDeleteReview() {
    const existing = this.userReview();
    if (!existing || !existing.reviewId) return;
    this.reviewService.deleteReview(existing.reviewId).subscribe({
      next: () => {
        this.userReview.set(null);
        this.reviewRating.set(0);
        this.reviewComment.set('');
        this.isEditing.set(false);
        this.pendingDeleteConfirm.set(false);
        const id = this.book()?.bookId;
        if (id) this.loadReviews(id);
      }
    });
  }

  // Cancels the pending review deletion
  cancelDeleteReview() {
    this.pendingDeleteConfirm.set(false);
  }

  // Toggles the edit mode for the review form
  toggleEdit() {
    this.isEditing.update(v => !v);
    if (!this.isEditing()) {
       // Reset to original if canceling edit
       const existing = this.userReview();
       if (existing) {
         this.reviewRating.set(existing.rating);
         this.reviewComment.set(existing.comment);
       }
    }
  }

  // Returns the name of the reviewer for display
  getReviewerName(review: Review): string {
    const currentUser = this.authService.currentUser();
    if (currentUser && review.userId === currentUser.userId) {
      return currentUser.fullName + ' (You)';
    }
    return review.reviewerName || 'Verified Member';
  }

  // Verifies if the book is currently present in the user's wishlist
  checkWishlistStatus(bookId: number) {
    const user = this.authService.currentUser();
    if (user) {
      this.wishlistService.fetchWishlist(user.userId).subscribe({
        next: (wishlist: Wishlist) => {
          const exists = wishlist?.items?.some((i: WishlistItem) => i.bookId === bookId) || false;
          this.isFavorited.set(exists);
        },
        error: () => {} // non-critical; wishlist status defaults to false
      });
    }
  }

  // Verifies if the user has successfully purchased and received this book
  checkPurchaseStatus(bookId: number) {
    const user = this.authService.currentUser();
    if (!user) {
      this.hasOrdered.set(false);
      return;
    }

    this.orderService.getOrdersByUser(user.userId).subscribe({
      next: (orders: Order[]) => {
        const purchased = orders?.some(o => 
          Number(o.bookId) === Number(bookId) && 
          o.orderStatus.toString().toUpperCase() === 'DELIVERED'
        ) || false;
        this.hasOrdered.set(purchased);
      },
      error: () => this.hasOrdered.set(false)
    });
  }

  get discount() {
    const b = this.book();
    if (!b?.price) return 0;
    if (b.price >= 2000) return 15;
    if (b.price >= 1000) return 10;
    if (b.price >= 500) return 5;
    return 0;
  }

  // Increases the quantity of books selected for purchase
  incrementQuantity() {
    this.quantity.update(q => q + 1);
  }

  // Decreases the quantity of books selected for purchase
  decrementQuantity() {
    this.quantity.update(q => Math.max(1, q - 1));
  }

  setInfoTab(tab: 'synopsis' | 'details') {
    this.activeInfoTab.set(tab);
  }

  // Adds the selected quantity of the book to the shopping cart
  addToCart() {
    const book = this.book();
    if (!book) return;

    const user = this.authService.currentUser();
    if (!user) {
      this.router.navigate(['/auth'], { queryParams: { returnUrl: `/book/${book.bookId}` } });
      return;
    }

    if (this.addToCartLoading()) return; // prevent double-click
    this.addToCartLoading.set(true);
    this.cartService.addToCart(book.bookId, this.quantity()).subscribe({
      next: () => this.addToCartLoading.set(false),
      error: () => this.addToCartLoading.set(false)
    });
  }

  // Adds or removes the book from the user's wishlist based on current state
  toggleWishlist() {
    const book = this.book();
    const user = this.authService.currentUser();
    if (!book || !user) {
      this.router.navigate(['/auth'], { queryParams: { returnUrl: `/book/${book?.bookId}` } });
      return;
    }

    if (this.isFavorited()) {
      this.wishlistService.removeFromWishlist(user.userId, book.bookId).subscribe({
        next: () => this.isFavorited.set(false),
        error: () => {} // global interceptor handles toast
      });
    } else {
      this.wishlistService.addToWishlist(user.userId, book.bookId).subscribe({
        next: () => this.isFavorited.set(true),
        error: () => {} // global interceptor handles toast
      });
    }
  }

  // Ensures the image URL is valid or provides a high-quality fallback
  getSafeImageUrl(url: string | undefined): string {
    const fallback = '/assets/images/book-fallback.svg';
    if (!url || (!url.startsWith('http') && !url.startsWith('/assets/') && !url.startsWith('data:'))) {
      return fallback;
    }
    return url;
  }

  onImageError(event: Event) {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = '/assets/images/book-fallback.svg';
    }
  }
}
