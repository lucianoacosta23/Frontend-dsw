import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  Input,
  OnChanges,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { CommentService } from '../../../../core/services/comments-service.js';
import { ReviewService } from '../../../../core/services/review.service';
import type { CommentItem } from '../../../../models/comment.js';
import type { ReviewListItem } from '../../../../models/review.js';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-review-card',
  styleUrl: './review-card.scss',
  templateUrl: './review-card.html',
})
export class ReviewCard implements OnChanges {
  @Input({ required: true }) review!: ReviewListItem;

  private readonly reviewService = inject(ReviewService);
  private readonly commentService = inject(CommentService);

  readonly liked = signal(false);
  readonly likeCount = signal(0);
  readonly likeLoading = signal(false);
  readonly likeError = signal<string | null>(null);

  readonly commentsOpen = signal(false);
  readonly comments = signal<CommentItem[]>([]);
  readonly commentsTotal = signal(0);
  readonly commentsLoaded = signal(false);
  readonly commentsLoading = signal(false);
  readonly commentsError = signal<string | null>(null);

  commentText = '';
  readonly commentSubmitting = signal(false);
  readonly commentError = signal<string | null>(null);

  // Guarda por separado las respuestas y el estado de cada comentario.
  readonly replies = signal<Record<number, CommentItem[]>>({});
  readonly repliesTotal = signal<Record<number, number>>({});
  readonly repliesLoaded = signal<Record<number, boolean>>({});
  readonly repliesOpen = signal<Record<number, boolean>>({});
  readonly repliesLoading = signal<Record<number, boolean>>({});
  readonly repliesError = signal<Record<number, string | null>>({});

  readonly replyFormOpen = signal<Record<number, boolean>>({});
  readonly replyText = signal<Record<number, string>>({});
  readonly replySubmitting = signal<Record<number, boolean>>({});
  readonly replyError = signal<Record<number, string | null>>({});

  // Copia a la tarjeta el estado inicial recibido del backend.
  ngOnChanges(): void {
    this.liked.set(this.review.likedByMe);
    this.likeCount.set(this.review.likeCount);
  }

  toggleLike(): void {
    if (this.likeLoading()) return;

    this.likeLoading.set(true);
    this.likeError.set(null);

    const request = this.liked()
      ? this.reviewService.unlikeReview(this.review.id)
      : this.reviewService.likeReview(this.review.id);

    request.pipe(finalize(() => this.likeLoading.set(false))).subscribe({
      next: response => {
        this.liked.set(response.data.liked);
        this.likeCount.set(response.data.likeCount);
      },
      error: (error: unknown) => {
        this.likeError.set(this.getErrorMessage(error, 'like'));
      },
    });
  }

  // Carga los comentarios solo cuando la persona abre la sección.
  toggleComments(): void {
    const opening = !this.commentsOpen();
    this.commentsOpen.set(opening);

    if (opening && !this.commentsLoaded()) {
      this.loadComments();
    }
  }

  loadComments(): void {
    this.commentsLoading.set(true);
    this.commentsError.set(null);

    this.commentService
      .getReviewComments(this.review.id)
      .pipe(finalize(() => this.commentsLoading.set(false)))
      .subscribe({
        next: response => {
          this.comments.set(response.data);
          this.commentsTotal.set(response.pagination.total);
          this.commentsLoaded.set(true);
        },
        error: (error: unknown) => {
          this.commentsError.set(this.getErrorMessage(error, 'comentarios'));
        },
      });
  }

  submitComment(): void {
    const text = this.commentText.trim();

    if (!text) {
      this.commentError.set('Escribí un comentario antes de publicarlo.');
      return;
    }

    this.commentSubmitting.set(true);
    this.commentError.set(null);

    this.commentService
      .createReviewComment(this.review.id, text)
      .pipe(finalize(() => this.commentSubmitting.set(false)))
      .subscribe({
        next: response => {
          this.comments.update(current => [...current, response.data]);
          this.commentsTotal.update(total => total + 1);
          this.commentsLoaded.set(true);
          this.commentText = '';
        },
        error: (error: unknown) => {
          this.commentError.set(this.getErrorMessage(error, 'comentar'));
        },
      });
  }

