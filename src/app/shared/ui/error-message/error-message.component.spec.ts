import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorMessageComponent } from './error-message.component';

describe('ErrorMessageComponent', () => {
  let component: ErrorMessageComponent;
  let fixture: ComponentFixture<ErrorMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorMessageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorMessageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should display the message', () => {
    component.message = 'Test Error Message';
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.error-text')?.textContent).toBe('Test Error Message');
  });

  it('should emit retry event when retry button is clicked', () => {
    vi.spyOn(component.retry, 'emit');
    component.showRetry = true;
    fixture.detectChanges();
    
    const button = fixture.nativeElement.querySelector('.retry-btn');
    button.click();
    
    expect(component.retry.emit).toHaveBeenCalled();
  });

  it('should not show retry button if showRetry is false', () => {
    component.showRetry = false;
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.retry-btn');
    expect(button).toBeNull();
  });
});
