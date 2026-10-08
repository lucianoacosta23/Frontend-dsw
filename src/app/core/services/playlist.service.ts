import {
  HttpClient,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  catchError,
  forkJoin,
  map,
  of,
  type Observable,
} from 'rxjs';

import { environment } from '../../../environments/environments.js';

export interface PlaylistTrack {
  id: number;
  spotifyId: string | null;
  name: string;
  durationMs: number;
  release: {
    id: number;
    name: string;
    imageUrl: string | null;
  };
  artists: Array<{ id: number; name: string }>;
}

export interface CreatedPlaylist {
  id: number;
  name: string;
}

export interface PlaylistData extends CreatedPlaylist {
  tracks: PlaylistTrack[];
}

export interface OwnPlaylistItem extends CreatedPlaylist {
  author: { id: number; username: string; fullName: string };
  trackCount: number;
  saveCount: number;
  savedByMe: boolean;
  isOwnPlaylist: boolean;
}

export interface OwnPlaylistsResponse {
  message: string;
  data: OwnPlaylistItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface CreatePlaylistResponse {
  message: string;
  data: CreatedPlaylist;
}

interface PlaylistResponse {
  message: string;
  data: PlaylistData;
}

interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  artists: Array<{ id: string; name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  external_urls: { spotify: string };
}

interface SpotifySearchResponse {
  data: { tracks: SpotifyTrack[] };
}

// Un mismo formato para resultados locales y de Spotify.
export interface PlaylistSearchTrack {
  key: string;
  localId: number | null;
  spotifyId: string | null;
  name: string;
  artists: string;
  album: string;
  imageUrl: string | null;
  durationMs: number;
  spotifyUrl: string | null;
}

export interface PlaylistSearchResults {
  tracks: PlaylistSearchTrack[];
  warning: string | null;
}

@Injectable({ providedIn: 'root' })
export class PlaylistService {
  private readonly http = inject(HttpClient);

  getMine(page = 1, pageSize = 6): Observable<OwnPlaylistsResponse> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<OwnPlaylistsResponse>(`${environment.apiBaseUrl}/playlist/mine`, {
      params, withCredentials: true,
    });
  }

  getByAuthor(authorId: number, page = 1, pageSize = 6): Observable<OwnPlaylistsResponse> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<OwnPlaylistsResponse>(`${environment.apiBaseUrl}/users/${authorId}/playlists`, {
      params, withCredentials: true,
    });
  }

  private readonly mutationHeaders = new HttpHeaders({
    'X-Jukeboxd-Request': '1',
  });

  create(name: string): Observable<CreatePlaylistResponse> {
    return this.http.post<CreatePlaylistResponse>(
      `${environment.apiBaseUrl}/playlist`,
      { name: name.trim() },
      {
        withCredentials: true,
        headers: this.mutationHeaders,
      },
    );
  }

  addTrack(
    playlistId: number,
    trackId: number,
  ): Observable<PlaylistResponse> {
    return this.http.post<PlaylistResponse>(
      `${environment.apiBaseUrl}/playlist/${playlistId}/tracks`,
      { trackId },
      {
        withCredentials: true,
        headers: this.mutationHeaders,
      },
    );
  }

  importTrack(
    spotifyId: string,
  ): Observable<{ data: { trackId: number; releaseId: number } }> {
    return this.http.post<{
      data: { trackId: number; releaseId: number };
    }>(
      `${environment.apiBaseUrl}/spotify/tracks/${encodeURIComponent(spotifyId)}/import`,
      {},
      {
        withCredentials: true,
        headers: this.mutationHeaders,
      },
    );
  }

  searchTracks(query: string): Observable<PlaylistSearchResults> {
    const local = this.http.get<{
      data: { tracks: PlaylistTrack[] };
    }>(
      `${environment.apiBaseUrl}/search`,
      {
        params: new HttpParams()
          .set('q', query.trim())
          .set('type', 'tracks'),
        withCredentials: true,
      },
    );

    const spotify = this.http
      .get<SpotifySearchResponse>(
        `${environment.apiBaseUrl}/spotify/search`,
        {
          params: new HttpParams()
            .set('q', query.trim())
            .set('type', 'track'),
          withCredentials: true,
        },
      )
      .pipe(
        map(response => ({
          tracks: response.data.tracks,
          warning: null as string | null,
        })),
        // Si Spotify falla, conserva los resultados locales.
        catchError(() =>
          of({
            tracks: [] as SpotifyTrack[],
            warning:
              'No pudimos consultar Spotify. Se muestran las canciones locales.',
          }),
        ),
      );

    return forkJoin({ local, spotify }).pipe(
      map(({ local, spotify }) => {
        const tracks: PlaylistSearchTrack[] =
          local.data.tracks.map(track => ({
            key: `local-${track.id}`,
            localId: track.id,
            spotifyId: track.spotifyId,
            name: track.name,
            artists: track.artists.map(artist => artist.name).join(', '),
            album: track.release.name,
            imageUrl: track.release.imageUrl,
            durationMs: track.durationMs,
            spotifyUrl: track.spotifyId
              ? `https://open.spotify.com/track/${track.spotifyId}`
              : null,
          }));

        // Evita repetir una canción que ya apareció como resultado local.
        const seen = new Set(
          local.data.tracks
            .map(track => track.spotifyId)
            .filter((id): id is string => id !== null),
        );

        for (const track of spotify.tracks) {
          if (seen.has(track.id)) continue;

          seen.add(track.id);

          tracks.push({
            key: `spotify-${track.id}`,
            localId: null,
            spotifyId: track.id,
            name: track.name,
            artists: track.artists.map(artist => artist.name).join(', '),
            album: track.album.name,
            imageUrl: track.album.images[0]?.url ?? null,
            durationMs: track.duration_ms,
            spotifyUrl: track.external_urls.spotify,
          });
        }

        return { tracks, warning: spotify.warning };
      }),
    );
  }
}
