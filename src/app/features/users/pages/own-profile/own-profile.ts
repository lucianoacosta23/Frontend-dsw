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
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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
  private readonly http = inject(HttpClient);
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

  // Signal para almacenar las carátulas por ID de playlist
  readonly playlistCovers = signal<Record<string | number, string[]>>({});

  isOwner(): boolean {
    return this.publicUsername === null || this.profile()?.isOwnProfile === true;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['publicUsername'] && !changes['publicUsername'].firstChange) {
      this.loadProfile();
    }
  }

  ngOnInit(): void {
    if (this.publicUsername !== null) {
      this.sessionRequest = this.auth
        .loadSession()
        .pipe(catchError(() => of(null)))
        .subscribe();
    }
    this.loadProfile();
  }

  getCovers(playlist: any): string[] {
    if (!playlist) return [];
    const id = playlist.id;
    if (id !== undefined && id !== null && this.playlistCovers()[id]?.length) {
      return this.playlistCovers()[id];
    }
    if (playlist.covers?.length) return playlist.covers;
    if (playlist.coverUrls?.length) return playlist.coverUrls;
    if (playlist.imageUrl) return [playlist.imageUrl];
    if (playlist.coverUrl) return [playlist.coverUrl];
    if (playlist.tracks?.length) {
      return playlist.tracks
        .map((t: any) => t.track?.release?.imageUrl || t.release?.imageUrl || t.imageUrl || t.coverUrl)
        .filter(Boolean);
    }
    return [];
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

    const service = this.playlistService as any;

    // Busca cualquier método que tenga el servicio o usa HTTP directo
    const serviceMethod =
      service.getPlaylistsByAuthor?.bind(service) ||
      service.getPlaylistsByUser?.bind(service) ||
      service.getPlaylistsByUserId?.bind(service) ||
      service.getAuthorPlaylists?.bind(service) ||
      service.getUserPlaylists?.bind(service) ||
      service.getOwnPlaylists?.bind(service) ||
      service.getPlaylists?.bind(service) ||
      service.getByAuthor?.bind(service) ||
      service.getByUser?.bind(service);

    let request$: Observable<any>;

    if (serviceMethod) {
      request$ = serviceMethod(this.authorId, page, this.pageSize);
    } else {
      request$ = this.http
        .get<any>(`/playlists?authorId=${this.authorId}&page=${page}&limit=${this.pageSize}`)
        .pipe(
          catchError(() =>
            this.http.get<any>(
              `/api/playlists?authorId=${this.authorId}&page=${page}&limit=${this.pageSize}`,
            ),
          ),
          catchError(() => this.http.get<any>(`/playlists/author/${this.authorId}`)),
          catchError(() => this.http.get<any>(`/api/playlists/author/${this.authorId}`)),
        );
    }

    this.playlistRequest = request$
      .pipe(finalize(() => this.playlistsLoading.set(false)))
      .subscribe({
        next: (response: any) => {
          const items: OwnPlaylistItem[] =
            response?.data || response?.items || (Array.isArray(response) ? response : []);

          this.playlists.set(items);

          if (response?.pagination) {
            this.playlistsTotal.set(response.pagination.total ?? items.length);
            this.playlistsPage.set(response.pagination.page ?? page);
            this.playlistsPages.set(response.pagination.totalPages ?? 1);
          } else {
            this.playlistsTotal.set(items.length);
            this.playlistsPages.set(1);
          }

          this.enrichPlaylistCovers(items);
        },
        error: () => {
          this.playlistsError.set('No pudimos cargar tus playlists. Intentá nuevamente.');
        },
      });
  }

  private enrichPlaylistCovers(items: OwnPlaylistItem[]): void {
    const service = this.playlistService as any;

    items.forEach((playlist: any) => {
      const pId = playlist.id;
      if (!pId) return;

      const directCovers = this.getCovers(playlist);
      if (directCovers.length > 0) {
        this.playlistCovers.update((current) => ({
          ...current,
          [pId]: directCovers,
        }));
        return;
      }

      const getSingleMethod =
        service.getPlaylist?.bind(service) ||
        service.getPlaylistById?.bind(service) ||
        service.getById?.bind(service);

      let single$: Observable<any>;
      if (getSingleMethod) {
        single$ = getSingleMethod(pId);
      } else {
        single$ = this.http
          .get<any>(`/playlists/${pId}`)
          .pipe(catchError(() => this.http.get<any>(`/api/playlists/${pId}`)));
      }

      single$.subscribe({
        next: (res: any) => {
          const data = res?.data || res;
          const tracks = data?.tracks || [];
          const covers = tracks
            .map(
              (t: any) =>
                t.track?.release?.imageUrl || t.release?.imageUrl || t.imageUrl || t.coverUrl,
            )
            .filter(Boolean)
            .slice(0, 4);

          if (covers.length > 0) {
            this.playlistCovers.update((current) => ({
              ...current,
              [pId]: covers,
            }));
          }
        },
        error: () => {},
      });
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