import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  catchError,
  finalize,
  forkJoin,
  of,
} from 'rxjs';
import type { Subscription } from 'rxjs';

import { SearchService } from '../../../../core/services/search.service.js';
import type {
  SearchResults,
  SearchType,
  SpotifyAlbumResult,
  SpotifyAlbumSearchResponse,
} from '../../../../models/search.js';
import { Navbar } from '../../../../shared/components/navbar/navbar.js';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FormsModule, RouterLink, Navbar],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class Search implements OnDestroy {
  private readonly searchService = inject(SearchService);
  private readonly router = inject(Router);

  private request?: Subscription;
  private importRequest?: Subscription;

  query = '';

  readonly filters: Array<{ type: SearchType; label: string }> = [
    { type: 'tracks', label: 'Canciones' },
    { type: 'releases', label: 'Álbumes' },
    { type: 'artists', label: 'Artistas' },
    { type: 'playlists', label: 'Playlists' },
    { type: 'users', label: 'Usuarios' },
  ];

  readonly selectedTypes = signal<SearchType[]>([]);
  readonly results = signal<SearchResults | null>(null);
  readonly spotifyAlbums = signal<SpotifyAlbumResult[]>([]);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly spotifyError = signal('');
  readonly hasSearched = signal(false);

  readonly importingId = signal<string | null>(null);
  readonly importError = signal('');

  // Suma resultados locales y álbumes externos sin duplicados.
  readonly totalResults = computed(() => {
    const results = this.results();

    const localCount = results
      ? results.tracks.length
        + results.releases.length
        + results.artists.length
        + results.playlists.length
        + results.users.length
      : 0;

    return localCount + this.spotifyAlbums().length;
  });

  isSelected(type: SearchType): boolean {
    return this.selectedTypes().includes(type);
  }

  toggleFilter(type: SearchType): void {
    this.selectedTypes.update(current =>
      current.includes(type)
        ? current.filter(item => item !== type)
        : [...current, type],
    );

    this.refreshSearch();
  }

  selectAll(): void {
    this.selectedTypes.set([]);
    this.refreshSearch();
  }

  private refreshSearch(): void {
    if (this.hasSearched()) {
      this.search();
    }
  }

  search(): void {
    this.request?.unsubscribe();

    this.loading.set(false);
    this.errorMessage.set('');
    this.spotifyError.set('');
    this.importError.set('');
    this.results.set(null);
    this.spotifyAlbums.set([]);

    const query = this.query.trim();

    if (!query) {
      this.errorMessage.set('Escribí algo para buscar.');
      return;
    }

    const types = this.selectedTypes();

    // Por ahora buscamos álbumes externos cuando se selecciona
    // Todo o Álbumes. Las demás categorías siguen siendo locales.
    const includeSpotifyAlbums =
      types.length === 0 || types.includes('releases');

    const emptySpotifyResponse: SpotifyAlbumSearchResponse = {
      message: '',
      data: { albums: [] },
    };

    const spotifyRequest = includeSpotifyAlbums
      ? this.searchService.searchSpotifyAlbums(query).pipe(
          catchError(() => {
            // Un fallo externo no oculta los resultados locales.
            this.spotifyError.set(
              'No pudimos consultar Spotify. Se muestran los resultados locales.',
            );

            return of(emptySpotifyResponse);
          }),
        )
      : of(emptySpotifyResponse);

    this.loading.set(true);
    this.hasSearched.set(true);

    // Consulta las dos fuentes y combina sus resultados.
    this.request = forkJoin({
      local: this.searchService.search(query, types),
      spotify: spotifyRequest,
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ local, spotify }) => {
          this.results.set(local.data);

          const localSpotifyIds = new Set(
            local.data.releases
              .map(release => release.spotifyId)
              .filter(id => id !== null),
          );

          const seen = new Set<string>();

          this.spotifyAlbums.set(
            spotify.data.albums.filter(album => {
              if (
                localSpotifyIds.has(album.id) ||
                seen.has(album.id)
              ) {
                return false;
              }

              seen.add(album.id);
              return true;
            }),
          );
        },
        error: (error: unknown) => {
          this.errorMessage.set(
            error instanceof HttpErrorResponse &&
              error.status === 401
              ? 'Tu sesión venció. Iniciá sesión nuevamente.'
              : 'No pudimos completar la búsqueda. Intentá nuevamente.',
          );
        },
      });
  }

  // Importa el resultado elegido y abre su detalle con el ID local.
  openSpotifyAlbum(album: SpotifyAlbumResult): void {
    if (this.importingId() !== null) return;

    this.importingId.set(album.id);
    this.importError.set('');

    this.importRequest = this.searchService
      .importSpotifyAlbum(album.id)
      .pipe(finalize(() => this.importingId.set(null)))
      .subscribe({
        next: response => {
          void this.router.navigate([
            '/releases',
            response.data.releaseId,
          ]);
        },
        error: (error: unknown) => {
          this.importError.set(
            error instanceof HttpErrorResponse &&
              typeof error.error?.message === 'string'
              ? error.error.message
              : 'No pudimos importar el álbum. Intentá nuevamente.',
          );
        },
      });
  }

  spotifyArtistsLabel(album: SpotifyAlbumResult): string {
    return album.artists.map(artist => artist.name).join(', ');
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.importRequest?.unsubscribe();
  }
}