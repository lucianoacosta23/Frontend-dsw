import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ReportService } from '../../../../core/services/report.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewCard } from './review-card';
import { AuthService } from '../../../../core/services/auth.service';
import { CommentService } from '../../../../core/services/comments-service';
import { ReviewService } from '../../../../core/services/review.service';

const review = {id: 14, author: {id: 1, username: 'autor'}, rating: 4.5, text: 'Una reseña real', releaseId: 3, trackId: null, createdAt: '2026-10-10T12:00:00Z', editedAt: null, likeCount: 7, likedByMe: false};
describe('ReviewCard variants', () => {
  const auth = {currentUser: signal<{id: number; category: string} | null>(null)};
  let comments: {getReviewComments: ReturnType<typeof vi.fn>};
  let reviews: {likeReview: ReturnType<typeof vi.fn>; unlikeReview: ReturnType<typeof vi.fn>; getReviewHistory: ReturnType<typeof vi.fn>; editReview: ReturnType<typeof vi.fn>};
  let reports: {createReviewReport: ReturnType<typeof vi.fn>};
  beforeEach(() => {
    auth.currentUser.set({id: 2, category: 'USER'});
    comments = {getReviewComments: vi.fn(() => of({data: [], pagination: {total: 0}}))};
    reviews = {likeReview: vi.fn(() => of({data: {liked: true, likeCount: 8}})), unlikeReview: vi.fn(), getReviewHistory: vi.fn(() => of({data: [{id: 1, text: 'Texto anterior', effectiveAt: review.createdAt, replacedAt: review.createdAt}], pagination: {page: 1, totalPages: 1}})), editReview: vi.fn(() => of({data: {text: 'Texto editado', editedAt: new Date().toISOString()}}))};
    reports = {createReviewReport: vi.fn(() => of({message: 'OK'}))};
    TestBed.configureTestingModule({imports: [ReviewCard], providers: [provideRouter([]), provideHttpClient(), {provide: AuthService, useValue: auth}, {provide: CommentService, useValue: comments}, {provide: ReviewService, useValue: reviews}, {provide: ReportService, useValue: reports}]});
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

  it('full cards display Home-style identity and icons, and keep actions in the menu', () => {
    const fixture = render(false);
    expect(fixture.nativeElement.querySelector('.compact-avatar').textContent).toContain('AU');
    expect(fixture.nativeElement.querySelector('time')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.social-actions .like-button use').getAttribute('href')).toBe('/icons.svg#heart');
    expect(fixture.nativeElement.querySelector('.social-actions .comments-button use').getAttribute('href')).toBe('/icons.svg#comment');
    expect(fixture.nativeElement.querySelector('app-review-editor .editor-actions')).toBeNull();
    expect(fixture.nativeElement.querySelector('.edit-option')).toBeNull();
    expect(fixture.nativeElement.querySelector('.options-panel .report-button')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.history-option')).not.toBeNull();
  });

  it('the heart calls the existing like API, shows the returned count and retains it on error', () => {
    const fixture = render(false);
    fixture.nativeElement.querySelector('.social-actions .like-button').click(); fixture.detectChanges();
    expect(reviews.likeReview).toHaveBeenCalledWith(14);
    expect(fixture.nativeElement.querySelector('.social-actions .like-button').classList.contains('is-liked')).toBe(true);
    expect(fixture.nativeElement.querySelector('.social-actions .like-button').textContent).toContain('8');
    reviews.unlikeReview.mockReturnValueOnce(throwError(() => new HttpErrorResponse({status: 500})));
    fixture.nativeElement.querySelector('.social-actions .like-button').click(); fixture.detectChanges();
    expect(fixture.componentInstance.liked()).toBe(true);
    expect(fixture.componentInstance.likeCount()).toBe(8);
    expect(fixture.nativeElement.querySelector('[role=alert]')).not.toBeNull();
  });

  it('the comment icon closes and reopens comments without refetching', () => {
    const fixture = render(false);
    const button = fixture.nativeElement.querySelector('.comments-button');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    button.click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.comments')).toBeNull();
    button.click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.comment-form')).not.toBeNull();
    expect(comments.getReviewComments).toHaveBeenCalledTimes(1);
  });

  it('allows fresh own reviews to be edited from the menu and never shows self-report', async () => {
    auth.currentUser.set({id: 1, category: 'USER'});
    const fixture = render(false);
    fixture.componentRef.setInput('review', {...review, createdAt: new Date().toISOString()}); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.report-button')).toBeNull();
    const edit = fixture.nativeElement.querySelector('.edit-option');
    expect(edit.disabled).toBe(false);
    edit.click(); fixture.detectChanges(); await fixture.whenStable();
    const textarea = fixture.nativeElement.querySelector('.edit-form textarea');
    expect(textarea).not.toBeNull();
    textarea.value = 'Texto editado'; textarea.dispatchEvent(new Event('input')); fixture.detectChanges(); await fixture.whenStable();
    fixture.nativeElement.querySelector('.edit-form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
    fixture.detectChanges();
    expect(reviews.editReview).toHaveBeenCalledWith(14, 'Texto editado');
    expect(fixture.nativeElement.querySelector('.review-text').textContent).toContain('Texto editado');
    expect(fixture.nativeElement.textContent).toContain('Editada el');
  });

  it('shows the edit deadline in the menu for expired own reviews', () => {
    auth.currentUser.set({id: 1, category: 'USER'});
    const fixture = render(false);
    fixture.componentRef.setInput('review', {...review, createdAt: new Date(Date.now() - 25 * 3600000).toISOString()}); fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.edit-option');
    expect(button.disabled).toBe(true);
    expect(button.title).toContain('24 horas');
    expect(fixture.nativeElement.querySelector('.option-hint').textContent).toContain('24 horas');
    button.click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.edit-form')).toBeNull();
  });

  it('opens history from the menu and closes the native disclosure', () => {
    const fixture = render(false);
    const menu = fixture.nativeElement.querySelector('.review-options'); menu.open = true;
    fixture.nativeElement.querySelector('.history-option').click(); fixture.detectChanges();
    expect(reviews.getReviewHistory).toHaveBeenCalledWith(14, 1);
    expect(menu.open).toBe(false);
    expect(fixture.nativeElement.querySelector('.revision-text').textContent).toContain('Texto anterior');
    fixture.nativeElement.querySelector('.history-option').click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.history')).toBeNull();
  });

  it('reports another review once using the existing form and disables the option after success', () => {
    const fixture = render(false);
    fixture.nativeElement.querySelector('.report-button').click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.report-form')).not.toBeNull();
    fixture.componentInstance.submitReport(); fixture.detectChanges();
    expect(reports.createReviewReport).toHaveBeenCalledWith(14, {reason: 'SPAM'});
    expect(fixture.nativeElement.querySelector('.report-form')).toBeNull();
    expect(fixture.nativeElement.querySelector('.report-button').disabled).toBe(true);
    fixture.componentInstance.submitReport();
    expect(reports.createReviewReport).toHaveBeenCalledTimes(1);
  });

  it('closes options with Escape and outside clicks, and disables private actions for guests', () => {
    auth.currentUser.set(null);
    const fixture = render(false);
    const menu = fixture.nativeElement.querySelector('.review-options'); menu.open = true;
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    expect(menu.open).toBe(false);
    menu.open = true; document.body.click(); expect(menu.open).toBe(false);
    expect(fixture.nativeElement.querySelector('.social-actions .like-button').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.history-option').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.report-button, .edit-option')).toBeNull();
    fixture.componentInstance.toggleLike(); expect(reviews.likeReview).not.toHaveBeenCalled();
  });
});
