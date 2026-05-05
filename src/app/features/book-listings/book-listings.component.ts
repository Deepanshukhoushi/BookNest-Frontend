import { Component, inject, OnInit, signal, computed, effect, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookCardComponent } from '../../shared/ui/book-card.component';
import { BookService } from '../../core/services/book.service';
import { SearchService } from '../../core/services/search.service';
import { Book } from '../../shared/models/models';


/**
 * Component for browsing and filtering the comprehensive book catalog.
 * Supports real-time searching, genre filtering, price ranges, and paginated results.
 */
@Component({
  selector: 'app-book-listings',
  standalone: true,
  imports: [CommonModule, BookCardComponent, RouterModule],
  templateUrl: './book-listings.component.html',
  styleUrl: './book-listings.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookListingsComponent implements OnInit {
  private bookService = inject(BookService);
  private searchService = inject(SearchService);

  searchTerm = this.searchService.searchTerm;

  allGenres = [
    'Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Science Fiction',
    'Fantasy', 'Horror', 'Biography', 'Self-Help', 'History'
  ];
  
  showAllGenres = signal(false);
  displayedGenres = computed(() => 
    this.showAllGenres() ? this.allGenres : this.allGenres.slice(0, 5)
  );

  // Expands or collapses the list of available genres in the filter panel
  toggleShowAllGenres() {
    this.showAllGenres.update(v => !v);
  }
  
  // Filter state
  selectedGenre = signal<string | null>(null);
  minPrice = signal<number>(0);
  maxPrice = signal<number>(2000);
  minRating = signal<number | null>(null);
  sortBy = signal<string>('title,asc');

  books = signal<Book[]>([]);
  loading = signal(true);
  currentPage = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);
  pageSize = signal(15);

  // Custom Dropdown State
  isSortOpen = signal(false);
  sortOptions = [
    { label: 'Featured', value: 'title,asc' },
    { label: 'Price: Low to High', value: 'price,asc' },
    { label: 'Price: High to Low', value: 'price,desc' },
    { label: 'Newest Arrivals', value: 'publishedDate,desc' }
  ];

  currentSortLabel = computed(() => {
    const active = this.sortOptions.find(opt => opt.value === this.sortBy());
    return active ? active.label : 'Featured';
  });

  // Computed properties for pagination text
  showingStart = computed(() => (this.currentPage() * this.pageSize()) + 1);
  showingEnd = computed(() => Math.min((this.currentPage() + 1) * this.pageSize(), this.totalElements()));
  
  // Computed property for page list (shows only the current page)
  pages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 0) return [];
    
    return [current];
  });

  constructor() {
    // Re-load books whenever search term or filters or sort changes
    effect(() => {
      const term = this.searchTerm();
      const genre = this.selectedGenre();
      const minP = this.minPrice();
      const maxP = this.maxPrice();
      const rating = this.minRating();
      const sort = this.sortBy();
      
      this.loadBooks(0, term, {
        genre,
        minPrice: minP,
        maxPrice: maxP,
        minRating: rating,
        sort: sort
      });
    });
  }

  ngOnInit() {
    // Initial load is handled by the effect above
  }

  // Fetches a subset of books from the catalog based on search criteria and filters
  loadBooks(page: number = 0, keyword: string = '', filters: any = {}) {
    this.loading.set(true);
    
    // Use the upgraded searchBooks which handles all filters
    this.bookService.searchBooks(keyword, page, this.pageSize(), filters).subscribe({
      next: (response) => {
        this.books.set(response.content);
        this.currentPage.set(response.number);
        this.totalPages.set(response.totalPages);
        this.totalElements.set(response.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  // Handles navigation between pages in the book catalog
  onPageChange(page: number) {
    if (page < 0 || page >= this.totalPages()) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.loadBooks(page, this.searchTerm(), {
      genre: this.selectedGenre(),
      minPrice: this.minPrice(),
      maxPrice: this.maxPrice(),
      minRating: this.minRating(),
      sort: this.sortBy()
    });
  }

  nextPage() {
    this.onPageChange(this.currentPage() + 1);
  }

  prevPage() {
    this.onPageChange(this.currentPage() - 1);
  }

  // Toggles the visibility of the sorting options menu
  toggleSort() {
    this.isSortOpen.update(v => !v);
  }

  // Updates the sorting order for the book collection
  selectSort(option: any) {
    this.sortBy.set(option.value);
    this.isSortOpen.set(false);
  }

  // Closes the sorting menu if a click occurs outside the component
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const isInside = target.closest('.custom-sort');
    if (!isInside && this.isSortOpen()) {
      this.isSortOpen.set(false);
    }
  }

  // Toggles the selection of a specific genre for filtering
  toggleGenre(genre: string) {
    if (this.selectedGenre() === genre) {
      this.selectedGenre.set(null);
    } else {
      this.selectedGenre.set(genre);
    }
  }

  // Updates the minimum price constraint for the book search
  updateMinPrice(event: any) {
    // Locked to 0 for single-handle UI
    this.minPrice.set(0);
  }

  // Updates the maximum price constraint for the book search
  updateMaxPrice(event: any) {
    const value = parseInt(event.target.value);
    if (!isNaN(value)) {
      this.maxPrice.set(Math.max(value, this.minPrice()));
    }
  }

  // Filters the catalog by a minimum required user rating
  setRating(rating: number) {
    this.minRating.set(rating === 0 ? null : rating);
  }

  hasActiveFilters = computed(() => {
    return this.selectedGenre() !== null || 
           this.minPrice() > 0 || 
           this.maxPrice() < 2000 || 
           this.minRating() !== null;
  });

  // Resets all active filters to their initial unrestricted states
  clearAllFilters() {
    this.selectedGenre.set(null);
    this.minPrice.set(0);
    this.maxPrice.set(2000);
    this.minRating.set(null);
  }
}

