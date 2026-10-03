import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  CreateReviewRequest,
  ReviewApiResponse,
} from '../../models/review.js';
import { environment } from '../../../environments/environments.js';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);

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