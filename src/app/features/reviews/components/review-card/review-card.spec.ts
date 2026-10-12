import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewCard } from './review-card';
import { AuthService } from '../../../../core/services/auth.service';
import { CommentService } from '../../../../core/services/comments-service';
import { ReviewService } from '../../../../core/services/review.service';

const review = {id: 14, author: {id: 1, username: 'autor'}, rating: 4.5, text: 'Una reseña real', releaseId: 3, trackId: null, createdAt: '2026-10-10T12:00:00Z', editedAt: null, likeCount: 7, likedByMe: false};
describe('ReviewCard variants', () => {
  const auth = {currentUser: signal<{id: number; category: string} | null>(null)};
  let comments: {getReviewComments: ReturnType<typeof vi.fn>};
  let reviews: {likeReview: ReturnType<typeof vi.fn>; unlikeReview: ReturnType<typeof vi.fn>};
  beforeEach(() => {
    auth.currentUser.set({id: 2, category: 'USER'});
    comments = {getReviewComments: vi.fn(() => of({data: [], pagination: {total: 0}}))};
    reviews = {likeReview: vi.fn(() => of({data: {liked: true, likeCount: 8}})), unlikeReview: vi.fn()};
    TestBed.configureTestingModule({imports: [ReviewCard], providers: [provideRouter([]), provideHttpClient(), {provide: AuthService, useValue: auth}, {provide: CommentService, useValue: comments}, {provide: ReviewService, useValue: reviews}]});
  });
  function render(compact: boolean) {
    const fixture = TestBed.createComponent(ReviewCard);
    fixture.componentRef.setInput('review', review);
    fixture.componentRef.setInput('compact', compact);
    fixture.componentRef.setInput('openCommentsOnLoad', true);
    fixture.detectChanges();
    return fixture;
  }
  it('compact cards never load comments, render forms or mount the editor', () => {
    const fixture = render(true);
    fixture.componentInstance.toggleComments(); fixture.componentInstance.loadComments();
    expect(comments.getReviewComments).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('form, textarea, app-review-editor')).toBeNull();
    expect(fixture.nativeElement.querySelector('.compact-excerpt').getAttribute('href')).toBe('/reviews/14');
    expect(fixture.nativeElement.textContent).toContain('AU');
    expect(fixture.nativeElement.querySelector('.compact-rating').textContent).toContain('4.5');
  });
  it('full cards keep comments, editor and reporting in the detail', () => {
    const fixture = render(false);
    expect(comments.getReviewComments).toHaveBeenCalledWith(14);
    expect(fixture.nativeElement.querySelector('app-review-editor')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.comments-section, .comments-button')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.report-button')).not.toBeNull();
    fixture.componentInstance.toggleReport(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.report-form')).not.toBeNull();
  });
  it('compact likes use the existing service and update the returned counter', () => {
    const fixture = render(true); fixture.componentInstance.toggleLike(); fixture.detectChanges();
    expect(reviews.likeReview).toHaveBeenCalledWith(14);
    expect(fixture.componentInstance.likeCount()).toBe(8);
  });
  it('does not allow visitors or the author to like a compact review', () => {
    auth.currentUser.set(null); const fixture = render(true);
    expect(fixture.nativeElement.querySelector('.compact-actions button').disabled).toBe(true);
    fixture.componentInstance.toggleLike(); expect(reviews.likeReview).not.toHaveBeenCalled();
    auth.currentUser.set({id: 1, category: 'USER'}); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.compact-actions button').disabled).toBe(true);
  });
});