  toggleReplies(commentId: number): void {
    const opening = !this.isRepliesOpen(commentId);
    this.setById(this.repliesOpen, commentId, opening);

    if (opening && !this.repliesLoaded()[commentId]) {
      this.loadReplies(commentId);
    }
  }

  toggleReplyForm(commentId: number): void {
    const opening = !this.replyFormOpen()[commentId];
    this.setById(this.replyFormOpen, commentId, opening);
    this.setById(this.replyError, commentId, null);

    if (opening) {
      this.setById(this.repliesOpen, commentId, true);

      if (!this.repliesLoaded()[commentId]) {
        this.loadReplies(commentId);
      }
    }
  }

  loadReplies(commentId: number): void {
    if (this.repliesLoading()[commentId]) return;

    this.setById(this.repliesLoading, commentId, true);
    this.setById(this.repliesError, commentId, null);

    this.commentService
      .getCommentReplies(commentId)
      .pipe(finalize(() => this.setById(this.repliesLoading, commentId, false)))
      .subscribe({
        next: response => {
          this.setById(this.replies, commentId, response.data);
          this.setById(this.repliesTotal, commentId, response.pagination.total);
          this.setById(this.repliesLoaded, commentId, true);
        },
        error: (error: unknown) => {
          this.setById(
            this.repliesError,
            commentId,
            this.getErrorMessage(error, 'ver las respuestas'),
          );
        },
      });
  }

  submitReply(comment: CommentItem): void {
    const text = this.replyText()[comment.id]?.trim() ?? '';

    if (!text) {
      this.setById(
        this.replyError,
        comment.id,
        'Escribí una respuesta antes de publicarla.',
      );
      return;
    }

    this.setById(this.replySubmitting, comment.id, true);
    this.setById(this.replyError, comment.id, null);

    this.commentService
      .createReviewComment(this.review.id, text, comment.id)
      .pipe(
        finalize(() =>
          this.setById(this.replySubmitting, comment.id, false),
        ),
      )
      .subscribe({
        next: response => {
          this.replies.update(current => ({
            ...current,
            [comment.id]: [...(current[comment.id] ?? []), response.data],
          }));

          this.setById(
            this.repliesTotal,
            comment.id,
            (this.repliesTotal()[comment.id] ?? 0) + 1,
          );
          this.setById(this.repliesLoaded, comment.id, true);
          this.setById(this.repliesOpen, comment.id, true);
          this.setById(this.replyText, comment.id, '');
          this.setById(this.replyFormOpen, comment.id, false);
        },
        error: (error: unknown) => {
          this.setById(
            this.replyError,
            comment.id,
            this.getErrorMessage(error, 'responder'),
          );
        },
      });
  }

  isRepliesOpen(commentId: number): boolean {
    return this.repliesOpen()[commentId] ?? false;
  }

  isReplyFormOpen(commentId: number): boolean {
    return this.replyFormOpen()[commentId] ?? false;
  }

  repliesFor(commentId: number): CommentItem[] {
    return this.replies()[commentId] ?? [];
  }

  repliesCountFor(commentId: number): number {
    return this.repliesTotal()[commentId] ?? 0;
  }

  replyTextFor(commentId: number): string {
    return this.replyText()[commentId] ?? '';
  }

  private setById<T>(
    state: WritableSignal<Record<number, T>>,
    id: number,
    value: T,
  ): void {
    state.update(current => ({ ...current, [id]: value }));
  }

  private getErrorMessage(error: unknown, action: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No pudimos conectar con el servidor.';
      }

      if (error.status === 401) {
        return `Iniciá sesión para ${action}.`;
      }

      if (typeof error.error?.message === 'string') {
        return error.error.message;
      }
    }

    return `No se pudo completar la acción de ${action}. Intentá nuevamente.`;
  }
}