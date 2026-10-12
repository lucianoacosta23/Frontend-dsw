import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OwnProfile } from './own-profile';
import { AuthService } from '../../../../core/services/auth.service';
import { UserService } from '../../../../core/services/user-service';
import { ReviewService } from '../../../../core/services/review.service';
import { PlaylistService } from '../../../../core/services/playlist.service';
import { Navbar } from '../../../../shared/components/navbar/navbar';
import type { ReviewDetailResponse } from '../../../../models/review';

@Component({ selector: 'app-navbar', template: '' })
class NavbarStub {}

const user = {
  id: 37,
  username: 'listener',
  fullName: 'Una persona',
  createdAt: '2026-01-01',
  followersCount: 4,
  followingCount: 2,
  avatarUrl: null, coverUrl: null, favoriteReleases: [], favoriteTracks: [],
  isOwnProfile: true, isFollowing: false, followsMe: false,
};
const review = {
  id: 10,
  author: { id: 37, username: 'listener' },
  releaseId: 5,
  trackId: null,
  rating: 3.75,
  text: 'Texto que debe conservarse',
  createdAt: '2026-01-02',
  editedAt: null,
  likeCount: 0,
  likedByMe: false,
};
const target = {
  type: 'release' as const,
  id: 5,
  name: 'Un proyecto',
  imageUrl: '/cover.jpg',
  artists: [{ id: 2, name: 'Artista' }],
};
const playlist = {
  id: 15,
  name: 'Mi playlist',
  author: { id: 37, username: 'listener', fullName: 'Una persona' },
  trackCount: 3,
  saveCount: 0,
  savedByMe: false,
  isOwnPlaylist: true,
};
const page = (data: unknown[], total = data.length, current = 1) => ({
  data,
  pagination: { page: current, pageSize: 6, total, totalPages: Math.ceil(total / 6) },
});

