import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ReviewReportsDialog } from '../../components/review-reports-dialog/review-reports-dialog.js';

import { ReportService } from '../../../../core/services/report.service.js';
import type { CriticalReview, ReportDecision } from '../../../../models/report.js';
import { Navbar } from '../../../../shared/components/navbar/navbar.js';

@Component({
  selector: 'app-admin-critical-reviews',
  standalone: true,
  imports: [Navbar, RouterLink],
  templateUrl: './admin-critical-reviews.html',
  styleUrl: './admin-critical-reviews.scss',
})
export class AdminCriticalReviews implements OnInit {
  private readonly reportService = inject(ReportService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  readonly minorReports = inject(ActivatedRoute, { optional: true })?.snapshot.data['minorReports'] === true;
  readonly title = this.minorReports ? 'Moderación de Reportes Menores' : 'Moderación de Reseñas Críticas';
  readonly description = this.minorReports
    ? 'Reseñas que acumulan 1 o 2 reportes pendientes de la comunidad.'
    : 'Reseñas que acumulan 3 o más reportes pendientes de la comunidad.';

  readonly criticalReviews = signal<CriticalReview[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly actionError = signal('');
  readonly successMessage = signal('');
  readonly processingId = signal<number | null>(null);

  ngOnInit() {
    this.loadCriticalReviews();
  }

  loadCriticalReviews() {
    if (this.loading() || this.processingId() !== null) return;
    this.loading.set(true);
    this.loadError.set('');

    const request = this.minorReports
      ? this.reportService.getMinorReviews()
      : this.reportService.getCriticalReviews();
    request.pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: response => this.criticalReviews.set(response.data),
      error: () => this.loadError.set('No se pudieron cargar las reseñas reportadas. Intentá nuevamente.'),
    });
  }

  openReports(review: CriticalReview) {
    if (this.processingId() !== null) return;
    this.dialog.open(ReviewReportsDialog, {
      data: review,
      width: '680px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      ariaLabel: `Reportes de la reseña de ${review.author.username}`,
    });
  }

  deleteReview(reviewId: number) {
    this.moderateReview(reviewId, 'REMOVE_REVIEW');
  }

  dismissReports(reviewId: number) {
    this.moderateReview(reviewId, 'DISMISS');
  }

  private moderateReview(reviewId: number, decision: ReportDecision) {
    if (this.processingId() !== null || this.loading()) return;
    const confirmation = decision === 'DISMISS'
      ? '¿Ignorar todos los reportes pendientes de esta reseña? La reseña seguirá publicada.'
      : '¿Dar de baja esta reseña? Dejará de estar publicada y sus reportes pendientes quedarán resueltos.';
    if (!confirm(confirmation)) return;

    this.processingId.set(reviewId);
    this.actionError.set('');
    this.successMessage.set('');

    this.reportService.moderateReview(reviewId, decision).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.processingId.set(null)),
    ).subscribe({
      next: response => {
        this.criticalReviews.update(reviews => reviews.filter(review => review.id !== reviewId));
        this.successMessage.set(response.message);
      },
      error: (error: HttpErrorResponse) => {
        this.actionError.set(
          typeof error.error?.message === 'string'
            ? error.error.message
            : 'No se pudo completar la acción. Intentá nuevamente.',
        );
        if (error.status === 409 || error.status === 404) {
          this.processingId.set(null);
          this.loadCriticalReviews();
        }
      },
    });
  }
}
