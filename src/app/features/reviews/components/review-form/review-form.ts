import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  CreateReviewRequest,
  ReviewTarget,
} from '../../../../models/review.js';


@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './review-form.html',
  styleUrl: './review-form.scss',
})
export class ReviewForm {
  // El detalle indica si la reseña corresponde a un álbum o a una pista.
  @Input({ required: true }) target!: ReviewTarget;
@Input() submitting = false;
  // El componente padre recibirá estos datos y los enviará al backend.
  @Output() submitReview = new EventEmitter<CreateReviewRequest>();

  // La escala incluye medios puntos, desde 0.5 hasta 5.
  readonly ratings = Array.from({ length: 10 }, (_, index) => (index + 1) / 2);

  rating = 3;
  text = '';

  submit(): void {
    const reviewText = this.text.trim();

    const request: CreateReviewRequest = {
  ...(this.target.type === 'release'
    ? { releaseId: this.target.id }
    : { trackId: this.target.id }),
  rating: Number(this.rating),
  ...(reviewText ? { text: reviewText } : {}),
};

    this.submitReview.emit(request);
  }
}