import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookService } from '../../core/services/book.service';
import { Book } from '../../shared/models/models';

@Component({
  selector: 'app-editions',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="editions-container">
      <header class="editions-header">
        <h1 class="premium-title">Curated Editions</h1>
        <p class="subtitle">Hand-picked selections for the discerning reader.</p>
      </header>

      <div class="featured-grid" *ngIf="!loading(); else loadingState">
        <div *ngFor="let book of featuredBooks()" class="edition-card card card--glass" [routerLink]="['/book', book.bookId]">
          <div class="card-image">
            <img [src]="book.coverImageUrl || 'assets/images/book-placeholder.jpg'" [alt]="book.title">
            <div class="edition-badge">Collector's Choice</div>
          </div>
          <div class="card-content">
            <h3>{{ book.title }}</h3>
            <p class="author">by {{ book.author }}</p>
            <div class="meta">
              <span class="genre">{{ book.genre }}</span>
              <span class="price">₹{{ book.price }}</span>
            </div>
            <p class="description">{{ book.description | slice:0:120 }}...</p>
            <button class="view-btn">View Archival Details</button>
          </div>
        </div>
      </div>

      <ng-template #loadingState>
        <div class="loading-shimmer">
          <div class="shimmer-card" *ngFor="let i of [1,2,3]"></div>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .editions-container {
      padding: 8rem 2rem 4rem;
      max-width: 1200px;
      margin: 0 auto;
      min-height: 80vh;
    }
    .editions-header {
      text-align: center;
      margin-bottom: 4rem;
    }
    .premium-title {
      font-size: 3.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--text-primary), var(--color-primary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 1rem;
    }
    .subtitle {
      color: var(--text-secondary);
      font-size: 1.25rem;
    }
    .featured-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 2.5rem;
    }
    .edition-card {
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      cursor: pointer;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: var(--color-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
    }
    .edition-card:hover {
      transform: translateY(-10px);
      box-shadow: var(--shadow-lg);
      border-color: var(--color-primary-hover);
    }
    .card-image {
      position: relative;
      height: 450px;
      overflow: hidden;
    }
    .card-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.6s ease;
    }
    .edition-card:hover .card-image img {
      transform: scale(1.05);
    }
    .edition-badge {
      position: absolute;
      top: 1.5rem;
      right: 1.5rem;
      background: var(--color-primary);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      backdrop-filter: blur(5px);
    }
    .card-content {
      padding: 2rem;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .card-content h3 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
      color: var(--text-primary);
    }
    .author {
      color: var(--text-secondary);
      margin-bottom: 1.5rem;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      font-weight: 600;
    }
    .price {
      color: var(--color-primary);
    }
    .description {
      font-size: 0.9rem;
      line-height: 1.6;
      color: var(--text-secondary);
      margin-bottom: 2rem;
    }
    .view-btn {
      margin-top: auto;
      padding: 0.85rem;
      border: none;
      background: var(--color-primary);
      color: white;
      border-radius: var(--radius-md);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 0.75rem;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      box-shadow: var(--shadow-sm);
    }
    .view-btn:hover {
      background: var(--color-primary-hover);
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    .view-btn:active {
      transform: translateY(0);
    }
    .loading-shimmer {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2.5rem;
    }
    .shimmer-card {
      height: 600px;
      background: linear-gradient(90deg, var(--surface-light) 25%, var(--surface-dark) 50%, var(--surface-light) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 24px;
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `]
})
export class EditionsComponent implements OnInit {
  private bookService = inject(BookService);
  featuredBooks = signal<Book[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.bookService.getBooks(0, 6).subscribe({
      next: (response) => {
        // Just take a few for the curated feel
        this.featuredBooks.set(response.content);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
