import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { AuthService } from '../core/services/auth.service';
import { CartService } from '../core/services/cart.service';
import { NotificationService } from '../core/services/notification.service';
import { SearchService } from '../core/services/search.service';
import { provideRouter } from '@angular/router';
import { signal, computed } from '@angular/core';
import { of } from 'rxjs';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let authServiceSpy: any;
  let cartServiceSpy: any;
  let notificationServiceSpy: any;
  let searchServiceSpy: any;

  const mockUser = { userId: 1, fullName: 'John Doe', role: 'USER', email: 'john@test.com' };

  beforeEach(async () => {
    const userSignal = signal(mockUser as any);

    authServiceSpy = {
      currentUser: userSignal,
      isAuthenticated: computed(() => !!userSignal()),
      logout: vi.fn(),
      resolveImageUrl: vi.fn().mockReturnValue(null)
    };
    cartServiceSpy = {
      cartItemsCount: signal(3)
    };
    notificationServiceSpy = {
      notifications: signal([]),
      unreadCount: signal(0),
      markAsRead: vi.fn().mockReturnValue(of({})),
      markAllAsRead: vi.fn().mockReturnValue(of({})),
      deleteAll: vi.fn().mockReturnValue(of({}))
    };
    searchServiceSpy = {
      setSearchTerm: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: CartService, useValue: cartServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: SearchService, useValue: searchServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute user initials from fullName', () => {
    expect(component.userInitials()).toBe('J');
  });

  it('should compute isAdmin as false for USER role', () => {
    expect(component.isAdmin()).toBe(false);
  });

  it('should compute isAdmin as true for ADMIN role', () => {
    authServiceSpy.currentUser.set({ ...mockUser, role: 'ADMIN' });
    expect(component.isAdmin()).toBe(true);
  });

  it('should toggle notification panel', () => {
    expect(component.showNotifications()).toBe(false);
    component.toggleNotifications();
    expect(component.showNotifications()).toBe(true);
    component.toggleNotifications();
    expect(component.showNotifications()).toBe(false);
  });

  it('should close mobile menu when opening notifications', () => {
    component.showMobileMenu.set(true);
    component.toggleNotifications();
    expect(component.showMobileMenu()).toBe(false);
  });

  it('should toggle mobile menu', () => {
    expect(component.showMobileMenu()).toBe(false);
    component.toggleMobileMenu();
    expect(component.showMobileMenu()).toBe(true);
  });

  it('should close notifications when opening mobile menu', () => {
    component.showNotifications.set(true);
    component.toggleMobileMenu();
    expect(component.showNotifications()).toBe(false);
  });

  it('should mark a single notification as read', () => {
    const event = new MouseEvent('click');
    vi.spyOn(event, 'stopPropagation');
    component.markAsRead(42, event);
    expect(notificationServiceSpy.markAsRead).toHaveBeenCalledWith(42);
  });

  it('should mark all notifications as read', () => {
    component.markAllAsRead();
    expect(notificationServiceSpy.markAllAsRead).toHaveBeenCalled();
  });

  it('should open confirm modal for logout', () => {
    component.logout();
    expect(component.showConfirmModal()).toBe(true);
    expect(component.confirmModalConfig().title).toBe('Logout Confirmation');
    expect(component.confirmModalConfig().isDestructive).toBe(true);
  });

  it('should call authService.logout() on confirm', () => {
    component.logout();
    component.onConfirmAction();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });

  it('should open confirm modal for clearing notifications', () => {
    component.clearAllNotifications();
    expect(component.showConfirmModal()).toBe(true);
    expect(component.confirmModalConfig().title).toBe('Clear Notifications');
  });

  it('should return correct icon for notification types', () => {
    expect(component.getIconForType('ORDER')).toBe('shopping_bag');
    expect(component.getIconForType('PAYMENT')).toBe('payments');
    expect(component.getIconForType('DELIVERY')).toBe('local_shipping');
    expect(component.getIconForType('OTHER')).toBe('notifications');
  });

  it('should hide notification panel on outside click', () => {
    component.showNotifications.set(true);
    const outsideElement = document.createElement('div');
    document.body.appendChild(outsideElement);
    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: outsideElement });
    component.onDocumentClick(event);
    expect(component.showNotifications()).toBe(false);
    document.body.removeChild(outsideElement);
  });

  it('should update isScrolled on window scroll', () => {
    Object.defineProperty(window, 'scrollY', { value: 50, writable: true });
    component.onScroll();
    expect(component.isScrolled()).toBe(true);
  });
});
