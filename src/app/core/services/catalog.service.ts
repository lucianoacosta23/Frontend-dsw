import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environments.js';
import { PopularAlbumsResponse } from '../../models/popular-album.js';

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
}