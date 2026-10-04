import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  CreateReviewRequest,
  ReviewApiResponse,
  ReviewListResponse,
} from '../../models/review.js';
import { environment } from '../../../environments/environments.js';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);

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
}