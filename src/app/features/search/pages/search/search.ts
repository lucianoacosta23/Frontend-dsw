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
  SpotifyMusicSearchResponse,
  SpotifyTrackResult,
  SpotifyArtistResult,
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
    { type: 'releases', label: 'Releases' },
    { type: 'artists', label: 'Artistas' },
    { type: 'playlists', label: 'Playlists' },
    { type: 'users', label: 'Usuarios' },
  ];

  readonly selectedTypes = signal<SearchType[]>([]);
  readonly results = signal<SearchResults | null>(null);
  readonly spotifyAlbums = signal<SpotifyAlbumResult[]>([]);
  readonly spotifyTracks = signal<SpotifyTrackResult[]>([]);
  readonly spotifyArtists = signal<SpotifyArtistResult[]>([]);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly spotifyError = signal('');
  readonly hasSearched = signal(false);

  readonly importingId = signal<string | null>(null);
  readonly importError = signal('');

  // Suma resultados locales y música externa sin duplicados.
  readonly totalResults = computed(() => {
    const results = this.results();

    const localCount = results
      ? results.tracks.length
        + results.releases.length
        + results.artists.length
        + results.playlists.length
        + results.users.length
      : 0;

    return localCount + this.spotifyAlbums().length + this.spotifyTracks().length + this.spotifyArtists().length;
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
    this.spotifyTracks.set([]);
    this.spotifyArtists.set([]);

    const query = this.query.trim();

    if (!query || query.length > 255) {
      this.hasSearched.set(false);
      this.errorMessage.set('Escribí entre 1 y 255 caracteres para buscar.');
      return;
    }

    const types = this.selectedTypes();

    const spotifyTypes: Array<'album' | 'track' | 'artist'> = [];
    if (types.length === 0 || types.includes('releases')) spotifyTypes.push('album');
    if (types.length === 0 || types.includes('tracks')) spotifyTypes.push('track');
    if (types.length === 0 || types.includes('artists')) spotifyTypes.push('artist');

    const emptySpotifyResponse: SpotifyMusicSearchResponse = {
      message: '',
      data: { albums: [], tracks: [], artists: [] },
    };

    const spotifyRequest = spotifyTypes.length > 0
      ? this.searchService.searchSpotifyMusic(query, spotifyTypes).pipe(
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

          const localArtistIds = new Set(
            local.data.artists.map(artist => artist.spotifyId)
              .filter((id): id is string => typeof id === 'string'),
          );
          const seenArtists = new Set<string>();
          this.spotifyArtists.set((spotify.data.artists ?? []).filter(artist => {
            if (localArtistIds.has(artist.id) || seenArtists.has(artist.id)) return false;
            seenArtists.add(artist.id);
            return true;
          }));

          const localTrackIds = new Set(
            local.data.tracks.map(track => track.spotifyId)
              .filter((id): id is string => typeof id === 'string'),
          );
          const seenTracks = new Set<string>();
          this.spotifyTracks.set((spotify.data.tracks ?? []).filter(track => {
            if (localTrackIds.has(track.id) || seenTracks.has(track.id)) return false;
            seenTracks.add(track.id);
            return true;
          }));

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
              : 'No pudimos importar el lanzamiento. Intentá nuevamente.',
          );
        },
      });
  }

  openSpotifyTrack(track: SpotifyTrackResult): void {
    if (this.importingId() !== null) return;

    this.importingId.set(`track:${track.id}`);
    this.importError.set('');
    this.importRequest = this.searchService.importSpotifyTrack(track.id)
      .pipe(finalize(() => this.importingId.set(null)))
      .subscribe({
        next: response => {
          void this.router.navigate(['/tracks', response.data.trackId]);
        },
        error: (error: unknown) => {
          this.importError.set(
            error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
              ? error.error.message
              : 'No pudimos importar la canción. Intentá nuevamente.',
          );
        },
      });
  }

  openSpotifyArtist(artist: SpotifyArtistResult): void {
    if (this.importingId() !== null) return;

    this.importingId.set(`artist:${artist.id}`);
    this.importError.set('');
    this.importRequest = this.searchService.importSpotifyArtist(artist.id)
      .pipe(finalize(() => this.importingId.set(null)))
      .subscribe({
        next: response => {
          void this.router.navigate(['/artists', response.data.artistId]);
        },
        error: (error: unknown) => {
          this.importError.set(
            error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
              ? error.error.message
              : 'No pudimos importar el artista. Intentá nuevamente.',
          );
        },
      });
  }

  spotifyReleaseTypeLabel(release: SpotifyAlbumResult): string {
    switch (release.album_type) {
      case 'album': return 'Álbum';
      case 'single': return 'Single';
      case 'compilation': return 'Compilación';
      default: return 'Release';
    }
  }

  localReleaseTypeLabel(type: string): string {
    switch (type) {
      case 'ALBUM': return 'Álbum';
      case 'EP': return 'EP';
      case 'SINGLE': return 'Single';
      case 'MIXTAPE': return 'Mixtape';
      case 'COMPILATION': return 'Compilación';
      default: return 'Release';
    }
  }

  spotifyArtistsLabel(album: { artists: Array<{ name: string }> }): string {
    return album.artists.map(artist => artist.name).join(', ');
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.importRequest?.unsubscribe();
  }
}
