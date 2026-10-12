import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';

import { ReviewService } from '../../../../core/services/review.service.js';
import type { ReviewDetailData } from '../../../../models/review.js';
import { Navbar } from '../../../../shared/components/navbar/navbar.js';
import { ReviewCard } from '../../components/review-card/review-card.js';

@Component({
  selector: 'app-review-detail',
  imports: [Navbar, RouterLink, DatePipe, ReviewCard],
  templateUrl: './review-detail.html',
  styleUrl: './review-detail.scss',
})
export class ReviewDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reviewService = inject(ReviewService);
  private readonly destroyRef = inject(DestroyRef);

  private request: Subscription | undefined;

  readonly review = signal<ReviewDetailData | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    // También carga otra reseña si cambia el ID dentro de esta ruta.
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadReview());
  }

  loadReview(): void {
    this.request?.unsubscribe();
    this.review.set(null);
    this.errorMessage.set(null);

    const rawId = this.route.snapshot.paramMap.get('id');
    const id = Number(rawId);

    if (
      !rawId ||
      !/^[1-9]\d*$/.test(rawId) ||
      !Number.isSafeInteger(id) ||
      id > 2147483647
    ) {
      this.errorMessage.set('El ID de la reseña no es válido.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);

    this.request = this.reviewService.getReviewById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: response => this.review.set(response.data),
        error: (error: unknown) => {
          let message = 'No pudimos cargar la reseña. Intentá nuevamente.';

          if (error instanceof HttpErrorResponse) {
            if (error.status === 404) {
              message = 'Esta reseña no existe o fue dada de baja.';
            } else if (error.status === 0) {
              message = 'No pudimos conectar con el servidor.';
            } else if (error.status === 401) {
              message = 'Iniciá sesión para continuar.';
            }
          }

          this.errorMessage.set(message);
        },
      });
  }
}