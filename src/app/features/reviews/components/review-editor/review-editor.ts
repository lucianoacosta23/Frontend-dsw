import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { ReviewService } from '../../../../core/services/review.service';
import type {
  ReviewListItem,
  ReviewRevisionItem,
  ReviewTextUpdate,
} from '../../../../models/review';

@Component({
  selector: 'app-review-editor',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './review-editor.html',
  styleUrl: './review-editor.scss',
})
export class ReviewEditor implements OnChanges {
  @Input({ required: true }) review!: ReviewListItem;
  @Output() saved = new EventEmitter<ReviewTextUpdate>();

  private readonly auth = inject(AuthService);
  private readonly service = inject(ReviewService);
  private readonly destroyRef = inject(DestroyRef);
  private previousId?: number;

  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly editError = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly historyOpen = signal(false);
  readonly historyLoading = signal(false);
  readonly historyError = signal<string | null>(null);
  readonly historyLoaded = signal(false);
  readonly revisions = signal<ReviewRevisionItem[]>([]);
  readonly page = signal(0);
  readonly totalPages = signal(0);

  editText = '';

  ngOnChanges(): void {
    if (this.previousId === this.review.id) return;

    this.previousId = this.review.id;
    this.editing.set(false);
    this.saving.set(false);
    this.editError.set(null);
    this.success.set(null);
    this.historyOpen.set(false);
    this.historyLoading.set(false);
    this.resetHistory();
  }

  isOwner(): boolean {
    return this.auth.currentUser()?.id === this.review.author.id;
  }

  canEdit(): boolean {
    const createdAt = Date.parse(this.review.createdAt);

    return (
      this.isOwner() &&
      Number.isFinite(createdAt) &&
      Date.now() < createdAt + 24 * 60 * 60 * 1000
    );
  }

  canReadHistory(): boolean {
    return this.auth.currentUser() !== null;
  }

  startEdit(): void {
    if (!this.canEdit() || this.saving()) return;

    this.editText = this.review.text ?? '';
    this.editError.set(null);
    this.success.set(null);
    this.editing.set(true);
  }

  cancelEdit(): void {
    if (this.saving()) return;

    this.editing.set(false);
    this.editError.set(null);
  }

  save(): void {
    if (this.saving()) return;

    if (!this.canEdit()) {
      this.editError.set('Ya no podés editar esta reseña.');
      return;
    }

    const text = this.editText.trim();

    if (!text || Array.from(text).length > 2000 || text.includes('\0')) {
      this.editError.set(
        'Escribí entre 1 y 2000 caracteres, sin caracteres NUL.',
      );
      return;
    }

    const reviewId = this.review.id;

    this.saving.set(true);
    this.editError.set(null);

    this.service.editReview(reviewId, text)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (this.review.id === reviewId) {
            this.saving.set(false);
          }
        }),
      )
      .subscribe({
        next: response => {
          if (this.review.id !== reviewId) return;

          const update: ReviewTextUpdate = {
            text: response.data.text,
            editedAt: response.data.editedAt,
          };

          this.review = { ...this.review, ...update };
          this.saved.emit(update);
          this.editing.set(false);
          this.success.set('Reseña guardada.');

          this.resetHistory();

          // Permite actualizar el historial después de guardar.
          this.saving.set(false);

          if (this.historyOpen() && !this.historyLoading()) {
            this.loadHistory();
          }
        },
        error: (error: unknown) => {
          if (this.review.id !== reviewId) return;

          this.editError.set(
            this.errorMessage(error, 'No pudimos guardar la reseña.'),
          );
        },
      });
  }

  toggleHistory(): void {
    if (!this.canReadHistory() || this.saving()) return;

    this.historyOpen.update(open => !open);

    if (this.historyOpen() && !this.historyLoaded()) {
      this.loadHistory();
    }
  }

  loadHistory(append = false): void {
    if (
      !this.canReadHistory() ||
      this.historyLoading() ||
      this.saving()
    ) return;

    const reviewId = this.review.id;
    const requestedPage = append ? this.page() + 1 : 1;

    this.historyLoading.set(true);
    this.historyError.set(null);

    this.service.getReviewHistory(reviewId, requestedPage)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (this.review.id !== reviewId) return;

          this.historyLoading.set(false);

          // Si una edición invalidó una consulta anterior,
          // carga nuevamente el historial actualizado.
          if (this.historyOpen() && !this.historyLoaded() &&
              !this.historyError() && !this.saving()) {
            this.loadHistory();
          }
        }),
      )
      .subscribe({
        next: response => {
          if (this.review.id !== reviewId) return;

          this.revisions.update(current =>
            append ? [...current, ...response.data] : response.data,
          );
          this.page.set(response.pagination.page);
          this.totalPages.set(response.pagination.totalPages);
          this.historyLoaded.set(true);
        },
        error: (error: unknown) => {
          if (this.review.id !== reviewId) return;

          this.historyError.set(
            this.errorMessage(error, 'No pudimos cargar el historial.'),
          );
        },
      });
  }

  private resetHistory(): void {
    this.revisions.set([]);
    this.historyLoaded.set(false);
    this.historyError.set(null);
    this.page.set(0);
    this.totalPages.set(0);
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No pudimos conectar con el servidor.';
      }

      if (typeof error.error?.message === 'string') {
        return error.error.message;
      }
    }

    return fallback;
  }
}
