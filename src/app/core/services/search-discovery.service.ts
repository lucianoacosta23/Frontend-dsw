import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, of, type Observable } from 'rxjs';
import { SearchService } from './search.service';
import { combineSearchResults, type SearchEntry, type SearchGroup } from '../../models/search-view';
import type { SearchType, SpotifyMusicSearchResponse } from '../../models/search';

export interface SearchDiscovery {
  groups: SearchGroup[];
  warning: string | null;
}

@Injectable({ providedIn: 'root' })
export class SearchDiscoveryService {
  private readonly api = inject(SearchService);

  search(query: string, types: SearchType[] = []): Observable<SearchDiscovery> {
    const spotifyTypes: Array<'album' | 'track' | 'artist'> = [];
    if (!types.length || types.includes('releases')) spotifyTypes.push('album');
    if (!types.length || types.includes('tracks')) spotifyTypes.push('track');
    if (!types.length || types.includes('artists')) spotifyTypes.push('artist');
    const empty: SpotifyMusicSearchResponse['data'] = { albums: [], tracks: [], artists: [] };
    const remote = spotifyTypes.length
      ? this.api.searchSpotifyMusic(query, spotifyTypes).pipe(
          map((response) => ({ data: response.data, warning: null })),
          catchError(() =>
            of({
              data: empty,
              warning:
                'Algunos resultados no están disponibles. Podés volver a intentar la búsqueda.',
            }),
          ),
        )
      : of({ data: empty, warning: null });

    return forkJoin({ local: this.api.search(query, types), remote }).pipe(
      map(({ local, remote }) => ({
        groups: combineSearchResults(local.data, remote.data, query),
        warning: remote.warning,
      })),
    );
  }

  // Solo la selección explícita de un resultado externo puede importarlo.
  open(entry: SearchEntry): Observable<string> {
    const target = entry.target;
    if (target.source === 'local') return of(target.url);
    switch (target.type) {
      case 'artists':
        return this.api
          .importSpotifyArtist(target.id)
          .pipe(map((response) => `/artists/${response.data.artistId}`));
      case 'tracks':
        return this.api
          .importSpotifyTrack(target.id)
          .pipe(map((response) => `/tracks/${response.data.trackId}`));
      case 'releases':
        return this.api
          .importSpotifyAlbum(target.id)
          .pipe(map((response) => `/releases/${response.data.releaseId}`));
    }
  }
}
