import { environment } from '../../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Review, ReviewStatus } from '../../shared/models/models';
export type { Review };

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.apiBaseUrl + '/reviews';

  // ── Customer operations ──────────────────────────────────────────────────

  addReview(review: Review) {
    return this.http.post<Review>(this.API_URL, review);
  }

  /** Returns only APPROVED reviews for a book (public-facing). */
  getByBook(bookId: number) {
    return this.http.get<Review[]>(`${this.API_URL}/book/${bookId}`);
  }

  getAvgRating(bookId: number) {
    return this.http.get<number>(`${this.API_URL}/avg/${bookId}`);
  }

  getByUser(userId: number) {
    return this.http.get<Review[]>(`${this.API_URL}/user/${userId}`);
  }

  updateReview(reviewId: number, review: Review) {
    return this.http.put<Review>(`${this.API_URL}/${reviewId}`, review);
  }

  deleteReview(reviewId: number) {
    return this.http.delete(`${this.API_URL}/${reviewId}`, { responseType: 'text' });
  }

  // ── Admin moderation operations ──────────────────────────────────────────

  /**
   * Returns all reviews, optionally filtered by status.
   * @param status Optional filter: 'PENDING' | 'APPROVED' | 'REJECTED'
   */
  getAllReviews(status?: ReviewStatus) {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<Review[]>(`${this.API_URL}/all`, { params });
  }

  /** Returns counts per moderation status for badge display. */
  getStatusCounts() {
    return this.http.get<Record<ReviewStatus, number>>(`${this.API_URL}/counts`);
  }

  approveReview(reviewId: number) {
    return this.http.put<Review>(`${this.API_URL}/${reviewId}/approve`, {});
  }

  rejectReview(reviewId: number) {
    return this.http.put<Review>(`${this.API_URL}/${reviewId}/reject`, {});
  }
}