describe('OwnProfile', () => {
  const auth = { currentUser: signal<typeof user | null>(user) };
  let users: { getOwnProfile: ReturnType<typeof vi.fn> };
  let reviews: {
    getReviewsByAuthor: ReturnType<typeof vi.fn>;
    getReviewById: ReturnType<typeof vi.fn>;
  };
  let playlists: { getMine: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auth.currentUser.set(user);
    users = { getOwnProfile: vi.fn().mockReturnValue(of({ data: user })) };
    reviews = {
      getReviewsByAuthor: vi.fn().mockReturnValue(of(page([review], 19))),
      getReviewById: vi.fn().mockReturnValue(of({ data: { ...review, target } })),
    };
    playlists = { getMine: vi.fn().mockReturnValue(of(page([playlist], 8))) };
    TestBed.configureTestingModule({
      imports: [OwnProfile],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: UserService, useValue: users },
        { provide: ReviewService, useValue: reviews },
        { provide: PlaylistService, useValue: playlists },
      ],
    });
    TestBed.overrideComponent(OwnProfile, {
      remove: { imports: [Navbar] },
      add: { imports: [NavbarStub] },
    });
  });
  function render() {
    const fixture = TestBed.createComponent(OwnProfile);
    fixture.detectChanges();
    return fixture;
  }

  it('uses the session identity, total count and existing navigation destinations', () => {
    const fixture = render();
    expect(reviews.getReviewsByAuthor).toHaveBeenCalledWith(37, 1, 6);
    expect(playlists.getMine).toHaveBeenCalledWith(1, 6);
    expect(fixture.componentInstance.reviewsTotal()).toBe(19);
    expect(fixture.nativeElement.querySelector('.profile-stats dd').textContent).toBe('19');
    expect(fixture.nativeElement.querySelector('.edit-button').getAttribute('href')).toBe(
      '/profile/edit',
    );
    expect(fixture.nativeElement.querySelector('.playlist-card').getAttribute('href')).toBe(
      '/playlists/15',
    );
    expect(fixture.nativeElement.querySelector('.review-tile').getAttribute('href')).toBe(
      '/reviews/10',
    );
  });

  it('does not query content without a session', () => {
    auth.currentUser.set(null);
    const fixture = render();
    expect(fixture.componentInstance.errorMessage()).toContain('sesión');
    expect(users.getOwnProfile).not.toHaveBeenCalled();
    expect(reviews.getReviewsByAuthor).not.toHaveBeenCalled();
    expect(playlists.getMine).not.toHaveBeenCalled();
  });

  it('preserves profile retry and starts content only after profile success', () => {
    users.getOwnProfile.mockReturnValueOnce(throwError(() => new Error('offline')));
    const fixture = render();
    expect(fixture.componentInstance.errorMessage()).toContain('perfil');
    expect(playlists.getMine).not.toHaveBeenCalled();
    fixture.componentInstance.loadProfile();
    fixture.detectChanges();
    expect(fixture.componentInstance.profile()?.id).toBe(37);
    expect(playlists.getMine).toHaveBeenCalledTimes(1);
  });

  it('keeps review and profile visible after a playlist failure and retries only playlists', () => {
    playlists.getMine.mockReturnValueOnce(throwError(() => new Error('offline')));
    const fixture = render();
    expect(fixture.componentInstance.playlistsError()).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.review-tile')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Todavía no creaste');
    fixture.componentInstance.loadPlaylists();
    expect(fixture.componentInstance.playlistsError()).toBe('');
    expect(reviews.getReviewsByAuthor).toHaveBeenCalledTimes(1);
  });

  it('uses a dash after review failure and retries independently', () => {
    reviews.getReviewsByAuthor.mockReturnValueOnce(throwError(() => new Error('offline')));
    const fixture = render();
    expect(fixture.nativeElement.querySelector('.profile-stats dd').textContent).toBe('—');
    expect(fixture.nativeElement.querySelector('.playlist-card')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Todavía no escribiste');
    fixture.componentInstance.loadReviews();
    expect(fixture.componentInstance.reviewsTotal()).toBe(19);
    expect(playlists.getMine).toHaveBeenCalledTimes(1);
  });

  it('shows honest empty sections and ten noninteractive favorite slots', () => {
    reviews.getReviewsByAuthor.mockReturnValue(of(page([])));
    playlists.getMine.mockReturnValue(of(page([])));
    const fixture = render();
    expect(fixture.nativeElement.textContent).toContain('Todavía no creaste ninguna playlist');
    expect(fixture.nativeElement.textContent).toContain('Todavía no escribiste ninguna reseña');
    expect(fixture.componentInstance.reviewsTotal()).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.favorite-slot')).toHaveLength(10);
    expect(fixture.nativeElement.querySelectorAll('.favorites a, .favorites button')).toHaveLength(
      0,
    );
    expect(reviews.getReviewById).not.toHaveBeenCalled();
  });

  it('retains text, link and exact fractional rating when enrichment fails', () => {
    reviews.getReviewById.mockReturnValueOnce(throwError(() => new Error('offline')));
    const fixture = render();
    expect(fixture.nativeElement.querySelector('.review-tile').textContent).toContain(review.text);
    expect(fixture.nativeElement.querySelector('.rating').getAttribute('aria-label')).toBe(
      'Valoración: 3,75 de 5',
    );
    expect(fixture.nativeElement.querySelector('.stars span').style.width).toBe('75%');
    expect(fixture.componentInstance.hasUnavailableDetails()).toBe(true);
    fixture.componentInstance.retryDetails();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Un proyecto');
    expect(reviews.getReviewsByAuthor).toHaveBeenCalledTimes(1);
  });

  it('renders lists before enrichment completes and handles broken cover images', () => {
    const detail = new Subject<ReviewDetailResponse>();
    reviews.getReviewById.mockReturnValue(detail);
    const fixture = render();
    expect(fixture.componentInstance.reviewsLoading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain(review.text);
    detail.next({ message: '', data: { ...review, target } });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.review-art img').dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.review-art img')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(target.name);
  });

  it('bounds enrichment to six visible cards even for a long history', () => {
    const data = Array.from({ length: 8 }, (_, i) => ({ ...review, id: 10 + i }));
    reviews.getReviewsByAuthor.mockReturnValue(of(page(data, 200)));
    const fixture = render();
    expect(fixture.componentInstance.reviews()).toHaveLength(6);
    expect(reviews.getReviewById).toHaveBeenCalledTimes(6);
    expect(fixture.componentInstance.reviewsTotal()).toBe(200);
  });

  it('paginates independently and discards stale detail responses', () => {
    const oldDetail = new Subject<ReviewDetailResponse>();
    reviews.getReviewById.mockReturnValueOnce(oldDetail);
    const fixture = render();
    reviews.getReviewsByAuthor.mockReturnValue(of(page([{ ...review, id: 11 }], 19, 2)));
    fixture.componentInstance.loadReviews(2);
    expect(oldDetail.observed).toBe(false);
    expect(reviews.getReviewsByAuthor).toHaveBeenLastCalledWith(37, 2, 6);
    expect(fixture.componentInstance.reviews().map((card) => card.review.id)).toEqual([11]);
    expect(playlists.getMine).toHaveBeenCalledTimes(1);
    fixture.componentInstance.loadPlaylists(2);
    expect(playlists.getMine).toHaveBeenLastCalledWith(2, 6);
  });

  it('keeps loading states independent and cancels pending requests on destruction', () => {
    const pendingPlaylists = new Subject();
    const pendingReviews = new Subject();
    playlists.getMine.mockReturnValue(pendingPlaylists);
    reviews.getReviewsByAuthor.mockReturnValue(pendingReviews);
    const fixture = render();
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.reviewsLoading()).toBe(true);
    expect(fixture.componentInstance.playlistsLoading()).toBe(true);
    fixture.destroy();
    expect(pendingPlaylists.observed).toBe(false);
    expect(pendingReviews.observed).toBe(false);
  });
});
