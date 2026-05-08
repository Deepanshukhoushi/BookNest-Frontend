import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastContainerComponent } from './toast-container.component';
import { NotificationService } from '../../../core/services/notification.service';
import { signal } from '@angular/core';

describe('ToastContainerComponent', () => {
  let component: ToastContainerComponent;
  let fixture: ComponentFixture<ToastContainerComponent>;
  let notificationServiceSpy: any;

  beforeEach(async () => {
    notificationServiceSpy = {
      toasts: signal([]),
      removeToast: vi.fn(),
      clearAllToasts: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ToastContainerComponent],
      providers: [
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ToastContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show clear all button if multiple toasts', () => {
    notificationServiceSpy.toasts.set([
      { id: '1', message: 'M1', type: 'success' },
      { id: '2', message: 'M2', type: 'error' }
    ]);
    fixture.detectChanges();
    const clearBtn = fixture.nativeElement.querySelector('.clear-all-btn');
    expect(clearBtn).toBeTruthy();
  });

  it('should call removeToast on remove', () => {
    component.remove('id1');
    expect(notificationServiceSpy.removeToast).toHaveBeenCalledWith('id1');
  });

  it('should call clearAllToasts on clearAll', () => {
    component.clearAll();
    expect(notificationServiceSpy.clearAllToasts).toHaveBeenCalled();
  });

  it('should render correct icon for toast type', () => {
    notificationServiceSpy.toasts.set([{ id: '1', message: 'Success', type: 'success' }]);
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('.toast-icon span').textContent;
    expect(icon).toBe('check_circle');

    notificationServiceSpy.toasts.set([{ id: '2', message: 'Error', type: 'error' }]);
    fixture.detectChanges();
    const iconError = fixture.nativeElement.querySelector('.toast-icon span').textContent;
    expect(iconError).toBe('error');

    notificationServiceSpy.toasts.set([{ id: '3', message: 'Warn', type: 'warning' }]);
    fixture.detectChanges();
    const iconWarn = fixture.nativeElement.querySelector('.toast-icon span').textContent;
    expect(iconWarn).toBe('warning');
  });
});
