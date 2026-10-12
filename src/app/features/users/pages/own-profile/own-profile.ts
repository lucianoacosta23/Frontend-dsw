import { DatePipe } from '@angular/common';
import {
  Component,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  catchError,
  finalize,
  from,
  map,
  mergeMap,
  Observable,
  of,
  Subscription,
  switchMap,
} from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ProfileImage } from '../../../../shared/components/profile-image/profile-image';
import { AuthService } from '../../../../core/services/auth.service.js';
import { UserService } from '../../../../core/services/user-service.js';
import {
  PlaylistService,
  type OwnPlaylistItem,
} from '../../../../core/services/playlist.service.js';
import { ReviewService } from '../../../../core/services/review.service.js';
import type { UserProfile as UserProfileData } from '../../../../models/user-profile.js';
import type { ReviewListItem, ReviewDetailData } from '../../../../models/review.js';
import { Navbar } from '../../../../shared/components/navbar/navbar.js';

interface ProfileReview {
  review: ReviewListItem;
  target: ReviewDetailData['target'] | null;
  pending: boolean;
  unavailable: boolean;
  brokenImage: boolean;
}

@Component({
  selector: 'app-own-profile',
  imports: [Navbar, RouterLink, DatePipe, ProfileImage],
  templateUrl: './own-profile.html',
  styleUrls: ['./own-profile.scss', './profile-media.scss'],
})
export class OwnProfile implements OnInit, OnChanges, OnDestroy {
  @Input() publicUsername: string | null = null;
  readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly playlistService = inject(PlaylistService);
  private readonly reviewService = inject(ReviewService);
  private request?: Subscription;
  private playlistRequest?: Subscription;
  private reviewRequest?: Subscription;
  private detailRequest?: Subscription;
  private sessionRequest?: Subscription;
  private followRequest?: Subscription;
  private authorId: number | null = null;

  readonly pageSize = 6;
  readonly favoriteSlots = [1, 2, 3, 4, 5];
  readonly profile = signal<UserProfileData | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly playlists = signal<OwnPlaylistItem[]>([]);
  readonly playlistsLoading = signal(false);
  readonly playlistsError = signal('');
  readonly playlistsPage = signal(1);
  readonly playlistsPages = signal(0);
  readonly playlistsTotal = signal<number | null>(null);
  readonly reviews = signal<ProfileReview[]>([]);
  readonly reviewsLoading = signal(false);
  readonly reviewsError = signal('');
  readonly reviewsPage = signal(1);
  readonly reviewsPages = signal(0);
  readonly reviewsTotal = signal<number | null>(null);
  readonly followSubmitting = signal(false);
  readonly followError = signal('');

