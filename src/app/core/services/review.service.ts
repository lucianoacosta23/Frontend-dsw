import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  CreateReviewRequest,
  ReviewApiResponse,
  ReviewListResponse,
  ReviewLikeResponse,
  ReviewDetailResponse,
  ReviewEditResponse,
ReviewHistoryResponse,
} from '../../models/review.js';
import { environment } from '../../../environments/environments.js';
import type { RatingStatsResponse } from '../../models/rating-stats.js';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);

  getReviewsByAuthor(authorId: number, page = 1, pageSize = 6): Observable<ReviewListResponse> {
    const params = new HttpParams().set('authorId', authorId).set('sort', 'newest')
      .set('page', page).set('pageSize', pageSize);
    return this.http.get<ReviewListResponse>(`${environment.apiBaseUrl}/reviews`, {
      params, withCredentials: true,
    });
  }

  getReviewById(id: number): Observable<ReviewDetailResponse> {
    return this.http.get<ReviewDetailResponse>(
      `${environment.apiBaseUrl}/reviews/${id}`,
      { withCredentials: true },
    );
  }

getPopularReviews(
  targetType: 'release' | 'track',
  targetId: number,
  page = 1,
  pageSize = 10,
): Observable<ReviewListResponse> {
  let params = new HttpParams()
    .set('sort', 'popular')
    .set('page', page)
    .set('pageSize', pageSize);

  params = params.set(
    targetType === 'release' ? 'releaseId' : 'trackId',
    targetId,
  );

  return this.http.get<ReviewListResponse>(
    `${environment.apiBaseUrl}/reviews`,
    { params, withCredentials: true },
  );
}

  // Consulta el promedio y la distribución sin limitarse
  // a las diez reseñas populares que mostramos en pantalla.
  getRatingStats(
    targetType: 'release' | 'track',
    targetId: number,
  ): Observable<RatingStatsResponse> {
    const params = new HttpParams().set(
      targetType === 'release' ? 'releaseId' : 'trackId',
      targetId,
    );

    // Es una consulta pública: no necesita el header de mutaciones.
    return this.http.get<RatingStatsResponse>(
      `${environment.apiBaseUrl}/reviews/stats`,
      { params },
    );
  }

  createReview(
    request: CreateReviewRequest,
  ): Observable<ReviewApiResponse> {
    return this.http.post<ReviewApiResponse>(
      `${environment.apiBaseUrl}/reviews`,
      request,
      {
        withCredentials: true,
        headers: new HttpHeaders({ 'X-Jukeboxd-Request': '1' }),
      },
    );
  }
  // Registra un like del usuario de la sesión.
likeReview(reviewId: number): Observable<ReviewLikeResponse> {
  return this.http.put<ReviewLikeResponse>(
    `${environment.apiBaseUrl}/reviews/${reviewId}/like`,
    {},
    {
      withCredentials: true,
      headers: new HttpHeaders({ 'X-Jukeboxd-Request': '1' }),
    },
  );

}

// Quita el like del usuario de la sesión.
unlikeReview(reviewId: number): Observable<ReviewLikeResponse> {
  return this.http.delete<ReviewLikeResponse>(
    `${environment.apiBaseUrl}/reviews/${reviewId}/like`,
    {
      withCredentials: true,
      headers: new HttpHeaders({ 'X-Jukeboxd-Request': '1' }),
    },
  );
}
editReview(
  reviewId: number,
  text: string,
): Observable<ReviewEditResponse> {
  return this.http.patch<ReviewEditResponse>(
    `${environment.apiBaseUrl}/reviews/${reviewId}`,
    { text },
    {
      withCredentials: true,
      headers: new HttpHeaders({ 'X-Jukeboxd-Request': '1' }),
    },
  );
}

getReviewHistory(
  reviewId: number,
  page = 1,
  pageSize = 10,
): Observable<ReviewHistoryResponse> {
  const params = new HttpParams()
    .set('page', page)
    .set('pageSize', pageSize);

  return this.http.get<ReviewHistoryResponse>(
    `${environment.apiBaseUrl}/reviews/${reviewId}/history`,
    {
      params,
      withCredentials: true,
    },
  );
}
}
