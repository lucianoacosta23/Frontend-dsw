import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal, Input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environments.js';
import { CatalogService } from '../../../../core/services/catalog.service';
import { ReviewService } from '../../../../core/services/review.service';
import type { PopularAlbum } from '../../../../models/popular-album.js';
import type { PopularTrackItem } from '../../../../models/popular-tracks.js';
import type { ReviewListItem } from '../../../../models/review.js';
import type { RatingStatsData } from '../../../../models/rating-stats.js';
import { ReviewCard } from '../../../reviews/components/review-card/review-card';
import { ReleaseCover } from '../../components/release-cover/release-cover';
import { PopularCarousel } from '../../components/popular-carousel/popular-carousel';
import { DashboardService } from '../../../../core/services/dashboard.service.js';
import type {
  PopularPlaylist,
  PopularReview,
} from '../../../../models/dashboard.js';
import { Navbar } from '../../../../shared/components/navbar/navbar.js';
@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrls: ['./home.scss', './home-hero.scss', './home-social.scss'],
  imports: [RouterLink, ReviewCard, ReleaseCover, PopularCarousel, Navbar],
})
export class Home implements OnInit {
  private readonly catalog = inject(CatalogService);
  private readonly reviewService = inject(ReviewService);
  private readonly destroyRef = inject(DestroyRef);
  private catalogRequest?: Subscription;
  private reviewsRequest?: Subscription;
  private statsRequest?: Subscription;
  private tracksRequest?: Subscription;

  readonly spotifyLoginUrl = `${environment.apiBaseUrl}/auth/spotify/login?returnUrl=${encodeURIComponent('/dashboard')}`;
  readonly albums = signal<PopularAlbum[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly featured = signal<PopularAlbum | null>(null);
  readonly reviews = signal<ReviewListItem[]>([]);
  readonly reviewsLoading = signal(false);
  readonly reviewsError = signal<string | null>(null);
  readonly stats = signal<RatingStatsData | null>(null);
  readonly statsLoading = signal(false);
  readonly statsError = signal<string | null>(null);
  readonly tracks = signal<PopularTrackItem[]>([]);
  readonly tracksLoading = signal(true);
  readonly tracksErrorMessage = signal<string | null>(null);
  readonly auth = inject(AuthService);
readonly sessionLoading = signal(false);
readonly sessionError = signal<string | null>(null);

get canAccess(): boolean {
  return this.auth.currentUser() !== null;
}

loadPublicSession(): void {
  this.sessionLoading.set(true);
  this.sessionError.set(null);

  this.auth.loadSession()
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.sessionLoading.set(false)),
    )
    .subscribe({
      error: (error: unknown) => {
        // Sin sesión es un estado normal de la portada.
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return;
        }

        this.sessionError.set(
          'No pudimos verificar tu sesión. Intentá nuevamente.',
        );
      },
    });
}

  @Input() privateHome = false;

private readonly dashboardService = inject(DashboardService);

readonly popularPlaylists = signal<PopularPlaylist[]>([]);
readonly playlistsLoading = signal(false);
readonly playlistsError = signal<string | null>(null);

readonly popularReviews = signal<PopularReview[]>([]);
readonly popularReviewsLoading = signal(false);
readonly popularReviewsError = signal<string | null>(null);

ngOnInit(): void {
  this.loadPopularAlbums();
  this.loadPopularTracks();

  if (this.privateHome) {
    this.loadPopularPlaylists();
    this.loadPopularReviews();
  } else {
    this.loadPublicSession();
  }
}
  loadPopularAlbums(): void {
    this.catalogRequest?.unsubscribe();
    this.reviewsRequest?.unsubscribe();
    this.statsRequest?.unsubscribe();
    this.loading.set(true);
    this.errorMessage.set(null);
    this.featured.set(null);
    this.reviews.set([]);
    this.stats.set(null);
    this.reviewsError.set(null);
    this.statsError.set(null);
    this.catalogRequest = this.catalog
      .getPopularAlbums(10)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.albums.set(response.data);
          this.featured.set(response.data[0] ?? null);
          if (this.featured()) {
            this.loadFeaturedReviews();
            this.loadFeaturedStats();
          }
        },
        error: (error: unknown) => {
          this.albums.set([]);
          this.errorMessage.set(this.getErrorMessage(error, 'los álbumes populares'));
        },
      });
  }

