import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { ReportService } from '../../../../core/services/report.service.js';
import type { CriticalReview, ReportReason, ReportStatus, ReviewReportItem } from '../../../../models/report.js';

@Component({
  selector: 'app-review-reports-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule],
  templateUrl: './review-reports-dialog.html',
  styleUrl: './review-reports-dialog.scss',
})
export class ReviewReportsDialog implements OnInit {
  readonly review = inject<CriticalReview>(MAT_DIALOG_DATA);
  private readonly service = inject(ReportService);
  private readonly destroyRef = inject(DestroyRef);
  readonly reports = signal<ReviewReportItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly reasons: Record<ReportReason, string> = {
    SPAM: 'Spam', HARASSMENT: 'Acoso', HATE_SPEECH: 'Discurso de odio',
    INAPPROPRIATE_CONTENT: 'Contenido inapropiado', SPOILER: 'Spoiler', OTHER: 'Otro motivo',
  };
  readonly statuses: Record<ReportStatus, string> = {
    PENDING: 'Pendiente', DISMISSED: 'Descartado', ACTIONED: 'Resuelto con baja',
  };

  ngOnInit() {
    this.loadReports();
  }

  reasonLabel(reason: ReportReason): string {
    return this.reasons[reason];
  }

  statusLabel(status: ReportStatus): string {
    return this.statuses[status];
  }

  loadReports() {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.service.getReviewReports(this.review.id).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: response => this.reports.set(response.data),
      error: () => this.error.set('No se pudieron cargar los reportes. Intentá nuevamente.'),
    });
  }
}
