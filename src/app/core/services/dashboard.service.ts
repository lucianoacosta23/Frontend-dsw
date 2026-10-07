import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { environment } from '../../../environments/environments.js';
import type {
  PopularPlaylist,
  PopularReview,
} from '../../models/dashboard.js';
import type { PopularAlbumsResponse } from '../../models/popular-album.js';
import type { PopularTracksResponse } from '../../models/popular-tracks.js';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  getPlaylists(): Observable<{ data: PopularPlaylist[] }> {
    return this.http.get<{ data: PopularPlaylist[] }>(
      `${environment.apiBaseUrl}/playlist/popular`,
      {
        params: { page: 1, pageSize: 6 },
        withCredentials: true,
      },
    );
  }

  getAlbums(): Observable<PopularAlbumsResponse> {
    return this.http.get<PopularAlbumsResponse>(
      `${environment.apiBaseUrl}/releases/popular`,
      {
        params: { limit: 6 },
        withCredentials: true,
      },
    );
  }

  getTracks(): Observable<PopularTracksResponse> {
    return this.http.get<PopularTracksResponse>(
      `${environment.apiBaseUrl}/tracks/popular`,
      {
        params: { limit: 6 },
        withCredentials: true,
      },
    );
  }

  getReviews(): Observable<{ data: PopularReview[] }> {
    return this.http.get<{ data: PopularReview[] }>(
      `${environment.apiBaseUrl}/reviews/popular`,
      {
        params: { page: 1, pageSize: 4 },
        withCredentials: true,
      },
    );
  }
}