loadPopularPlaylists(): void {
  if (!this.privateHome || this.playlistsLoading()) return;

  this.playlistsLoading.set(true);
  this.playlistsError.set(null);

  this.dashboardService.getPlaylists()
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.playlistsLoading.set(false)),
    )
    .subscribe({
      next: response => {
        this.popularPlaylists.set(response.data);
      },
      error: () => {
        this.playlistsError.set(
          'No pudimos cargar las playlists. Intentá nuevamente.',
        );
      },
    });
}

loadPopularReviews(): void {
  if (!this.privateHome || this.popularReviewsLoading()) return;

  this.popularReviewsLoading.set(true);
  this.popularReviewsError.set(null);

  this.dashboardService.getReviews()
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.popularReviewsLoading.set(false)),
    )
    .subscribe({
      next: response => {
        this.popularReviews.set(response.data);
      },
      error: () => {
        this.popularReviewsError.set(
          'No pudimos cargar las reseñas populares. Intentá nuevamente.',
        );
      },
    });
}



  loadFeaturedReviews(): void {
    const release = this.featured();
    if (!release) return;
    this.reviewsRequest?.unsubscribe();
    this.reviewsLoading.set(true);
    this.reviewsError.set(null);
    this.reviewsRequest = this.reviewService
      .getPopularReviews('release', release.id, 1, 2)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.reviewsLoading.set(false)),
      )
      .subscribe({
        next: (response) => this.reviews.set(response.data.slice(0, 2)),
        error: () => this.reviewsError.set('No pudimos cargar las reseñas destacadas.'),
      });
  }

  loadFeaturedStats(): void {
    const release = this.featured();
    if (!release) return;
    this.statsRequest?.unsubscribe();
    this.statsLoading.set(true);
    this.statsError.set(null);
    this.statsRequest = this.reviewService
      .getRatingStats('release', release.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.statsLoading.set(false)),
      )
      .subscribe({
        next: (response) => this.stats.set(response.data),
        error: () => this.statsError.set('Promedio no disponible.'),
      });
  }

  loadPopularTracks(): void {
    this.tracksRequest?.unsubscribe();
    this.tracksLoading.set(true);
    this.tracksErrorMessage.set(null);
    this.tracksRequest = this.catalog
      .getPopularTracks(10)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.tracksLoading.set(false)),
      )
      .subscribe({
        next: (response) => this.tracks.set(response.data),
        error: (error: unknown) =>
          this.tracksErrorMessage.set(this.getErrorMessage(error, 'las pistas populares')),
      });
  }

  averageLabel(): string | null {
    const average = this.stats()?.averageRating;
    return typeof average === 'number' && Number.isFinite(average)
      ? average.toLocaleString('es-AR', { maximumFractionDigits: 1 })
      : null;
  }

  artistsLabel(item: { artists: { name: string }[] }): string {
    return item.artists.map((artist) => artist.name).join(', ') || 'Artista desconocido';
  }

  releaseYear(album: PopularAlbum): string {
    return album.releaseDate.slice(0, 4);
  }

  releaseType(album: PopularAlbum): string {
    return (
      {
        ALBUM: 'Álbum',
        EP: 'EP',
        SINGLE: 'Single',
        MIXTAPE: 'Mixtape',
        COMPILATION: 'Compilación',
      }[album.type] ?? album.type
    );
  }

  private getErrorMessage(error: unknown, content: string): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'No pudimos conectar con el catálogo. Revisá que el backend esté iniciado.';
    }
    return `No pudimos cargar ${content}. Intentá nuevamente.`;
  }
}
