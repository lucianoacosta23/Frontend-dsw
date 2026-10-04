import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';

import { CatalogService } from '../../../../core/services/catalog.service';
import { ReviewService } from '../../../../core/services/review.service';
import type { TrackDetail as TrackDetailData } from '../../../../models/catalog-details.js';
import type {
  CreateReviewRequest,
  ReviewListItem,
} from '../../../../models/review.js';
import { ReviewForm } from '../../../reviews/components/review-form/review-form';

@Component({
  imports: [ReviewForm],
  selector: 'app-track-detail',
  styleUrl: './track-detail.scss',
  templateUrl: './track-detail.html',
})
export class TrackDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(CatalogService);
  private readonly reviewService = inject(ReviewService);

  readonly track = signal<TrackDetailData | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly reviews = signal<ReviewListItem[]>([]);
  readonly reviewsLoading = signal(false);
  readonly reviewsError = signal<string | null>(null);

  readonly reviewSubmitting = signal(false);
  readonly reviewMessage = signal('');
  readonly reviewError = signal('');

  ngOnInit(): void {
    this.loadTrack();
  }

  // Carga la pista cuyo ID aparece en la URL.
  loadTrack(): void {
    const rawId = this.route.snapshot.paramMap.get('id');

    if (!rawId || !/^[1-9]\d*$/.test(rawId)) {
      this.errorMessage.set('El ID de la pista no es válido.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.catalog
      .getTrackById(Number(rawId))
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: response => {
          this.track.set(response.data);
          this.loadPopularReviews(response.data.id);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getErrorMessage(error));
        },
      });
  }

  // Pide al backend las reseñas de la pista ordenadas por popularidad.
  loadPopularReviews(trackId: number): void {
    this.reviewsLoading.set(true);
    this.reviewsError.set(null);

    this.reviewService
      .getPopularReviews('track', trackId)
      .pipe(finalize(() => this.reviewsLoading.set(false)))
      .subscribe({
        next: response => {
          this.reviews.set(response.data);
        },
        error: () => {
          this.reviewsError.set('No pudimos cargar las reseñas.');
        },
      });
  }

  // Envía al backend la reseña recibida desde el formulario.
  createReview(request: CreateReviewRequest): void {
    this.reviewSubmitting.set(true);
    this.reviewMessage.set('');
    this.reviewError.set('');

    this.reviewService.createReview(request).subscribe({
      next: response => {
        this.reviewMessage.set(
          response.message || 'Reseña publicada correctamente.',
        );
        this.reviewSubmitting.set(false);

        const trackId = this.track()?.id;
        if (trackId !== undefined) {
          this.loadPopularReviews(trackId);
        }
      },
      error: (error: unknown) => {
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
        return 'No encontramos esa pista.';
      }
    }

    return 'No pudimos cargar la pista. Intentá nuevamente.';
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