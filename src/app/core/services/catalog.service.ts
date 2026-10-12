import type { SpotifyArtistReleasesResponse } from '../../models/artist-discography.js';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import type {
  ArtistDetail,
  CatalogDetailResponse,
  ReleaseDetail,
  TrackDetail,
} from '../../models/catalog-details.js';
import { environment } from '../../../environments/environments.js';
import { PopularAlbumsResponse } from '../../models/popular-album.js';
import { PopularTracksResponse } from '../../models/popular-tracks.js';
@Injectable({
  providedIn: 'root',
})
export class CatalogService {
  private readonly http = inject(HttpClient);

  getPopularAlbums(limit = 10): Observable<PopularAlbumsResponse> {
    return this.http.get<PopularAlbumsResponse>(
      `${environment.apiBaseUrl}/releases/popular`,
      { params: { limit } },
    );
  }
  // Pide al backend las pistas más reseñadas.
getPopularTracks(limit = 10): Observable<PopularTracksResponse> {
  return this.http.get<PopularTracksResponse>(
    `${environment.apiBaseUrl}/tracks/popular`,
    { params: { limit } },
  );
}
// Carga los datos completos de un lanzamiento.
getReleaseById(id: number): Observable<CatalogDetailResponse<ReleaseDetail>> {
  return this.http.get<CatalogDetailResponse<ReleaseDetail>>(
    `${environment.apiBaseUrl}/releases/${id}`,
  );
}

// Carga los datos de una pista, incluido su lanzamiento y artistas.
getTrackById(id: number): Observable<CatalogDetailResponse<TrackDetail>> {
  return this.http.get<CatalogDetailResponse<TrackDetail>>(
    `${environment.apiBaseUrl}/tracks/${id}`,
  );
}

// Carga el perfil de un artista por su ID.
getArtistById(id: number): Observable<CatalogDetailResponse<ArtistDetail>> {
  return this.http.get<CatalogDetailResponse<ArtistDetail>>(
    `${environment.apiBaseUrl}/artists/${id}`,
  );
}

  // El listado actual devuelve el catálogo completo; filtramos por el ID del artista.
  getArtistReleases(artistId: number): Observable<ReleaseDetail[]> {
    return this.http.get<CatalogDetailResponse<ReleaseDetail[]>>(
      `${environment.apiBaseUrl}/releases`,
    ).pipe(map(response => response.data.filter(
      release => release.artists.some(artist => artist.id === artistId),
    )));
  }

  getSpotifyArtistReleases(spotifyId: string, offset = 0): Observable<SpotifyArtistReleasesResponse> {
    return this.http.get<SpotifyArtistReleasesResponse>(
      `${environment.apiBaseUrl}/spotify/artists/${encodeURIComponent(spotifyId)}/releases`,
      { params: { offset }, withCredentials: true },
    );
  }

}
