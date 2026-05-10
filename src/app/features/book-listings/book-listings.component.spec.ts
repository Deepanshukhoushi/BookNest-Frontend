import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookListingsComponent } from './book-listings.component';
import { BookService } from '../../core/services/book.service';
import { SearchService } from '../../core/services/search.service';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

describe('BookListingsComponent', () => {
  let component: BookListingsComponent;
  let fixture: ComponentFixture<BookListingsComponent>;
  let bookServiceSpy: any;
  let searchServiceSpy: any;

  const mockBookResponse = {
    content: [
      { bookId: 1, title: 'Book 1', price: 10, author: 'Author 1', imageUrl: '', genre: 'Fiction', averageRating: 4 }
    ],
    number: 0,
    totalPages: 5,
    totalElements: 75
  };

  beforeEach(async () => {
    bookServiceSpy = {
      searchBooks: vi.fn().mockReturnValue(of(mockBookResponse))
    };
    searchServiceSpy = {
      searchTerm: signal(''),
      clearSearch: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [BookListingsComponent],
      providers: [
        { provide: BookService, useValue: bookServiceSpy },
        { provide: SearchService, useValue: searchServiceSpy },
        { provide: ActivatedRoute, useValue: { params: of({}) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BookListingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load books on init', () => {
    expect(bookServiceSpy.searchBooks).toHaveBeenCalled();
    expect(component.books().length).toBe(1);
    expect(component.totalElements()).toBe(75);
  });

  it('should toggle genre display', () => {
    expect(component.displayedGenres().length).toBe(5);
    component.toggleShowAllGenres();
    expect(component.displayedGenres().length).toBe(component.allGenres.length);
  });

  it('should filter by genre', () => {
    component.toggleGenre('Sci-Fi');
    expect(component.selectedGenre()).toBe('Sci-Fi');
    
    // Toggle off
    component.toggleGenre('Sci-Fi');
    expect(component.selectedGenre()).toBeNull();
  });

  it('should clear all filters', () => {
    component.selectedGenre.set('Fiction');
    component.maxPrice.set(500);
    expect(component.hasActiveFilters()).toBe(true);
    
    component.clearAllFilters();
    expect(component.selectedGenre()).toBeNull();
    expect(component.maxPrice()).toBe(2000);
    expect(component.hasActiveFilters()).toBe(false);
  });

  it('should handle pagination', () => {
    component.nextPage();
    expect(bookServiceSpy.searchBooks).toHaveBeenCalledWith('', 1, 15, expect.any(Object));
    
    component.prevPage();
    // It was page 1, now back to 0
    expect(bookServiceSpy.searchBooks).toHaveBeenCalledWith('', 0, 15, expect.any(Object));
  });

  it('should handle sort selection', () => {
    component.selectSort({ label: 'Price: Low to High', value: 'price,asc' });
    expect(component.sortBy()).toBe('price,asc');
    expect(component.isSortOpen()).toBe(false);
  });

  it('should handle price updates', () => {
    component.updateMaxPrice({ target: { value: '500' } } as any);
    expect(component.maxPrice()).toBe(500);
 
    // Invalid value should not change price
    component.updateMaxPrice({ target: { value: 'abc' } } as any);
    expect(component.maxPrice()).toBe(500);
 
    component.updateMinPrice({} as any);
    expect(component.minPrice()).toBe(0);
  });

  it('should handle rating filter', () => {
    component.setRating(4);
    expect(component.minRating()).toBe(4);
    component.setRating(0);
    expect(component.minRating()).toBeNull();
  });

  describe('TrackBy and Helpers', () => {
    it('should trackBy bookId', () => {
      expect(component.trackByBookId(0, { bookId: 123 } as any)).toBe(123);
    });

    it('should trackBy genre', () => {
      expect(component.trackByGenre(0, 'Fiction')).toBe('Fiction');
    });

    it('should trackBy value', () => {
      expect(component.trackByValue(0, { value: 'test' })).toBe('test');
      expect(component.trackByValue(0, 'simple')).toBe('simple');
    });
  });

  describe('Document Click', () => {
    it('should close sort dropdown when clicking outside', () => {
      component.isSortOpen.set(true);
      const event = { target: document.createElement('div') } as any;
      component.onDocumentClick(event);
      expect(component.isSortOpen()).toBe(false);
    });

    it('should NOT close sort dropdown when clicking inside', () => {
      component.isSortOpen.set(true);
      const div = document.createElement('div');
      div.className = 'custom-sort';
      const event = { target: div } as any;
      component.onDocumentClick(event);
      expect(component.isSortOpen()).toBe(true);
    });
  });
});
