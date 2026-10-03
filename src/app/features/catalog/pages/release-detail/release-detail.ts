import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';

import { ReviewService } from '../../../../core/services/review.service';
import { CatalogService } from '../../../../core/services/catalog.service';
import { ReviewForm } from '../../../reviews/components/review-form/review-form';
import type { CreateReviewRequest } from '../../../../models/review.js';
import type { ReleaseDetail as ReleaseDetailData } from '../../../../models/catalog-details.js';

@Component({
  imports: [ReviewForm],
  selector: 'app-release-detail',
  styleUrl: './release-detail.scss',
  templateUrl: './release-detail.html',
})
export class ReleaseDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(CatalogService);
  private readonly reviewService = inject(ReviewService);

  readonly release = signal<ReleaseDetailData | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly reviewSubmitting = signal(false);
  readonly reviewMessage = signal('');
  readonly reviewError = signal('');

  ngOnInit(): void {
    this.loadRelease();
  }

  // Carga el lanzamiento cuyo ID aparece en la URL.
  loadRelease(): void {
    const rawId = this.route.snapshot.paramMap.get('id');

    if (!rawId || !/^[1-9]\d*$/.test(rawId)) {
      this.errorMessage.set('El ID del lanzamiento no es válido.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.catalog
      .getReleaseById(Number(rawId))
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: response => this.release.set(response.data),
        error: (error: unknown) => {
          this.errorMessage.set(this.getErrorMessage(error));
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