import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import type {
  CreateReviewRequest,
  ReviewTarget,
} from '../../../../models/review.js';

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet],
  templateUrl: './review-form.html',
  styleUrl: './review-form.scss',
})
export class ReviewForm implements OnChanges {
  @Input({ required: true }) target!: ReviewTarget;
  @Input() submitting = false;
  @Input() errorMessage = '';
  @Input() title = '';
  @Input() imageUrl: string | null = null;

  @Output() submitReview = new EventEmitter<CreateReviewRequest>();

  @ViewChild('reviewDialog')
  private dialog!: ElementRef<HTMLDialogElement>;

  readonly stars = [1, 2, 3, 4, 5];
  readonly validationError = signal<string | null>(null);

  rating = 3;
  text = '';

  ngOnChanges(changes: SimpleChanges): void {
    const submittingChange = changes['submitting'];

    // Cierra y limpia únicamente después de una publicación exitosa.
    if (
      submittingChange?.previousValue === true &&
      submittingChange.currentValue === false &&
      !this.errorMessage
    ) {
      this.dialog?.nativeElement.close();
      this.text = '';
      this.validationError.set(null);
    }
  }

  open(): void {
    if (this.submitting) return;

    this.validationError.set(null);

    if (!this.dialog.nativeElement.open) {
      this.dialog.nativeElement.showModal();
    }
  }

  close(): void {
    if (!this.submitting) {
      this.dialog.nativeElement.close();
    }
  }

  onCancel(event: Event): void {
    if (this.submitting) {
      event.preventDefault();
    }
  }

  selectRating(value: number, openDialog = false): void {
    if (this.submitting) return;

    this.rating = value;

    if (openDialog) this.open();
  }

  fill(star: number): number {
    return Math.max(0, Math.min(1, this.rating - star + 1)) * 100;
  }

  submit(): void {
    if (this.submitting) return;

    const reviewText = this.text.trim();

    if (
      Array.from(reviewText).length > 2000 ||
      reviewText.includes('\0')
    ) {
      this.validationError.set(
        'La reseña puede tener hasta 2000 caracteres y no contener caracteres NUL.',
      );
      return;
    }

    if (
      !Number.isFinite(this.rating) ||
      this.rating < 0.5 ||
      this.rating > 5 ||
      !Number.isInteger(this.rating * 2)
    ) {
      this.validationError.set('Elegí una puntuación entre 0.5 y 5.');
      return;
    }

    this.validationError.set(null);

    const request: CreateReviewRequest = {
      ...(this.target.type === 'release'
        ? { releaseId: this.target.id }
        : { trackId: this.target.id }),
      rating: this.rating,
      ...(reviewText ? { text: reviewText } : {}),
    };

    this.submitReview.emit(request);
  }
}