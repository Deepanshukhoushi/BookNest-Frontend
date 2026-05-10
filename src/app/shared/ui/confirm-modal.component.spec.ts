import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmModalComponent } from './confirm-modal.component';

describe('ConfirmModalComponent', () => {
  let component: ConfirmModalComponent;
  let fixture: ComponentFixture<ConfirmModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmModalComponent);
    component = fixture.componentInstance;
    // fixture.detectChanges(); // Do not call here to avoid ExpressionChanged error when setInput is used later
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should emit confirm event', () => {
    fixture.detectChanges();
    const spy = vi.spyOn(component.confirm, 'emit');
    component.onConfirm();
    expect(spy).toHaveBeenCalled();
  });

  it('should emit cancel event', () => {
    fixture.detectChanges();
    const spy = vi.spyOn(component.cancel, 'emit');
    component.onCancel();
    expect(spy).toHaveBeenCalled();
  });

  it('should display inputs correctly', () => {
    fixture.componentRef.setInput('title', 'Delete Item');
    fixture.componentRef.setInput('message', 'Sure?');
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.modal-title')?.textContent).toContain('Delete Item');
    expect(compiled.querySelector('.modal-body p')?.textContent).toContain('Sure?');
  });
});
