import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { AdminUsersService } from '../../../../core/services/admin-users.service.js';
import type { UserReportedReview } from '../../../../models/admin-users.js';
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
  readonly data = inject<CriticalReview | { kind: 'user'; userId: number; username: string }>(MAT_DIALOG_DATA);
  readonly userMode = 'kind' in this.data;
  readonly userName = 'kind' in this.data ? this.data.username : '';
  readonly review = 'kind' in this.data ? null : this.data;
  private readonly usersService = inject(AdminUsersService);
  readonly groups = signal<UserReportedReview[]>([]);
  readonly page = signal(0);
  readonly pages = signal(0);
  readonly total = signal(0);
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
    if ('kind' in this.data) {
      this.loadUserReports(this.page() + 1);
      return;
    }
    this.service.getReviewReports(this.data.id).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: response => this.reports.set(response.data),
      error: () => this.error.set('No se pudieron cargar los reportes. Intentá nuevamente.'),
    });
  }
  private loadUserReports(page: number): void {
    if (!('kind' in this.data)) return;
    this.usersService.reports(this.data.userId, page).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)),
    ).subscribe({
      next: response => {
        this.groups.update(current => [...current, ...response.data.filter(group => !current.some(item => item.review.id === group.review.id))]);
        this.page.set(response.pagination.page); this.pages.set(response.pagination.totalPages);
        this.total.set(response.pagination.total);
      },
      error: () => this.error.set('No pudimos cargar las reseñas reportadas del usuario. El endpoint puede no estar disponible todavía.'),
    });
  }

}
