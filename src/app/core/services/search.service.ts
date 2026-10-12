import {
  HttpClient,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { environment } from '../../../environments/environments.js';
import type {
  SpotifyMusicSearchResponse,
  SpotifyTrackImportResponse,
  SpotifyArtistImportResponse,
  SearchResponse,
  SearchType,
  SpotifyAlbumSearchResponse,
  SpotifyAlbumImportResponse,
} from '../../models/search.js';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly http = inject(HttpClient);

  // Un arreglo vacío de filtros significa "Todo".
  search(
    query: string,
    types: SearchType[] = [],
  ): Observable<SearchResponse> {
    let params = new HttpParams().set('q', query.trim());

    // Ejemplo: type=playlists,releases.
    if (types.length > 0) {
      params = params.set('type', types.join(','));
    }

    return this.http.get<SearchResponse>(
      `${environment.apiBaseUrl}/search`,
      {
        params,
        withCredentials: true,
      },
    );
  }
    // Consulta los álbumes externos sin guardarlos todavía.
  searchSpotifyAlbums(
    query: string,
  ): Observable<SpotifyAlbumSearchResponse> {
    const params = new HttpParams()
      .set('q', query.trim())
      .set('type', 'album');

    return this.http.get<SpotifyAlbumSearchResponse>(
      `${environment.apiBaseUrl}/spotify/search`,
      {
        params,
        withCredentials: true,
      },
    );
  }

  searchSpotifyMusic(
    query: string,
    types: Array<'album' | 'track' | 'artist'>,
  ): Observable<SpotifyMusicSearchResponse> {
    const params = new HttpParams()
      .set('q', query.trim())
      .set('type', types.join(','));

    return this.http.get<SpotifyMusicSearchResponse>(
      `${environment.apiBaseUrl}/spotify/search`,
      { params, withCredentials: true },
    );
  }

  importSpotifyArtist(spotifyId: string): Observable<SpotifyArtistImportResponse> {
    return this.http.post<SpotifyArtistImportResponse>(
      `${environment.apiBaseUrl}/spotify/artists/${encodeURIComponent(spotifyId)}/import`,
      {},
      {
        withCredentials: true,
        headers: new HttpHeaders({ 'X-Jukeboxd-Request': '1' }),
      },
    );
  }

  importSpotifyTrack(spotifyId: string): Observable<SpotifyTrackImportResponse> {
    return this.http.post<SpotifyTrackImportResponse>(
      `${environment.apiBaseUrl}/spotify/tracks/${encodeURIComponent(spotifyId)}/import`,
      {},
      {
        withCredentials: true,
        headers: new HttpHeaders({ 'X-Jukeboxd-Request': '1' }),
      },
    );
  }

  // Importa el álbum seleccionado o reutiliza su registro local.
  importSpotifyAlbum(
    spotifyId: string,
  ): Observable<SpotifyAlbumImportResponse> {
    return this.http.post<SpotifyAlbumImportResponse>(
      `${environment.apiBaseUrl}/spotify/albums/${encodeURIComponent(spotifyId)}/import`,
      {},
      {
        withCredentials: true,
        headers: new HttpHeaders({
          'X-Jukeboxd-Request': '1',
        }),
      },
    );
  }
}
