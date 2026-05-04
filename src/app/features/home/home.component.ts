import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookCardComponent } from '../../shared/ui/book-card.component';
import { BookService } from '../../core/services/book.service';
import { Book } from '../../shared/models/models';

/**
 * Component for the application's landing page.
 * Displays a curated selection of featured and trending books to the user.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, BookCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  private bookService = inject(BookService);
  trendingBooks = signal<Book[]>([]);
  loading = signal(true);

  // Fetches a list of featured volumes to display on the home screen
  ngOnInit() {
    this.bookService.getFeaturedBooks().subscribe({
      next: (books) => {
        this.trendingBooks.set(books.slice(0, 5));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
