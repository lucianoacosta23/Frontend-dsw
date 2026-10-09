import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RatingStats } from '../../../reviews/components/rating-stats/rating-stats.js';
import { CatalogService } from '../../../../core/services/catalog.service';
import { ReviewService } from '../../../../core/services/review.service';
import type { ReleaseDetail as ReleaseDetailData } from '../../../../models/catalog-details.js';
import type {
  CreateReviewRequest,
  ReviewListItem,
} from '../../../../models/review.js';
import { ReviewForm } from '../../../reviews/components/review-form/review-form';
import { ReviewCard } from '../../../reviews/components/review-card/review-card';
import { Navbar } from '../../../../shared/components/navbar/navbar.js';

@Component({
  imports: [ReviewForm, ReviewCard, RouterLink, RatingStats, Navbar],
  selector: 'app-release-detail',
  styleUrl: './release-detail.scss',
  templateUrl: './release-detail.html',
})
export class ReleaseDetail implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private catalogRequest?: Subscription;
  private reviewsRequest?: Subscription;
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(CatalogService);
  private readonly reviewService = inject(ReviewService);

  readonly release = signal<ReleaseDetailData | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly reviews = signal<ReviewListItem[]>([]);
  readonly reviewsLoading = signal(false);
  readonly reviewsError = signal<string | null>(null);

  readonly reviewsPage = signal(0);
  readonly reviewsTotal = signal(0);
  readonly reviewsTotalPages = signal(0);
  readonly reviewsMoreError = signal<string | null>(null);

  readonly reviewSubmitting = signal(false);
  readonly reviewMessage = signal('');
  readonly reviewError = signal('');
readonly ratingStatsRefreshKey = signal(0);
  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadRelease());
  }

  // Carga el lanzamiento cuyo ID aparece en la URL.
  loadRelease(): void {
    this.catalogRequest?.unsubscribe();
    this.reviewsRequest?.unsubscribe();
    this.release.set(null);
    this.reviews.set([]);
    this.reviewsPage.set(0);
    this.reviewsTotal.set(0);
    this.reviewsTotalPages.set(0);
    this.reviewsError.set(null);
    this.reviewsMoreError.set(null);
    this.reviewMessage.set('');
    this.reviewError.set('');
    const rawId = this.route.snapshot.paramMap.get('id');

    if (!rawId || !/^[1-9]\d*$/.test(rawId)) {
      this.errorMessage.set('El ID del lanzamiento no es válido.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.catalogRequest = this.catalog
      .getReleaseById(Number(rawId))
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: response => {
          this.release.set(response.data);
          this.loadPopularReviews(response.data.id);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getErrorMessage(error));
        },
      });
  }

  // Pide al backend las reseñas del lanzamiento ordenadas por popularidad.
  loadPopularReviews(releaseId: number): void {
    this.reviewsRequest?.unsubscribe();
    this.reviews.set([]);
    this.reviewsPage.set(0);
    this.reviewsTotal.set(0);
    this.reviewsTotalPages.set(0);
    this.fetchReviews(releaseId, 1);
  }

  loadMoreReviews(): void {
    const item = this.release();
    if (!item || this.reviewsLoading() ||
        this.reviewsPage() >= this.reviewsTotalPages()) return;
    this.fetchReviews(item.id, this.reviewsPage() + 1);
  }

  private fetchReviews(targetId: number, page: number): void {
    this.reviewsLoading.set(true);
    this.reviewsError.set(null);
    this.reviewsMoreError.set(null);

    this.reviewsRequest = this.reviewService
      .getPopularReviews('release', targetId, page, 10)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.reviewsLoading.set(false)),
      )
      .subscribe({
        next: response => {
          // Evita repetir tarjetas si cambia el ranking entre consultas.
          this.reviews.update(current => {
            const seen = new Set(current.map(review => review.id));
            return [...current, ...response.data.filter(review => !seen.has(review.id))];
          });
          this.reviewsPage.set(response.pagination.page);
          this.reviewsTotal.set(response.pagination.total);
          this.reviewsTotalPages.set(response.pagination.totalPages);
        },
        error: () => {
          if (page === 1) {
            this.reviewsError.set('No pudimos cargar las reseñas.');
          } else {
            this.reviewsMoreError.set('No pudimos cargar más reseñas. Intentá nuevamente.');
          }
        },
      });
  }

  // Envía al backend la reseña recibida desde el formulario.
  createReview(request: CreateReviewRequest): void {
    if (this.reviewSubmitting()) return;
    const submittedTargetId = this.release()?.id;
    this.reviewSubmitting.set(true);
    this.reviewMessage.set('');
    this.reviewError.set('');

    this.reviewService.createReview(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: response => {
        this.reviewSubmitting.set(false);
        if (this.release()?.id !== submittedTargetId) return;
        this.reviewMessage.set(
          response.message || 'Reseña publicada correctamente.',
        );
        this.reviewSubmitting.set(false);

        const releaseId = this.release()?.id;
        if (releaseId !== undefined) {
          this.loadPopularReviews(releaseId);
          this.ratingStatsRefreshKey.update(value => value + 1);
        }
      },
      error: (error: unknown) => {
        this.reviewSubmitting.set(false);
        if (this.release()?.id !== submittedTargetId) return;
        this.reviewError.set(this.getReviewErrorMessage(error));
        this.reviewSubmitting.set(false);
      },
    });
  }

  // Traduce los errores del catálogo a mensajes entendibles.
  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No pudimos conectar con el catálogo. Revisá que el backend esté iniciado.';
      }

      if (error.status === 404) {
        return 'No encontramos ese lanzamiento.';
      }
    }

    return 'No pudimos cargar el lanzamiento. Intentá nuevamente.';
  }

  // Usa el mensaje del backend cuando está disponible.
  private getReviewErrorMessage(error: unknown): string {
    if (
      error instanceof HttpErrorResponse &&
      typeof error.error?.message === 'string'
    ) {
      return error.error.message;
    }

    return 'No se pudo publicar la reseña. Intentá nuevamente.';
  }
}