  isOwner(): boolean {
    return this.publicUsername === null || this.profile()?.isOwnProfile === true;
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['publicUsername'] && !changes['publicUsername'].firstChange) this.loadProfile();
  }

  ngOnInit(): void {
    if (this.publicUsername !== null) {
      // Optional session enriches navigation; a 401 never redirects the public route.
      this.sessionRequest = this.auth
        .loadSession()
        .pipe(catchError(() => of(null)))
        .subscribe();
    }
    this.loadProfile();
  }

  loadProfile(): void {
    this.cancelRequests();
    this.authorId = null;
    this.profile.set(null);
    this.errorMessage.set('');
    this.followError.set('');
    this.playlists.set([]);
    this.reviews.set([]);
    this.reviewsTotal.set(null);
    this.playlistsTotal.set(null);
    this.reviewsPages.set(0);
    this.playlistsPages.set(0);
    const user = this.auth.currentUser();
    if (!user && this.publicUsername === null) {
      this.loading.set(false);
      this.errorMessage.set('No pudimos recuperar tu sesión.');
      return;
    }
    const request =
      this.publicUsername === null
        ? this.userService.getOwnProfile()
        : this.userService
            .getProfileByUsername(this.publicUsername)
            .pipe(switchMap((response) => this.userService.getProfileById(response.data.id)));
    this.loading.set(true);
    this.request = request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (response) => {
        this.authorId = response.data.id;
        this.profile.set(response.data);
        this.loadPlaylists(1);
        this.loadReviews(1);
      },
      error: (error: unknown) =>
        this.errorMessage.set(
          error instanceof HttpErrorResponse && error.status === 404
            ? 'No encontramos ese usuario.'
            : 'No pudimos cargar el perfil. Intentá nuevamente.',
        ),
    });
  }

  loadPlaylists(page = this.playlistsPage()): void {
    if (this.authorId === null) return;
    this.playlistRequest?.unsubscribe();
    this.playlistsPage.set(page);
    this.playlistsLoading.set(true);
    this.playlistsError.set('');
    this.playlists.set([]);
    this.playlistsTotal.set(null);
    const request =
      this.publicUsername === null
        ? this.playlistService.getMine(page, this.pageSize)
        : this.playlistService.getByAuthor(this.authorId, page, this.pageSize);
    this.playlistRequest = request
      .pipe(finalize(() => this.playlistsLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.playlists.set(response.data);
          this.playlistsTotal.set(response.pagination.total);
          this.playlistsPage.set(response.pagination.page);
          this.playlistsPages.set(response.pagination.totalPages);
        },
        error: () =>
          this.playlistsError.set('No pudimos cargar tus playlists. Intentá nuevamente.'),
      });
  }

  loadReviews(page = this.reviewsPage()): void {
    if (this.authorId === null) return;
    this.reviewRequest?.unsubscribe();
    this.detailRequest?.unsubscribe();
    this.reviewsPage.set(page);
    this.reviewsLoading.set(true);
    this.reviewsError.set('');
    this.reviews.set([]);
    this.reviewsTotal.set(null);
    this.reviewRequest = this.reviewService
      .getReviewsByAuthor(this.authorId, page, this.pageSize)
      .pipe(finalize(() => this.reviewsLoading.set(false)))
      .subscribe({
        next: (response) => {
          // Enrich only the bounded visible page; the list stays usable while details load.
          this.reviews.set(
            response.data.slice(0, this.pageSize).map((review) => ({
              review,
              target: null,
              pending: true,
              unavailable: false,
              brokenImage: false,
            })),
          );
          this.reviewsTotal.set(response.pagination.total);
          this.reviewsPage.set(response.pagination.page);
          this.reviewsPages.set(response.pagination.totalPages);
          this.enrichReviews(this.reviews().map((card) => card.review.id));
        },
        error: () => this.reviewsError.set('No pudimos cargar tus reseñas. Intentá nuevamente.'),
      });
  }

  private enrichReviews(ids: number[]): void {
    this.detailRequest?.unsubscribe();
    this.detailRequest = from(ids)
      .pipe(
        mergeMap(
          (id) =>
            this.reviewService.getReviewById(id).pipe(
              map((response) => ({ id, target: response.data.target })),
              catchError(() => of({ id, target: null })),
            ),
          3,
        ),
      )
      .subscribe(({ id, target }) => {
        this.reviews.update((cards) =>
          cards.map((card) =>
            card.review.id === id
              ? { ...card, target, pending: false, unavailable: target === null }
              : card,
          ),
        );
      });
  }

  retryDetails(): void {
    const ids = this.reviews()
      .filter((card) => card.unavailable)
      .map((card) => card.review.id);
    if (this.reviews().some((card) => card.pending)) return;
    this.reviews.update((cards) =>
      cards.map((card) =>
        ids.includes(card.review.id) ? { ...card, pending: true, unavailable: false } : card,
      ),
    );
    this.enrichReviews(ids);
  }
  hasUnavailableDetails(): boolean {
    return this.reviews().some((card) => card.unavailable);
  }
  detailsPending(): boolean {
    return this.reviews().some((card) => card.pending);
  }
  imageFailed(id: number): void {
    this.reviews.update((cards) =>
      cards.map((card) => (card.review.id === id ? { ...card, brokenImage: true } : card)),
    );
  }
  ratingLabel(rating: number): string {
    return String(rating).replace('.', ',');
  }
  starWidth(rating: number): number {
    return Math.min(100, Math.max(0, rating * 20));
  }
  artists(card: ProfileReview): string {
    return card.target?.artists.map((artist) => artist.name).join(', ') ?? '';
  }
  private cancelRequests(): void {
    this.request?.unsubscribe();
    this.playlistRequest?.unsubscribe();
    this.reviewRequest?.unsubscribe();
    this.detailRequest?.unsubscribe();
    this.followRequest?.unsubscribe();
  }
  followUser(): void {
    const profile = this.profile();
    if (!profile || this.isOwner() || !this.auth.currentUser() || this.followSubmitting()) return;
    this.followSubmitting.set(true);
    this.followError.set('');
    const request: Observable<unknown> = profile.isFollowing
      ? this.userService.unfollowUser(profile.id)
      : this.userService.followUser(profile.id);
    this.followRequest = request
      .pipe(
        switchMap(() => this.userService.getProfileById(profile.id)),
        finalize(() => this.followSubmitting.set(false)),
      )
      .subscribe({
        next: (response) => this.profile.set(response.data),
        error: () =>
          this.followError.set('No pudimos actualizar el seguimiento. Intentá nuevamente.'),
      });
  }
  ngOnDestroy(): void {
    this.cancelRequests();
    this.sessionRequest?.unsubscribe();
  }
}
