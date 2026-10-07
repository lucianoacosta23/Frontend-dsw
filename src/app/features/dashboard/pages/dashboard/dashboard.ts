import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize, type Observable } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service.js';
import { DashboardService } from '../../../../core/services/dashboard.service.js';
import type {
  PopularPlaylist,
  PopularReview,
} from '../../../../models/dashboard.js';
import type { PopularAlbum } from '../../../../models/popular-album.js';
import type { PopularTrackItem } from '../../../../models/popular-tracks.js';
import { ReviewCard } from '../../../reviews/components/review-card/review-card.js';
import { Navbar } from '../../../../shared/components/navbar/navbar.js';

interface SectionState<T> {
  items: WritableSignal<T[]>;
  loading: WritableSignal<boolean>;
  error: WritableSignal<string | null>;
}

function createSection<T>(): SectionState<T> {
  return {
    items: signal<T[]>([]),
    loading: signal(false),
    error: signal<string | null>(null),
  };
}

@Component({
  selector: 'app-dashboard',
  imports: [Navbar, RouterLink, ReviewCard],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  readonly auth = inject(AuthService);

  private readonly service = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly playlists = createSection<PopularPlaylist>();
  readonly albums = createSection<PopularAlbum>();
  readonly tracks = createSection<PopularTrackItem>();
  readonly reviews = createSection<PopularReview>();

  ngOnInit(): void {
    this.loadPlaylists();
    this.loadAlbums();
    this.loadTracks();
    this.loadReviews();
  }

  loadPlaylists(): void {
    this.load(this.playlists, this.service.getPlaylists());
  }

  loadAlbums(): void {
    this.load(this.albums, this.service.getAlbums());
  }

  loadTracks(): void {
    this.load(this.tracks, this.service.getTracks());
  }

  loadReviews(): void {
    this.load(this.reviews, this.service.getReviews());
  }

  artistsLabel(artists: Array<{ name: string }>): string {
    return artists.map(artist => artist.name).join(', ');
  }

  private load<T>(
    section: SectionState<T>,
    request: Observable<{ data: T[] }>,
  ): void {
    if (section.loading()) return;

    section.loading.set(true);
    section.error.set(null);

    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => section.loading.set(false)),
      )
      .subscribe({
        next: response => section.items.set(response.data),
        error: () => {
          section.error.set(
            'No pudimos cargar esta sección. Intentá nuevamente.',
          );
        },
      });
  }
}