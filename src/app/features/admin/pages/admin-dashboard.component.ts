import { Component, ChangeDetectionStrategy, computed, inject, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, catchError, of } from 'rxjs';
import { LogoComponent } from '../../../shared/ui/logo/logo.component';
import { AuthService } from '../../../core/services/auth.service';
import { BookService } from '../../../core/services/book.service';
import { CouponService } from '../../../core/services/coupon.service';
import { OrderService } from '../../../core/services/order.service';
import { ReviewService } from '../../../core/services/review.service';
import { Book, Coupon, CouponRequestPayload, Order, OrderStatus, Review, ReviewStatus, User } from '../../../shared/models/models';
import { ConfirmModalComponent } from '../../../shared/ui/confirm-modal.component';
import { environment } from '../../../../environments/environment';

/**
 * Component for the administrative dashboard.
 * Provides a high-level overview of system metrics and tools for managing the book inventory and orders.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, LogoComponent, RouterModule, ReactiveFormsModule, ConfirmModalComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  private bookService = inject(BookService);
  private orderService = inject(OrderService);
  private reviewService = inject(ReviewService);
  private readonly couponService = inject(CouponService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  bookForm: FormGroup = this.fb.group({
    title: ['', Validators.required],
    author: ['', Validators.required],
    isbn: ['', Validators.required],
    genre: [''],
    publisher: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    description: [''],
    coverImageUrl: ['']
  });

  couponForm: FormGroup = this.fb.group({
    code: ['', Validators.required],
    discountType: ['PERCENTAGE', Validators.required],
    discountValue: [0, [Validators.required, Validators.min(0.01)]],
    minOrderAmount: [0, [Validators.required, Validators.min(0)]],
    maxUsage: [null],
    expiryDate: ['']
  });

  showBookModal = signal(false);
  showCouponModal = signal(false);
  editingBookId = signal<number | null>(null);

  // Confirm Modal State
  showConfirmModal = signal(false);
  confirmModalConfig = signal({
    title: '',
    message: '',
    confirmText: 'Confirm',
    isDestructive: false,
    action: () => {}
  });

  // --- Core Data Signals ---
  /** Full inventory of books currently in the library */
  inventory = signal<Book[]>([]);
  /** Every order processed by the system, used for metrics and management */
  allOrders = signal<Order[]>([]);
  /** List of registered user accounts */
  allUsers = signal<User[]>([]);
  /** All user-submitted book reviews */
  allReviews = signal<Review[]>([]);
  /** All configured coupon codes */
  allCoupons = signal<Coupon[]>([]);

  // --- UI & Moderation State ---
  /** Currently active tab in the review moderation panel */
  reviewModerationTab = signal<ReviewStatus>('PENDING');
  /** Currently active dashboard section (e.g., 'overview', 'inventory', 'orders', 'users', 'moderation') */
  activeView = signal<string>('overview');
  /** Real-time counts of reviews in each moderation state */
  reviewStatusCounts = signal<Record<ReviewStatus, number>>({ PENDING: 0, APPROVED: 0, REJECTED: 0 });

  /** Global loading state for initial data fetch */
  loading = signal(true);
  /** Loading state for specific background actions (e.g., updating a status) */
  actionLoading = signal(false);
  /** Feedback message displayed on successful operations */
  actionMessage = signal('');
  /** Error message displayed when an operation fails */
  actionError = signal('');
  /** Flag to track if the admin's own profile image fails to load */
  adminProfileImageError = signal(false);
  couponSubmitting = signal(false);

  /** Active order fulfillment filter (e.g., 'SHIPPED', 'DELIVERED') */
  filterStatus = signal<string>('ALL');
  selectedGenre = signal<string | null>(null);
  /** Search term for the book inventory table */
  searchTerm = signal('');
  /** Search term for the recent acquisitions panel */
  orderSearchTerm = signal('');
  /** Valid fulfillment statuses supported by the system */
  readonly availableFilters = ['ALL', 'PLACED', 'CONFIRMED', 'PAID', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

  // Pagination for inventory
  booksToShow = signal(15);

  filteredReviews = computed(() => {
    const tab = this.reviewModerationTab();
    return this.allReviews().filter(r => r.status === tab);
  });

  filteredInventory = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const activeGenre = this.selectedGenre();
    
    // Create a shallow copy to avoid mutating the original signal array
    let base = [...this.inventory()];
    
    // Apply Genre Filter first if active
    if (activeGenre) {
      base = base.filter(item => 
        item.genre?.toLowerCase().includes(activeGenre.toLowerCase())
      );
    }
    
    // Apply Search Query if active
    if (query) {
      base = base.filter(item => {
        const title = item.title?.toLowerCase() ?? '';
        const author = item.author?.toLowerCase() ?? '';
        const genre = item.genre?.toLowerCase() ?? '';
        return title.includes(query) || author.includes(query) || genre.includes(query);
      });
    }

    // Sort to place trending (featured) books at the top
    base.sort((a, b) => {
      if (a.isFeatured === b.isFeatured) return 0;
      return a.isFeatured ? -1 : 1;
    });

    return base.slice(0, this.booksToShow());
  });

  hasMoreBooks = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const base = !query 
      ? this.inventory()
      : this.inventory().filter(item => {
          const title = item.title?.toLowerCase() ?? '';
          const author = item.author?.toLowerCase() ?? '';
          const genre = item.genre?.toLowerCase() ?? '';
          return title.includes(query) || author.includes(query) || genre.includes(query);
        });
    return this.booksToShow() < base.length;
  });

  metrics = computed(() => {
    const orders = this.allOrders();
    const users = this.allUsers();
    const reviews = this.allReviews();

    const totalVolumes = orders.reduce((sum, order) => sum + (order.quantity || 0), 0);
    const revenue = orders.reduce((sum, order) => sum + (order.amountPaid || 0), 0);

    return [
      { label: 'Total Volumes Sold', value: totalVolumes.toLocaleString(), trend: '+ Live', icon: 'book', color: 'primary' },
      { label: 'Active Users', value: users.filter(user => !user.suspended).length.toLocaleString(), trend: 'Connected', icon: 'group', color: 'tertiary' },
      { label: 'Total Revenue', value: `INR ${revenue.toLocaleString()}`, trend: 'Lifetime', icon: 'payments', color: 'secondary' },
      { label: 'Published Reviews', value: reviews.length.toLocaleString(), trend: 'Moderation', icon: 'rate_review', color: 'primary' }
    ];
  });

  topSellingBooks = computed(() => {
    const totals = new Map<number, { title: string; quantity: number; revenue: number }>();
    for (const order of this.allOrders()) {
      const current = totals.get(order.bookId) || {
        title: order.bookName,
        quantity: 0,
        revenue: 0
      };
      current.quantity += order.quantity || 0;
      current.revenue += order.amountPaid || 0;
      totals.set(order.bookId, current);
    }

    return [...totals.entries()]
      .map(([bookId, summary]) => ({ bookId, ...summary }))
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
      .slice(0, 5);
  });

  categoryBreakdown = computed(() => {
    const counts = new Map<string, number>();
    for (const book of this.inventory()) {
      const genre = book.genre || 'Uncategorized';
      counts.set(genre, (counts.get(genre) || 0) + 1);
    }

    return [...counts.entries()]
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  });

  adminAlerts = computed(() => {
    const lowStock = this.inventory().filter(book => book.stock <= 5);
    const newOrders = this.allOrders()
      .filter(order => [
        OrderStatus.PLACED, 
        OrderStatus.CONFIRMED, 
        OrderStatus.PAID, 
        OrderStatus.SHIPPED, 
        OrderStatus.OUT_FOR_DELIVERY
      ].includes(order.orderStatus))
      .sort((a, b) => b.orderId - a.orderId) // Show newest first
      .slice(0, 10);

    return {
      lowStock,
      newOrders
    };
  });

  displayedOrders = computed(() => {
    const orders = this.allOrders();
    const users = this.allUsers();
    const filter = this.filterStatus();
    const query = this.orderSearchTerm().trim().toLowerCase();

    // Create a map for quick user lookup
    const userMap = new Map(users.map(u => [u.userId, u]));

    let filtered = orders.map(order => ({
      ...order,
      customerEmail: userMap.get(order.userId)?.email || 'N/A'
    }));

    if (filter !== 'ALL') {
      filtered = filtered.filter(order => {
        return order.orderStatus === (filter as OrderStatus);
      });
    }

    if (query) {
      filtered = filtered.filter(order =>
        String(order.orderId).includes(query) ||
        order.bookName?.toLowerCase().includes(query) ||
        order.customerEmail?.toLowerCase().includes(query)
      );
    }

    return filtered.slice(0, 50);
  });

  userProfile = computed(() => {
    const user = this.authService.currentUser();
    const avatarPath = user?.profileImage;
    const defaultAvatar = environment.defaultAvatar;
    
    return {
      name: user?.fullName || 'Admin Curator',
      avatar: (avatarPath && !this.adminProfileImageError()) 
        ? this.authService.resolveImageUrl(avatarPath) 
        : defaultAvatar
    };
  });

  onAdminImageError() {
    this.adminProfileImageError.set(true);
  }

  constructor() {
    effect(() => {
      this.authService.currentUser();
      this.adminProfileImageError.set(false);
    });
  }

  ngOnInit() {
    this.refreshDashboardData();
  }

  /**
   * Orchestrates a full synchronization of the dashboard data.
   * Fetches books, orders, users, and reviews in parallel using forkJoin.
   */
  refreshDashboardData() {
    this.loading.set(true);
    forkJoin({
      books: this.bookService.getBooks(0, 1000).pipe(catchError(() => of({ content: [] }))),
      orders: this.orderService.getAllOrders().pipe(catchError(() => of([]))),
      users: this.authService.getAllUsers().pipe(catchError(() => of([]))),
      reviews: this.reviewService.getAllReviews().pipe(catchError(() => of([]))),
      reviewCounts: this.reviewService.getStatusCounts().pipe(catchError(() => of({ PENDING: 0, APPROVED: 0, REJECTED: 0 }))),
      coupons: this.couponService.getAllCoupons().pipe(catchError(() => of([])))
    }).subscribe({
      next: (data: any) => {
        this.inventory.set(data.books.content);
        this.allOrders.set(data.orders);
        const sortedUsers = [...data.users].sort((a, b) => {
          if (a.role === 'ADMIN' && b.role !== 'ADMIN') return -1;
          if (a.role !== 'ADMIN' && b.role === 'ADMIN') return 1;
          return 0;
        });
        this.allUsers.set(sortedUsers);
        this.allReviews.set(data.reviews);
        this.reviewStatusCounts.set(data.reviewCounts);
        this.allCoupons.set(data.coupons);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.actionError.set('Failed to synchronize dashboard archives completely.');
      }
    });
  }

  loadMoreBooks() {
    this.booksToShow.update(v => v + 15);
  }

  setReviewTab(tab: ReviewStatus) {
    this.reviewModerationTab.set(tab);
  }

  setFilter(status: string) {
    this.filterStatus.set(status);
  }

  setGenreFilter(genre: string) {
    this.selectedGenre.set(genre);
    this.booksToShow.set(15); // Reset pagination view when filter changes
  }

  clearGenreFilter() {
    this.selectedGenre.set(null);
  }

  onSearchChange(event: Event) {
    this.searchTerm.set((event.target as HTMLInputElement).value ?? '');
    this.booksToShow.set(15); // Reset limit on search
  }

  onOrderSearchChange(event: Event) {
    this.orderSearchTerm.set((event.target as HTMLInputElement).value ?? '');
  }

  clearSearch() {
    this.searchTerm.set('');
    this.booksToShow.set(15);
  }

  clearOrderSearch() {
    this.orderSearchTerm.set('');
  }

  /**
   * Updates the fulfillment status of a specific order.
   * This method uses an optimistic update strategy, modifying the local signal 
   * immediately after receiving confirmation from the backend.
   */
  /**
   * Copies a formatted dispatch note to the admin's clipboard.
   * Useful for shipping labels or customer support coordination.
   */
  copyDispatchInfo(order: Order & { customerEmail?: string }) {
    const addr = order.address;
    const dispatchNote = `
--- BOOKNEST DISPATCH SUMMARY ---
Order ID: #BN-${order.orderId}
Status: ${order.orderStatus}

ITEM DETAILS:
Title: ${order.bookName}
Quantity: ${order.quantity}
Amount: INR ${order.amountPaid}

CUSTOMER CONTACT:
Name: ${addr?.fullName || 'N/A'}
Email: ${order.customerEmail || 'N/A'}
Phone: ${addr?.mobileNumber || 'N/A'}

SHIPPING ADDRESS:
${addr?.flatNumber || 'N/A'}, ${addr?.city || 'N/A'}
${addr?.state || 'N/A'}, ${addr?.pincode || 'N/A'}
----------------------------------
    `.trim();

    const handleSuccess = () => {
      this.actionMessage.set(`Dispatch info for #BN-${order.orderId} copied!`);
      setTimeout(() => this.actionMessage.set(''), 3000);
    };

    const handleError = (err: any) => {
      console.error('Clipboard copy failed:', err);
      this.actionError.set('Clipboard access failed. Please copy manually.');
      setTimeout(() => this.actionError.set(''), 3000);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(dispatchNote).then(handleSuccess).catch(handleError);
    } else {
      // Fallback for non-secure contexts or older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = dispatchNote;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) handleSuccess();
        else handleError('execCommand failed');
      } catch (err) {
        handleError(err);
      }
    }
  }

  updateStatus(orderId: number, status: string) {
    this.actionLoading.set(true);
    this.orderService.updateOrderStatus(orderId, status).subscribe({
      next: (updatedOrder) => {
        // Optimistically update the local signal with the confirmed data from backend
        this.allOrders.update(orders => 
          orders.map(o => o.orderId === orderId ? { ...o, orderStatus: updatedOrder.orderStatus } : o)
        );
        this.actionLoading.set(false);
        this.actionMessage.set(`Order #${orderId} updated to ${updatedOrder.orderStatus}`);
        setTimeout(() => this.actionMessage.set(''), 3000);
      },
      error: () => {
        this.actionLoading.set(false);
        this.actionError.set('Failed to update status.');
        setTimeout(() => this.actionError.set(''), 3000);
      }
    });
  }

  updateUserRole(userId: number, role: string) {
    this.actionLoading.set(true);
    this.authService.updateUserRole(userId, role).subscribe({
      next: (updatedUser) => {
        this.allUsers.set(this.allUsers().map(user => user.userId === updatedUser.userId ? updatedUser : user));
        this.actionLoading.set(false);
        this.actionMessage.set(`Role updated for ${updatedUser.fullName}.`);
        setTimeout(() => this.actionMessage.set(''), 3000);
      },
      error: () => {
        this.actionLoading.set(false);
        this.actionError.set('Failed to update user role.');
        setTimeout(() => this.actionError.set(''), 3000);
      }
    });
  }

  toggleSuspension(user: User) {
    this.actionLoading.set(true);
    const request$ = user.suspended
      ? this.authService.reactivateUser(user.userId)
      : this.authService.suspendUser(user.userId);

    request$.subscribe({
      next: (updatedUser) => {
        this.allUsers.set(this.allUsers().map(entry => entry.userId === updatedUser.userId ? updatedUser : entry));
        this.actionLoading.set(false);
        this.actionMessage.set(
          updatedUser.suspended ? `${updatedUser.fullName} suspended.` : `${updatedUser.fullName} reactivated.`
        );
        setTimeout(() => this.actionMessage.set(''), 3000);
      },
      error: () => {
        this.actionLoading.set(false);
        this.actionError.set('Failed to update user access.');
        setTimeout(() => this.actionError.set(''), 3000);
      }
    });
  }

  deleteUser(user: User) {
    this.confirmModalConfig.set({
      title: 'Delete User Account',
      message: `Are you sure you want to delete ${user.fullName}? This action is irreversible and will remove all their associated data from the archives.`,
      confirmText: 'Delete Account',
      isDestructive: true,
      action: () => {
        this.actionLoading.set(true);
        this.authService.deleteUser(user.userId).subscribe({
          next: () => {
            this.allUsers.set(this.allUsers().filter(entry => entry.userId !== user.userId));
            this.actionLoading.set(false);
            this.actionMessage.set(`${user.fullName} deleted successfully.`);
            setTimeout(() => this.actionMessage.set(''), 3000);
          },
          error: () => {
            this.actionLoading.set(false);
            this.actionError.set('Failed to delete user.');
            setTimeout(() => this.actionError.set(''), 3000);
          }
        });
      }
    });
    this.showConfirmModal.set(true);
  }

  removeReview(reviewId: number) {
    this.actionLoading.set(true);
    this.reviewService.deleteReview(reviewId).subscribe({
      next: () => {
        this.allReviews.set(this.allReviews().filter(review => review.reviewId !== reviewId));
        this.refreshStatusCounts();
        this.actionLoading.set(false);
        this.actionMessage.set(`Review #${reviewId} removed.`);
        setTimeout(() => this.actionMessage.set(''), 3000);
      },
      error: () => {
        this.actionLoading.set(false);
        this.actionError.set('Failed to moderate review.');
        setTimeout(() => this.actionError.set(''), 3000);
      }
    });
  }

  approveReview(reviewId: number) {
    this.actionLoading.set(true);
    this.reviewService.approveReview(reviewId).subscribe({
      next: (updated) => {
        this.allReviews.set(this.allReviews().map(r => r.reviewId === reviewId ? updated : r));
        this.refreshStatusCounts();
        this.actionLoading.set(false);
        this.actionMessage.set(`Review #${reviewId} approved and published.`);
        setTimeout(() => this.actionMessage.set(''), 3000);
      },
      error: () => {
        this.actionLoading.set(false);
        this.actionError.set('Failed to approve review.');
        setTimeout(() => this.actionError.set(''), 3000);
      }
    });
  }

  rejectReview(reviewId: number) {
    this.actionLoading.set(true);
    this.reviewService.rejectReview(reviewId).subscribe({
      next: (updated) => {
        this.allReviews.set(this.allReviews().map(r => r.reviewId === reviewId ? updated : r));
        this.refreshStatusCounts();
        this.actionLoading.set(false);
        this.actionMessage.set(`Review #${reviewId} rejected.`);
        setTimeout(() => this.actionMessage.set(''), 3000);
      },
      error: () => {
        this.actionLoading.set(false);
        this.actionError.set('Failed to reject review.');
        setTimeout(() => this.actionError.set(''), 3000);
      }
    });
  }

  private refreshStatusCounts() {
    this.reviewService.getStatusCounts().subscribe({
      next: (counts) => this.reviewStatusCounts.set(counts),
      error: () => {}
    });
  }

  getFilterLabel(filter: string): string {
    if (filter === 'ALL') return 'All';
    if (filter === 'PLACED') return 'Placed';
    if (filter === 'CONFIRMED') return 'Confirmed';
    if (filter === 'PAID') return 'Paid';
    return filter.replaceAll('_', ' ');
  }

  openAddBookModal() {
    this.editingBookId.set(null);
    this.bookForm.reset({ price: 0, stock: 0 });
    this.showBookModal.set(true);
  }

  openEditBookModal(book: Book) {
    this.editingBookId.set(book.bookId);
    this.bookForm.patchValue({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      genre: book.genre,
      publisher: book.publisher,
      price: book.price,
      stock: book.stock,
      description: book.description,
      coverImageUrl: book.coverImageUrl
    });
    this.showBookModal.set(true);
  }

  closeBookModal() {
    this.showBookModal.set(false);
    this.bookForm.reset();
  }

  submitBookForm() {
    if (this.bookForm.invalid) {
      this.actionError.set('Please fill out all required fields correctly.');
      setTimeout(() => this.actionError.set(''), 3000);
      return;
    }

    this.actionLoading.set(true);
    const formData = this.bookForm.value;
    const bookId = this.editingBookId();

    if (bookId) {
      // Edit
      const existingBook = this.inventory().find(b => b.bookId === bookId);
      const updatedBook = { ...existingBook, ...formData };
      
      this.bookService.updateBook(bookId, updatedBook).subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.actionMessage.set('Volume details updated successfully.');
          this.closeBookModal();
          this.refreshDashboardData();
        },
        error: () => {
          this.actionLoading.set(false);
          this.actionError.set('Failed to update volume.');
        }
      });
    } else {
      // Create
      this.bookService.addBook(formData).subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.actionMessage.set('New volume added successfully.');
          this.closeBookModal();
          this.refreshDashboardData();
        },
        error: () => {
          this.actionLoading.set(false);
          this.actionError.set('Failed to add volume.');
        }
      });
    }
  }

  toggleTrending(book: Book) {
    this.actionLoading.set(true);
    const updated = { ...book, isFeatured: !book.isFeatured };
    this.bookService.updateBook(book.bookId, updated).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.actionMessage.set(`${book.title} is now ${updated.isFeatured ? 'Trending' : 'removed from Trending'}.`);
        this.refreshDashboardData();
        setTimeout(() => this.actionMessage.set(''), 3000);
      },
      error: () => {
        this.actionLoading.set(false);
        this.actionError.set('Failed to update trending status.');
        setTimeout(() => this.actionError.set(''), 3000);
      }
    });
  }

  deleteBook(id: number) {
    const book = this.inventory().find(b => b.bookId === id);
    this.confirmModalConfig.set({
      title: 'Remove Volume',
      message: `Are you sure you want to remove "${book?.title}" from the archives? This will permanently delete the edition and all associated metadata.`,
      confirmText: 'Remove Volume',
      isDestructive: true,
      action: () => {
        this.actionLoading.set(true);
        this.bookService.deleteBook(id).subscribe({
          next: () => {
            this.actionLoading.set(false);
            this.actionMessage.set('Volume removed from archives.');
            this.refreshDashboardData();
            setTimeout(() => this.actionMessage.set(''), 3000);
          },
          error: () => {
            this.actionLoading.set(false);
            this.actionError.set('Failed to remove volume.');
            setTimeout(() => this.actionError.set(''), 3000);
          }
        });
      }
    });
    this.showConfirmModal.set(true);
  }

  getSafeImageUrl(url: string | undefined): string {
    const fallback = '/assets/images/book-fallback.svg';
    if (!url) return fallback;
    
    if (url.startsWith('http') || url.startsWith('/assets/') || url.startsWith('data:')) {
      return url;
    }
    
    return this.authService.resolveImageUrl(url) || fallback;
  }

  onImageError(event: Event) {
    (event.target as HTMLImageElement).src = '/assets/images/book-fallback.svg';
  }

  setView(view: string) {
    this.activeView.set(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openCouponModal() {
    this.couponForm.reset({
      code: '',
      discountType: 'PERCENTAGE',
      discountValue: 0,
      minOrderAmount: 0,
      maxUsage: null,
      expiryDate: ''
    });
    this.showCouponModal.set(true);
  }

  closeCouponModal() {
    this.showCouponModal.set(false);
  }

  createCoupon() {
    if (this.couponForm.invalid) {
      this.actionError.set('Please complete the coupon form correctly.');
      return;
    }

    const value = this.couponForm.getRawValue();
    const payload: CouponRequestPayload = {
      code: String(value.code ?? '').trim().toUpperCase(),
      discountType: value.discountType,
      discountValue: Number(value.discountValue),
      minOrderAmount: Number(value.minOrderAmount ?? 0),
      maxUsage: value.maxUsage === null || value.maxUsage === '' ? null : Number(value.maxUsage),
      expiryDate: value.expiryDate || null
    };

    this.couponSubmitting.set(true);
    this.couponService.createCoupon(payload).subscribe({
      next: (coupon) => {
        this.allCoupons.update(coupons => [coupon, ...coupons]);
        this.couponSubmitting.set(false);
        this.showCouponModal.set(false);
        this.actionMessage.set(`Coupon ${coupon.code} created successfully.`);
      },
      error: (err) => {
        this.couponSubmitting.set(false);
        this.actionError.set(err.error?.message || 'Failed to create coupon.');
      }
    });
  }

  deleteCoupon(id: number) {
    this.couponService.deleteCoupon(id).subscribe({
      next: () => {
        this.allCoupons.update(coupons => coupons.filter(coupon => coupon.couponId !== id));
        this.actionMessage.set('Coupon deleted successfully.');
      },
      error: (err) => {
        this.actionError.set(err.error?.message || 'Failed to delete coupon.');
      }
    });
  }

  toggleCoupon(id: number) {
    this.couponService.toggleCoupon(id).subscribe({
      next: (updatedCoupon) => {
        this.allCoupons.update(coupons => coupons.map(coupon => coupon.couponId === id ? updatedCoupon : coupon));
        this.actionMessage.set(`Coupon ${updatedCoupon.code} updated.`);
      },
      error: (err) => {
        this.actionError.set(err.error?.message || 'Failed to update coupon.');
      }
    });
  }


  onConfirmAction() {
    this.showConfirmModal.set(false);
    this.confirmModalConfig().action();
  }

  logout() {
    this.confirmModalConfig.set({
      title: 'Exit Curator Vault',
      message: 'Are you sure you want to terminate your administrative session?',
      confirmText: 'Exit Vault',
      isDestructive: true,
      action: () => {
        this.authService.logout();
        this.router.navigate(['/auth']);
      }
    });
    this.showConfirmModal.set(true);
  }
}
