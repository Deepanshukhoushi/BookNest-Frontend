import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReviewService } from './review.service';

describe('ReviewService', () => {
  let service: ReviewService;
  let httpMock: HttpTestingController;

  const mockReview = {
    reviewId: 1,
    bookId: 10,
    userId: 1,
    rating: 5,
    comment: 'Excellent book!',
    status: 'APPROVED' as const
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        ReviewService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    service = TestBed.inject(ReviewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('addReview() should POST to /reviews', () => {
    service.addReview(mockReview as any).subscribe(r => expect(r).toEqual(mockReview));

    const req = httpMock.expectOne(r => r.url.includes('/reviews') && r.method === 'POST');
    expect(req.request.body).toEqual(mockReview);
    req.flush(mockReview);
  });

  it('getByBook() should GET reviews for a specific book', () => {
    service.getByBook(10).subscribe(reviews => expect(reviews).toEqual([mockReview]));

    const req = httpMock.expectOne(r => r.url.includes('/reviews/book/10'));
    expect(req.request.method).toBe('GET');
    req.flush([mockReview]);
  });

  it('getAvgRating() should GET average rating for a book', () => {
    service.getAvgRating(10).subscribe(avg => expect(avg).toBe(4.5));

    const req = httpMock.expectOne(r => r.url.includes('/reviews/avg/10'));
    expect(req.request.method).toBe('GET');
    req.flush(4.5);
  });

  it('getByUser() should GET reviews by a specific user', () => {
    let result: any;
    service.getByUser(1).subscribe(reviews => result = reviews);

    const req = httpMock.expectOne(r => r.url.includes('/reviews/user/1'));
    expect(req.request.method).toBe('GET');
    req.flush([mockReview]);

    expect(result).toEqual([mockReview]);
  });

  it('updateReview() should PUT updated review', () => {
    const updated = { ...mockReview, comment: 'Updated comment' };
    let result: any;
    service.updateReview(1, updated as any).subscribe(r => result = r);

    const req = httpMock.expectOne(r => r.url.includes('/reviews/1') && r.method === 'PUT');
    expect(req.request.body).toEqual(updated);
    req.flush(updated);

    expect(result).toEqual(updated);
  });

  it('deleteReview() should DELETE a review', () => {
    let result: any;
    service.deleteReview(1).subscribe(res => result = res);

    const req = httpMock.expectOne(r => r.url.includes('/reviews/1') && r.method === 'DELETE');
    expect(req.request.method).toBe('DELETE');
    req.flush('Deleted');

    expect(result).toBe('Deleted');
  });

  it('getAllReviews() should GET all reviews without status filter', () => {
    service.getAllReviews().subscribe(reviews => expect(reviews).toEqual([mockReview]));

    const req = httpMock.expectOne(r => r.url.includes('/reviews/all'));
    expect(req.request.params.has('status')).toBe(false);
    req.flush([mockReview]);
  });

  it('getAllReviews() should pass status filter as query param', () => {
    service.getAllReviews('PENDING').subscribe();

    const req = httpMock.expectOne(r => r.url.includes('/reviews/all'));
    expect(req.request.params.get('status')).toBe('PENDING');
    req.flush([]);
  });

  it('approveReview() should PUT to approve endpoint', () => {
    let result: any;
    service.approveReview(1).subscribe(r => result = r);

    const req = httpMock.expectOne(r => r.url.includes('/reviews/1/approve'));
    expect(req.request.method).toBe('PUT');
    req.flush(mockReview);

    expect(result).toEqual(mockReview);
  });

  it('rejectReview() should PUT to reject endpoint', () => {
    let result: any;
    service.rejectReview(1).subscribe(r => result = r);

    const req = httpMock.expectOne(r => r.url.includes('/reviews/1/reject'));
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockReview, status: 'REJECTED' });

    expect(result.status).toBe('REJECTED');
  });
});
