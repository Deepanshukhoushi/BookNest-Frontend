import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AboutComponent } from './about.component';

describe('AboutComponent', () => {
  let component: AboutComponent;
  let fixture: ComponentFixture<AboutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AboutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the premium title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.premium-title')?.textContent).toContain('The Booknest Archives');
  });

  it('should render the story grid cards', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.story-card');
    expect(cards.length).toBe(3);
    expect(cards[0].querySelector('h3')?.textContent).toBe('Our Philosophy');
  });
});
