import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { BookService } from '../../core/services/book.service';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let bookServiceSpy: any;

  beforeEach(async () => {
    bookServiceSpy = {
      getFeaturedBooks: vi.fn().mockReturnValue(of([]))
    };

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        { provide: BookService, useValue: bookServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load trending books on init', () => {
    const mockBooks = [{ bookId: 1, title: 'B1' }, { bookId: 2, title: 'B2' }] as any;
    bookServiceSpy.getFeaturedBooks.mockReturnValue(of(mockBooks));
    
    component.ngOnInit();
    
    expect(bookServiceSpy.getFeaturedBooks).toHaveBeenCalled();
    expect(component.trendingBooks().length).toBe(2);
    expect(component.loading()).toBe(false);
  });
});
