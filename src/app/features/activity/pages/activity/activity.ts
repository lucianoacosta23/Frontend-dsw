import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';

import { ActivityService } from '../../../../core/services/activity.service.js';
import type {
  ActivityItem,
  ActivityScope,
} from '../../../../models/activity.js';
import { Navbar } from '../../../../shared/components/navbar/navbar.js';

@Component({
  selector: 'app-activity',
  imports: [Navbar, RouterLink, DatePipe],
  templateUrl: './activity.html',
  styleUrl: './activity.scss',
})
export class Activity implements OnInit {
  private readonly service = inject(ActivityService);
  private readonly destroyRef = inject(DestroyRef);
  private request: Subscription | undefined;

  readonly selectedTab = signal<ActivityScope>('following');
  readonly items = signal<ActivityItem[]>([]);
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly moreError = signal<string | null>(null);

  readonly page = signal(0);
  readonly total = signal(0);
  readonly totalPages = signal(0);

  readonly hasMore = computed(() => this.page() < this.totalPages());

  readonly heading = computed(() => {
    switch (this.selectedTab()) {
      case 'own':
        return 'Tus reseñas recientes';
      case 'incoming':
        return 'Tus interacciones recibidas';
      default:
        return 'Reseñas de tus seguidos';
    }
  });

  readonly tabs: Array<{ id: ActivityScope; label: string }> = [
    { id: 'following', label: 'Seguidos' },
    { id: 'own', label: 'Vos' },
    { id: 'incoming', label: 'Recibida' },
  ];

  ngOnInit(): void {
    this.reload();
  }

  selectTab(tab: ActivityScope): void {
    if (tab === this.selectedTab()) return;

    this.selectedTab.set(tab);
    this.reload();
  }

  reload(): void {
    this.request?.unsubscribe();

    this.items.set([]);
    this.page.set(0);
    this.total.set(0);
    this.totalPages.set(0);
    this.errorMessage.set(null);
    this.moreError.set(null);

    this.loadPage(1, false);
  }

  loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) {
      return;
    }

    this.loadPage(this.page() + 1, true);
  }

  eventKey(item: ActivityItem): string {
    return item.id ?? `${item.type}-${item.reviewId}`;
  }

  artistsLabel(item: ActivityItem): string {
    return item.target?.artists.map(artist => artist.name).join(', ') ?? '';
  }

  actionLabel(item: ActivityItem): string {
    switch (item.type) {
      case 'FOLLOW_RECEIVED':
        return 'comenzó a seguirte';
      case 'LIKE_RECEIVED':
        return 'le dio like a tu reseña de';
      case 'COMMENT_RECEIVED':
        return 'comentó en tu reseña de';
      case 'REPLY_RECEIVED':
        return 'respondió a tu comentario en';
      default:
        return 'reseñó';
    }
  }

  private loadPage(page: number, append: boolean): void {
    const scope = this.selectedTab();

    if (append) {
      this.loadingMore.set(true);
      this.moreError.set(null);
    } else {
      this.loading.set(true);
      this.errorMessage.set(null);
    }

    this.request = this.service.getActivity(scope, page)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (append) {
            this.loadingMore.set(false);
          } else {
            this.loading.set(false);
          }
        }),
      )
      .subscribe({
        next: response => {
          if (scope !== this.selectedTab()) return;

          if (append) {
            // Cada interacción tiene su propia clave, aunque sea
            // sobre una reseña que ya aparece en el listado.
            this.items.update(current => [
              ...new Map(
                [...current, ...response.data].map(item => [
                  this.eventKey(item),
                  item,
                ]),
              ).values(),
            ]);
          } else {
            this.items.set(response.data);
          }

          this.page.set(response.pagination.page);
          this.total.set(response.pagination.total);
          this.totalPages.set(response.pagination.totalPages);
        },
        error: (error: unknown) => {
          let message = 'No pudimos cargar la actividad. Intentá nuevamente.';

          if (error instanceof HttpErrorResponse) {
            if (error.status === 0) {
              message = 'No pudimos conectar con el servidor.';
            } else if (error.status === 401) {
              message = 'Tu sesión venció. Iniciá sesión nuevamente.';
            }
          }

          if (append) {
            this.moreError.set(message);
          } else {
            this.errorMessage.set(message);
          }
        },
      });
  }
}