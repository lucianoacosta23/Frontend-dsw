import { DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  signal,
} from '@angular/core';
import type { Subscription } from 'rxjs';

import { ReviewService } from '../../../../core/services/review.service.js';
import type { ReviewTarget } from '../../../../models/review.js';
import type { RatingStatsData } from '../../../../models/rating-stats.js';

@Component({
  selector: 'app-rating-stats',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './rating-stats.html',
  styleUrl: './rating-stats.scss',
})
export class RatingStats implements OnChanges, OnDestroy {
  private readonly reviewService = inject(ReviewService);
  private request?: Subscription;

  // Indica de qué álbum o canción mostramos las estadísticas.
  @Input({ required: true }) target!: ReviewTarget;

  // La página incrementará este valor cuando se publique una reseña.
  @Input() refreshKey = 0;

  readonly stats = signal<RatingStatsData | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  // La barra con más puntuaciones ocupa toda la altura disponible.
  readonly maxCount = computed(() =>
    Math.max(
      1,
      ...(this.stats()?.distribution.map(item => item.count) ?? []),
    ),
  );

  ngOnChanges(): void {
    this.loadStats();
  }

  loadStats(): void {
    if (!this.target) return;

    // Cancela la consulta anterior si cambia el destino.
    this.request?.unsubscribe();
    this.loading.set(true);
    this.errorMessage.set('');
    this.stats.set(null);

    this.request = this.reviewService
      .getRatingStats(this.target.type, this.target.id)
      .subscribe({
        next: response => {
          this.stats.set(response.data);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set(
            'No pudimos cargar las puntuaciones.',
          );
          this.loading.set(false);
        },
      });
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }
}