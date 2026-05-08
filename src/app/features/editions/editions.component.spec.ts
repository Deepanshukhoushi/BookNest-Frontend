import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditionsComponent } from './editions.component';
import { BookService } from '../../core/services/book.service';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';

describe('EditionsComponent', () => {
  let component: EditionsComponent;
  let fixture: ComponentFixture<EditionsComponent>;
  let bookServiceSpy: any;

  beforeEach(async () => {
    bookServiceSpy = {
      getBooks: vi.fn().mockReturnValue(of({ content: [], totalElements: 0 }))
    };

    await TestBed.configureTestingModule({
      imports: [EditionsComponent],
      providers: [
        provideRouter([]),
        { provide: BookService, useValue: bookServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EditionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load books on init', () => {
    const mockBooks = [{ bookId: 1, title: 'B1' }] as any;
    bookServiceSpy.getBooks.mockReturnValue(of({ content: mockBooks }));
    
    component.ngOnInit();
    
    expect(bookServiceSpy.getBooks).toHaveBeenCalledWith(0, 6);
    expect(component.featuredBooks().length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('should handle load error', () => {
    bookServiceSpy.getBooks.mockReturnValue(throwError(() => new Error('Fail')));
    component.ngOnInit();
    expect(component.loading()).toBe(false);
  });
});
