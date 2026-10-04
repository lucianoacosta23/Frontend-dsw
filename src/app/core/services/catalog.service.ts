import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
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
}
