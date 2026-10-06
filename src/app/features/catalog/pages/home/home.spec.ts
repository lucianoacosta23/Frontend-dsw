import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Home } from './home';
import { CatalogService } from '../../../../core/services/catalog.service';
import { ReviewService } from '../../../../core/services/review.service';
import { ReviewCard } from '../../../reviews/components/review-card/review-card';
import { PopularCarousel } from '../../components/popular-carousel/popular-carousel';

@Component({ selector: 'app-review-card', template: '' })
class ReviewStub {
  @Input() review: unknown;
}
@Component({ selector: 'app-popular-carousel', template: '' })
class CarouselStub {
  @Input() albums: unknown;
}

const album = {
  id: 9,
  name: 'Test album',
  type: 'ALBUM',
  imageUrl: null,
  releaseDate: '1992',
  artists: [{ name: 'Artist' }],
  reviewCount: 16,
};
const review = {
  id: 1,
  text: 'Test review',
  author: { id: 1, username: 'test' },
  rating: 4,
  likeCount: 0,
  likedByMe: false,
};

describe('Home: featured data isolation', () => {
  let catalog: {
    getPopularAlbums: ReturnType<typeof vi.fn>;
    getPopularTracks: ReturnType<typeof vi.fn>;
  };
  let reviews: {
    getPopularReviews: ReturnType<typeof vi.fn>;
    getRatingStats: ReturnType<typeof vi.fn>;
  };
  beforeEach(() => {
    catalog = {
      getPopularAlbums: vi.fn(() => of({ data: [album] })),
      getPopularTracks: vi.fn(() => of({ data: [] })),
    };
    reviews = {
      getPopularReviews: vi.fn(() => of({ data: [review] })),
      getRatingStats: vi.fn(() => of({ data: { averageRating: 4.2, totalRatings: 16 } })),
    };
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: CatalogService, useValue: catalog },
        { provide: ReviewService, useValue: reviews },
      ],
    });
    TestBed.overrideComponent(Home, {
      remove: { imports: [ReviewCard, PopularCarousel] },
      add: { imports: [ReviewStub, CarouselStub] },
    });
  });
  function render() {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    return fixture;
  }
  it('selects the first ranked album and requests only its two popular reviews', () => {
    const fixture = render();
    expect(fixture.componentInstance.featured()?.id).toBe(9);
    expect(reviews.getPopularReviews).toHaveBeenCalledWith('release', 9, 1, 2);
    expect(reviews.getRatingStats).toHaveBeenCalledWith('release', 9);
    expect(fixture.componentInstance.averageLabel()).toBe('4,2');
  });
  it('keeps the release and reviews visible when statistics fail', () => {
    reviews.getRatingStats.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400 })),
    );
    const fixture = render();
    expect(fixture.componentInstance.statsError()).toBeTruthy();
    expect(fixture.componentInstance.featured()?.reviewCount).toBe(16);
    expect(fixture.componentInstance.reviews()).toHaveLength(1);
    expect(fixture.componentInstance.averageLabel()).toBeNull();
    fixture.componentInstance.loadFeaturedStats();
    expect(reviews.getRatingStats).toHaveBeenCalledTimes(2);
    expect(reviews.getPopularReviews).toHaveBeenCalledTimes(1);
    expect(catalog.getPopularAlbums).toHaveBeenCalledTimes(1);
  });
  it('keeps the average visible when reviews fail', () => {
    reviews.getPopularReviews.mockReturnValue(throwError(() => new Error('offline')));
    const fixture = render();
    expect(fixture.componentInstance.reviewsError()).toBeTruthy();
    expect(fixture.componentInstance.averageLabel()).toBe('4,2');
  });
  it('handles an empty ranking without issuing featured requests', () => {
    catalog.getPopularAlbums.mockReturnValue(of({ data: [] }));
    const fixture = render();
    expect(fixture.componentInstance.featured()).toBeNull();
    expect(reviews.getPopularReviews).not.toHaveBeenCalled();
    expect(reviews.getRatingStats).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Todavía no hay álbumes reseñados.');
  });
  it('handles zero reviews and a null average without invented metrics', () => {
    reviews.getPopularReviews.mockReturnValue(of({ data: [] }));
    reviews.getRatingStats.mockReturnValue(of({ data: { averageRating: null, totalRatings: 0 } }));
    const fixture = render();
    expect(fixture.nativeElement.textContent).toContain('Todavía no hay reseñas para mostrar');
    expect(fixture.componentInstance.averageLabel()).toBeNull();
  });
  it('limits rendering to two reviews even if the response contains more', () => {
    reviews.getPopularReviews.mockReturnValue(
      of({ data: [review, { ...review, id: 2 }, { ...review, id: 3 }] }),
    );
    expect(render().componentInstance.reviews()).toHaveLength(2);
  });
  it('cancels outdated featured responses when retrying the catalogue', () => {
    const pending = new Subject();
    reviews.getPopularReviews.mockReturnValueOnce(pending);
    const fixture = render();
    expect(fixture.componentInstance.reviewsLoading()).toBe(true);
    catalog.getPopularAlbums.mockReturnValue(of({ data: [{ ...album, id: 7 }] }));
    fixture.componentInstance.loadPopularAlbums();
    pending.next({ data: [{ ...review, id: 99 }] });
    expect(fixture.componentInstance.featured()?.id).toBe(7);
    expect(fixture.componentInstance.reviews()[0].id).toBe(1);
    expect(pending.observed).toBe(false);
  });
  it('keeps tracks independent from a catalogue failure', () => {
    catalog.getPopularAlbums.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );
    const fixture = render();
    expect(fixture.componentInstance.errorMessage()).toContain('No pudimos conectar');
    expect(catalog.getPopularTracks).toHaveBeenCalledWith(10);
    expect(fixture.componentInstance.tracksLoading()).toBe(false);
  });
});
