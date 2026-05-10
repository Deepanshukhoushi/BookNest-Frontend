import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, catchError, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { OrderService } from '../../../core/services/order.service';
import { WalletService } from '../../../core/services/wallet.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { BookService } from '../../../core/services/book.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Invoice, Order, OrderStatus, WishlistItem, Statement, Book, Address } from '../../../shared/models/models';
import { TopUpModalComponent } from '../components/top-up-modal.component';
import { ProfileModalComponent, ProfileSavePayload } from '../components/profile-modal.component';
import { BookCardComponent } from '../../../shared/ui/book-card.component';
import { OrderTimelineComponent } from '../components/order-timeline.component';
import { ConfirmModalComponent } from '../../../shared/ui/confirm-modal.component';

type DashboardTab = 'identity' | 'acquisitions' | 'wishlist' | 'funds' | 'settings';

/**
 * Component representing the user's personal dashboard.
 * Provides a unified view for managing orders, wishlist, funds, and account settings.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TopUpModalComponent, ProfileModalComponent, OrderTimelineComponent, BookCardComponent, ConfirmModalComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private orderService = inject(OrderService);
  private walletService = inject(WalletService);
  private wishlistService = inject(WishlistService);
  private bookService = inject(BookService);
  private notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  user = this.authService.currentUser;
  loading = signal(true);
  activeTab = signal<DashboardTab>('identity');
  
  orders = signal<Order[]>([]);
  wishlistItems = signal<WishlistItem[]>([]);
  recentTransactions = signal<Statement[]>([]);
  recommendedBooks = signal<Book[]>([]);
  addresses = signal<Address[]>([]);

  // Settings State
  isUpdating = signal(false);
  nameInput = signal('');
  updateMessage = signal<{ text: string, type: 'success' | 'error' | null }>({ text: '', type: null });
  passwordInput = signal('');
  oldPasswordInput = signal('');
  confirmPasswordInput = signal('');
  showTopUpModal = signal(false);
  showProfileModal = signal(false);
  isSavingProfile = signal(false);
  isSavingAddress = signal(false);
  editingAddressId = signal<number | null>(null);
  profileImageError = signal(false);
  addressDraft = signal<Address>({
    customerId: 0,
    fullName: '',
    mobileNumber: '',
    flatNumber: '',
    city: '',
    state: '',
    pincode: ''
  });

  // Confirm Modal State
  showConfirmModal = signal(false);
  confirmModalConfig = signal({
    title: '',
    message: '',
    confirmText: 'Confirm',
    isDestructive: false,
    action: () => {}
  });

  constructor() {
    effect(() => {
      this.user(); // track user signal
      this.profileImageError.set(false);
    });
  }

  userProfile = computed(() => {
    const user = this.user();
    if (!user) {
      return {
        name: 'Member',
        membership: 'Member',
        joinedDate: new Date().toISOString(),
        location: 'Digital Library',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=User'
      };
    }

    return {
      name: user.fullName,
      membership: (user.role || 'USER') + ' Member',
      joinedDate: user.createdAt || 'Recently',
      location: 'Verified Member',
      avatar: this.profileImageError() ? null : this.resolveImageUrl(user.profileImage)
    };
  });
  
  wallet = this.walletService.wallet;
  totalSpent = computed(() => this.orders().reduce((acc, o) => acc + o.amountPaid, 0));

  userInitials = computed(() => {
    const name = this.userProfile().name || 'User';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  });

  // Initializes the dashboard with user data, active orders, and financial summaries
  ngOnInit() {
    const currentUser = this.user();
    if (currentUser) {
      this.nameInput.set(currentUser.fullName);
      this.resetAddressForm();

      this.loading.set(true);
      forkJoin({
        orders: this.orderService.getOrdersByUser(currentUser.userId).pipe(catchError(() => of([]))),
        addresses: this.orderService.getAddressesByCustomer(currentUser.userId).pipe(catchError(() => of([]))),
        wishlist: this.wishlistService.fetchWishlist(currentUser.userId).pipe(catchError(() => of(null))),
        wallet: this.walletService.fetchWalletByUserId(currentUser.userId).pipe(catchError(() => of(null)))
      }).subscribe({
        next: (data: { orders: Order[], addresses: Address[], wishlist: { items: WishlistItem[] } | null, wallet: { walletId: number, userId: number } | null }) => {
          this.orders.set(data.orders);
          this.addresses.set(data.addresses);
          this.wishlistItems.set(data.wishlist?.items || []);
          if (data.wallet) {
            this.fetchTransactions(data.wallet.walletId);
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });

      this.fetchRecommendations();
    } else {
      this.loading.set(false);
    }
  }

  // Fetches the last few wallet transactions to display on the funds tab
  fetchTransactions(walletId: number) {
    this.walletService.getStatements(walletId).subscribe({
      next: (statements) => {
        // Sort by date desc and take last 5
        const sorted = [...statements].sort((a, b) => 
          new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
        );
        this.recentTransactions.set(sorted.slice(0, 5));
      }
    });
  }

  loadAddresses(userId: number) {
    this.orderService.getAddressesByCustomer(userId).subscribe({
      next: (addresses) => {
        const sorted = [...addresses].sort((a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
        );
        this.addresses.set(sorted);
      },
      error: () => {
        this.addresses.set([]);
      }
    });
  }

  // Updates the basic profile information of the user
  onUpdateProfile() {
    const name = this.nameInput().trim();
    if (!name) {
      this.updateMessage.set({ text: 'Name cannot be blank.', type: 'error' });
      return;
    }
    if (name.length < 2) {
      this.updateMessage.set({ text: 'Name must be at least 2 characters.', type: 'error' });
      return;
    }
    if (!/^[a-zA-Z\s]*$/.test(name)) {
      this.updateMessage.set({ text: 'Name should contain characters only.', type: 'error' });
      return;
    }
    this.isUpdating.set(true);
    this.authService.updateProfile({ name }).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.updateMessage.set({ text: 'Profile updated successfully!', type: 'success' });
        setTimeout(() => this.updateMessage.set({ text: '', type: null }), 3000);
      },
      error: (err) => {
        this.isUpdating.set(false);
        this.updateMessage.set({ text: err.error?.message || 'Failed to update profile.', type: 'error' });
      }
    });
  }

  // Changes the account password after validating inputs
  onChangePassword() {
    if (!this.oldPasswordInput().trim() || !this.passwordInput().trim() || !this.confirmPasswordInput().trim()) {
      this.updateMessage.set({ text: 'All password fields are required.', type: 'error' });
      return;
    }

    if (this.passwordInput() !== this.confirmPasswordInput()) {
      this.updateMessage.set({ text: 'New passwords do not match.', type: 'error' });
      return;
    }

    if (this.passwordInput().length < 8) {
      this.updateMessage.set({ text: 'Secret key must be at least 8 characters.', type: 'error' });
      return;
    }

    this.isUpdating.set(true);
    this.authService.changePassword(this.oldPasswordInput(), this.passwordInput()).subscribe({
      next: (msg) => {
        this.isUpdating.set(false);
        this.oldPasswordInput.set('');
        this.passwordInput.set('');
        this.confirmPasswordInput.set('');
        this.updateMessage.set({ text: msg || 'Security vault successfully updated!', type: 'success' });
        setTimeout(() => this.updateMessage.set({ text: '', type: null }), 5000);
      },
      error: (err) => {
        this.isUpdating.set(false);
        const errorMsg = err.error?.message || 'Failed to update security vault.';
        this.updateMessage.set({ text: errorMsg, type: 'error' });
      }
    });
  }

  // Displays the dialog for adding funds to the digital wallet
  openTopUpModal() {
    this.showTopUpModal.set(true);
  }

  // Refreshes the ledger view after a successful top-up transaction
  onTopUpSuccess() {
    this.updateMessage.set({ text: 'Ledger successfully synced with new funds!', type: 'success' });
    setTimeout(() => this.updateMessage.set({ text: '', type: null }), 5000);
    
    // Refresh Wallet and Transactions
    const wallet = this.wallet();
    if (wallet) {
      this.walletService.fetchWalletByUserId(wallet.userId).subscribe({
        next: (w) => this.fetchTransactions(w.walletId)
      });
    }
  }

  // Displays the dialog for editing detailed profile information
  openEditProfile() {
    this.showProfileModal.set(true);
  }

  onImageError() {
    this.profileImageError.set(true);
  }

  // Saves updated profile details and synchronizes with the identity system
  onSaveProfile(payload: ProfileSavePayload) {
    this.isSavingProfile.set(true);

    const finishProfileUpdate = (imageUrl?: string) => {
      // Only include profileImage in the payload when we have a successfully uploaded URL.
      // Never send base64 data URLs to the backend (causes "URL must not exceed 500 chars" error).
      const updatePayload: { name: string; profileImage?: string } = { name: payload.name };
      if (imageUrl) {
        updatePayload.profileImage = imageUrl;
      }

      this.authService.updateProfile(updatePayload).subscribe({
        next: (user) => {
          this.isSavingProfile.set(false);
          this.showProfileModal.set(false);
          this.profileImageError.set(false);   // reset so sidebar re-evaluates the @if

          // Update settings inputs
          this.nameInput.set(user.fullName);

          this.notificationService.success('Member identity successfully synced.');
          this.updateMessage.set({ text: 'Identity successfully synced!', type: 'success' });
          setTimeout(() => this.updateMessage.set({ text: '', type: null }), 5000);
        },
        error: (err) => {
          this.isSavingProfile.set(false);
          const msg = err?.error?.message || 'Failed to sync identity updates.';
          this.notificationService.error(msg);
          this.updateMessage.set({ text: msg, type: 'error' });
        }
      });
    };
    if (payload.imageFile) {
      this.authService.uploadProfileImage(payload.imageFile).subscribe({
        next: (response) => {
          finishProfileUpdate(response.data);
        },
        error: () => {
          // Image upload failed — save profile with name only, no image change
          this.notificationService.warn('Photo upload failed. Saving name change only.');
          finishProfileUpdate();
        }
      });
    } else {
      finishProfileUpdate();
    }
  }

  // Retrieves a curated list of top-rated books to recommend to the user
  fetchRecommendations() {
    this.bookService.getBooks(0, 5, 'rating,desc').subscribe({
      next: (page) => this.recommendedBooks.set(page.content),
      error: () => {}
    });
  }

  // Updates the currently active dashboard view and synchronizes with the URL
  setTab(tab: DashboardTab) {
    this.activeTab.set(tab);
    // Note: Query param sync removed to satisfy 'Back to Profile' navigation requirement
  }

  updateAddressField(field: keyof Address, value: string | number) {
    this.addressDraft.set({
      ...this.addressDraft(),
      [field]: value
    });
  }

  resetAddressForm() {
    const user = this.user();
    this.editingAddressId.set(null);
    this.addressDraft.set({
      customerId: user?.userId || 0,
      fullName: user?.fullName || '',
      mobileNumber: user?.mobile || '',
      flatNumber: '',
      city: '',
      state: '',
      pincode: ''
    });
  }

  editAddress(address: Address) {
    this.editingAddressId.set(address.addressId || null);
    this.addressDraft.set({
      addressId: address.addressId,
      customerId: address.customerId,
      fullName: address.fullName,
      mobileNumber: address.mobileNumber,
      flatNumber: address.flatNumber,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt
    });
    this.setTab('settings');
  }

  submitAddress() {
    const user = this.user();
    const draft = this.addressDraft();
    if (!user) {
      return;
    }

    if (!draft.fullName.trim() || !draft.mobileNumber.trim() || !draft.flatNumber.trim() ||
      !draft.city.trim() || !draft.state.trim() || !draft.pincode.trim()) {
      this.updateMessage.set({ text: 'All address fields are required.', type: 'error' });
      return;
    }

    if (!/^[a-zA-Z\s]*$/.test(draft.fullName.trim())) {
      this.updateMessage.set({ text: 'Name should contain characters only.', type: 'error' });
      return;
    }

    if (!/^[0-9]{10}$/.test(draft.mobileNumber.trim())) {
      this.updateMessage.set({ text: 'Mobile number must be exactly 10 digits.', type: 'error' });
      return;
    }

    if (!/^[0-9]{6}$/.test(draft.pincode.trim())) {
      this.updateMessage.set({ text: 'Pincode must be exactly 6 digits.', type: 'error' });
      return;
    }

    const payload: Address = {
      ...draft,
      customerId: user.userId
    };

    this.isSavingAddress.set(true);
    const isEditing = this.editingAddressId() !== null;
    const request$ = isEditing
      ? this.orderService.updateAddress(this.editingAddressId()!, payload)
      : this.orderService.saveAddress(payload);

    request$.subscribe({
      next: () => {
        this.isSavingAddress.set(false);
        this.resetAddressForm();
        this.loadAddresses(user.userId);
        this.updateMessage.set({
          text: isEditing ? 'Address updated successfully.' : 'Address added successfully.',
          type: 'success'
        });
        setTimeout(() => this.updateMessage.set({ text: '', type: null }), 4000);
      },
      error: (err) => {
        this.isSavingAddress.set(false);
        this.updateMessage.set({ text: err.error?.message || 'Failed to save address.', type: 'error' });
      }
    });
  }

  removeAddress(addressId: number) {
    const user = this.user();
    if (!user) {
      return;
    }

    this.isSavingAddress.set(true);
    this.orderService.deleteAddress(addressId).subscribe({
      next: () => {
        this.isSavingAddress.set(false);
        if (this.editingAddressId() === addressId) {
          this.resetAddressForm();
        }
        this.loadAddresses(user.userId);
        this.notificationService.success('Address deleted successfully.');
      },
      error: (err) => {
        this.isSavingAddress.set(false);
        this.notificationService.error(err.error?.message || 'Failed to delete address.');
      }
    });
  }

  // Removes a specific volume from the user's wishlist
  removeFromWishlist(bookId: number) {
    const user = this.user();
    if (!user) return;

    this.wishlistService.removeFromWishlist(user.userId, bookId).subscribe({
      next: (wishlist) => {
        this.wishlistItems.set(wishlist?.items || []);
        this.notificationService.success('Volume successfully removed from archives.');
      },
      error: () => this.notificationService.error('Failed to update archives.')
    });
  }

  // Handles real-time UI refresh when an item is removed via the BookCardComponent
  onWishlistItemRemoved(bookId: number) {
    this.wishlistItems.set(this.wishlistItems().filter(item => item.bookId !== bookId));
  }

  // Logs the user out and clears all session data
  logout() {
    this.confirmModalConfig.set({
      title: 'Logout Confirmation',
      message: 'Are you sure you want to sign out? You will need to log in again to access your library and dashboard.',
      confirmText: 'Sign Out',
      isDestructive: true,
      action: () => this.authService.logout()
    });
    this.showConfirmModal.set(true);
  }

  onConfirmAction() {
    this.showConfirmModal.set(false);
    this.confirmModalConfig().action();
  }

  resolveImageUrl(path: string | undefined): string | null {
    return this.authService.resolveImageUrl(path);
  }

  canCancel(order: Order): boolean {
    return [OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.PAID].includes(order.orderStatus);
  }

  cancelOrder(orderId: number) {
    this.orderService.cancelOrder(orderId).subscribe({
      next: (updatedOrder) => {
        this.orders.set(this.orders().map(order => order.orderId === updatedOrder.orderId ? updatedOrder : order));
        this.notificationService.success(`Order #${orderId} cancelled successfully.`);
      },
      error: (err) => {
        this.notificationService.error(err.error?.message || 'Unable to cancel this order.');
      }
    });
  }

  viewInvoice(orderId: number) {
    this.orderService.downloadInvoicePdf(orderId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob as Blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `INV-${orderId}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        this.notificationService.success(`Invoice INV-${orderId}.pdf downloaded.`);
      },
      error: () => this.notificationService.error('Failed to generate PDF invoice.')
    });
  }

  trackByOrderId(_: number, item: Order): number {
    return item.orderId;
  }

  trackByItemId(_: number, item: WishlistItem): number {
    return item.itemId;
  }

  trackByStatementId(_: number, item: Statement): number {
    return item.statementId;
  }

  trackByBookId(_: number, item: Book): number {
    return item.bookId;
  }

  trackByAddressId(_: number, item: Address): number {
    return item.addressId || 0;
  }

  trackByValue<T>(_: number, value: T): T {
    return value;
  }
}
