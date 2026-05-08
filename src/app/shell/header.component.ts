import { Component, inject, computed, ElementRef, HostListener, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { CartService } from '../core/services/cart.service';
import { NotificationService } from '../core/services/notification.service';
import { LogoComponent } from '../shared/ui/logo/logo.component';
import { SearchService } from '../core/services/search.service';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ConfirmModalComponent } from '../shared/ui/confirm-modal.component';

/**
 * Component for the application's global header.
 * Manages main navigation, global search, and real-time user notifications.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, LogoComponent, FormsModule, ConfirmModalComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  private authService = inject(AuthService);
  private cartService = inject(CartService);
  private notificationService = inject(NotificationService);
  private searchService = inject(SearchService);
  private router = inject(Router);
  private elRef = inject(ElementRef);

  user = this.authService.currentUser;
  isAuthenticated = this.authService.isAuthenticated;
  cartCount = this.cartService.cartItemsCount;
  
  // Notification States
  notifications = this.notificationService.notifications;
  unreadCount = this.notificationService.unreadCount;
  showNotifications = signal(false);
  showMobileMenu = signal(false);
  isScrolled = signal(false);

  avatarUrl = computed(() => {
    const user = this.user();
    if (!user || this.headerImageError()) return null;
    return this.authService.resolveImageUrl(user.profileImage);
  });

  userInitials = computed(() => {
    const name = this.user()?.fullName;
    if (!name) return 'U';
    return name.split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  });

  isAdmin = computed(() => this.user()?.role === 'ADMIN');
  searchTerm = '';
  private searchSubject = new Subject<string>();

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
      this.headerImageError.set(false);
    });

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchService.setSearchTerm(term);
      const currentUrl = this.router.url.split('?')[0];
      if (currentUrl !== '/books') {
        this.router.navigate(['/books']);
      }
    });
  }

  // Toggles the visibility of the user's notification list
  toggleNotifications() {
    this.showNotifications.update(v => !v);
    if (this.showMobileMenu()) this.showMobileMenu.set(false);
  }

  // Closes the notification dropdown when clicking outside of it
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.showNotifications.set(false);
      this.showMobileMenu.set(false);
    }
  }

  @HostListener('window:scroll')
  onScroll() {
    this.isScrolled.set(window.scrollY > 10);
  }

  // Toggles the side menu on mobile devices
  toggleMobileMenu() {
    this.showMobileMenu.update(v => !v);
    if (this.showNotifications()) this.showNotifications.set(false);
  }

  // Updates a single notification's status to 'read'
  markAsRead(id: number, event: Event) {
    event.stopPropagation();
    this.notificationService.markAsRead(id).subscribe();
  }

  // Updates all unread notifications to 'read'
  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe();
  }

  // Permanently clears all notifications for the user
  clearAllNotifications() {
    this.confirmModalConfig.set({
      title: 'Clear Notifications',
      message: 'Are you sure you want to permanently clear all your notifications? This action cannot be undone.',
      confirmText: 'Clear All',
      isDestructive: true,
      action: () => this.notificationService.deleteAll().subscribe()
    });
    this.showConfirmModal.set(true);
  }

  onConfirmAction() {
    this.showConfirmModal.set(false);
    this.confirmModalConfig().action();
  }

  // Determines the appropriate icon for a notification based on its category
  getIconForType(type: string): string {
    switch(type) {
      case 'ORDER': return 'shopping_bag';
      case 'PAYMENT': return 'payments';
      case 'DELIVERY': return 'local_shipping';
      default: return 'notifications';
    }
  }

  // Captures input for debounce
  onSearchInput() {
    this.searchSubject.next(this.searchTerm);
  }

  // Triggers immediate search on form submit
  onSearch() {
    this.searchSubject.next(this.searchTerm);
  }

  // Resets the search term and clears active results
  clearSearch() {
    this.searchTerm = '';
    this.onSearchInput();
  }

  headerImageError = signal(false);

  // Clears the user session and performs a secure logout
  logout() {
    this.confirmModalConfig.set({
      title: 'Logout Confirmation',
      message: 'Are you sure you want to log out? Any unsaved changes may be lost.',
      confirmText: 'Log Out',
      isDestructive: true,
      action: () => this.authService.logout()
    });
    this.showConfirmModal.set(true);
  }

  resolveImageUrl(path: string | undefined): string | null {
    return this.authService.resolveImageUrl(path);
  }

  onImageError() {
    this.headerImageError.set(true);
  }
}
