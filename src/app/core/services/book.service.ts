import { environment } from '../../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { ApiResponse, Book, Page } from '../../shared/models/models';

/**
 * Service responsible for fetching and managing book catalog data.
 * Interacts with the backend book-service for CRUD and search operations.
 */
@Injectable({
  providedIn: 'root'
})
export class BookService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.apiBaseUrl + '/books';

  // Retrieves a paginated and sorted list of all books
  getBooks(page: number = 0, size: number = 10, sort: string = 'title,asc') {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);
    
    return this.http.get<ApiResponse<Page<Book>>>(this.API_URL, { params }).pipe(
      map(response => response.data)
    );
  }

  // Fetches the details of a single book by its unique ID
  getBookById(id: number) {
    return this.http.get<ApiResponse<Book>>(`${this.API_URL}/${id}`).pipe(
      map(response => response.data)
    );
  }

  // Retrieves a list of featured books from the backend
  getFeaturedBooks() {
    return this.http.get<ApiResponse<Book[]>>(`${this.API_URL}/featured`).pipe(
      map(response => response.data)
    );
  }

  // Searches and filters books based on keyword, genre, price, and rating
  searchBooks(keyword: string = '', page: number = 0, size: number = 10, filters: any = {}) {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (keyword) params = params.set('keyword', keyword);
    if (filters.genre) params = params.set('genre', filters.genre);
    if (filters.minPrice) params = params.set('minPrice', filters.minPrice.toString());
    if (filters.maxPrice) params = params.set('maxPrice', filters.maxPrice.toString());
    if (filters.minRating) params = params.set('minRating', filters.minRating.toString());
    if (filters.sort) params = params.set('sort', filters.sort);
    
    return this.http.get<ApiResponse<Page<Book>>>(`${this.API_URL}/search`, { params }).pipe(
      map(response => response.data)
    );
  }

  // Adds a new book to the catalog (admin feature)
  addBook(book: Partial<Book>) {
    return this.http.post<ApiResponse<Book>>(this.API_URL, book).pipe(
      map(response => response.data)
    );
  }

  // Updates the information of an existing book
  updateBook(id: number, book: Partial<Book>) {
    // Backend expects PUT /api/v1/books/{id}
    return this.http.put<ApiResponse<Book>>(`${this.API_URL}/${id}`, book).pipe(
      map(response => response.data)
    );
  }

  // Removes a book from the system catalog
  deleteBook(id: number) {
    return this.http.delete<ApiResponse<null>>(`${this.API_URL}/${id}`).pipe(
      map(response => response.data)
    );
  }
}
