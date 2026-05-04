import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BookService } from './book.service';
import { environment } from '../../../environments/environment';
import { ApiResponse, Book, Page } from '../../shared/models/models';

describe('BookService', () => {
  let service: BookService;
  let httpMock: HttpTestingController;

  const mockBook: Book = {
    bookId: 1,
    title: 'Test Book',
    author: 'Test Author',
    isbn: '1234567890',
    genre: 'Fiction',
    price: 29.99,
    stock: 10
  };

  const mockPage: Page<Book> = {
    content: [mockBook],
    totalElements: 1,
    totalPages: 1,
    size: 10,
    number: 0
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [BookService]
    });
    service = TestBed.inject(BookService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch books with pagination', () => {
    const response: ApiResponse<Page<Book>> = { success: true, message: '', data: mockPage };

    service.getBooks(0, 10, 'title,asc').subscribe(data => {
      expect(data.content.length).toBe(1);
      expect(data.content[0].title).toBe('Test Book');
    });

    const req = httpMock.expectOne(req => 
      req.url === `${environment.apiBaseUrl}/books` && 
      req.params.get('page') === '0' && 
      req.params.get('size') === '10'
    );
    expect(req.request.method).toBe('GET');
    req.flush(response);
  });

  it('should fetch book by id', () => {
    const response: ApiResponse<Book> = { success: true, message: '', data: mockBook };

    service.getBookById(1).subscribe(book => {
      expect(book).toEqual(mockBook);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/books/1`);
    expect(req.request.method).toBe('GET');
    req.flush(response);
  });

  it('should search books with filters', () => {
    const response: ApiResponse<Page<Book>> = { success: true, message: '', data: mockPage };
    const filters = { genre: 'Fiction', minPrice: 10 };

    service.searchBooks('test', 0, 10, filters).subscribe(data => {
      expect(data.content.length).toBe(1);
    });

    const req = httpMock.expectOne(req => 
      req.url === `${environment.apiBaseUrl}/books/search` && 
      req.params.get('keyword') === 'test' &&
      req.params.get('genre') === 'Fiction' &&
      req.params.get('minPrice') === '10'
    );
    expect(req.request.method).toBe('GET');
    req.flush(response);
  });

  it('should add a book', () => {
    const response: ApiResponse<Book> = { success: true, message: 'Added', data: mockBook };
    
    service.addBook(mockBook).subscribe(book => {
      expect(book).toEqual(mockBook);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/books`);
    expect(req.request.method).toBe('POST');
    req.flush(response);
  });

  it('should delete a book', () => {
    const response: ApiResponse<null> = { success: true, message: 'Deleted', data: null };

    service.deleteBook(1).subscribe(data => {
      expect(data).toBeNull();
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/books/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(response);
  });
});
