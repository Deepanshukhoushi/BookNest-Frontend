import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LogoComponent } from './logo.component';
import { provideRouter } from '@angular/router';

describe('LogoComponent', () => {
  let component: LogoComponent;
  let fixture: ComponentFixture<LogoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogoComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(LogoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default variant and size', () => {
    expect(component.variant()).toBe('default');
    expect(component.size()).toBe('1.875rem');
  });

  it('should apply size to host element style', () => {
    fixture.componentRef.setInput('size', '2rem');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const logoLink = compiled.querySelector('.logo-link') as HTMLElement;
    expect(logoLink.style.fontSize).toBe('2rem');
  });
});
