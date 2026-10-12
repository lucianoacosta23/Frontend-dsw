import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environments.js';
import type {
  CreateReportRequest,
  CreateReportResponse,
  CriticalReviewsResponse,
  ModerateReviewResponse,
  ReportDecision,
  ReviewReportsResponse,
} from '../../models/report.js';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);

  // Envía el reporte con la cookie de sesión y la cabecera de mutaciones.
  createReviewReport(
    reviewId: number,
    input: CreateReportRequest,
  ): Observable<CreateReportResponse> {
    return this.http.post<CreateReportResponse>(
      `${environment.apiBaseUrl}/reviews/${reviewId}/reports`,
      input,
      {
        withCredentials: true,
        headers: new HttpHeaders({ 'X-Jukeboxd-Request': '1' }),
      },
    );
  }

  getCriticalReviews(): Observable<CriticalReviewsResponse> {
    return this.http.get<CriticalReviewsResponse>(
      `${environment.apiBaseUrl}/admin/reports/critical`,
      { withCredentials: true },
    );
  }

  getMinorReviews(): Observable<CriticalReviewsResponse> {
    return this.http.get<CriticalReviewsResponse>(
      `${environment.apiBaseUrl}/admin/reports/minor`,
      { withCredentials: true },
    );
  }

  getReviewReports(reviewId: number): Observable<ReviewReportsResponse> {
    return this.http.get<ReviewReportsResponse>(
      `${environment.apiBaseUrl}/admin/reports/${reviewId}/reviewreport`,
      { withCredentials: true },
    );
  }

  moderateReview(
    reviewId: number,
    decision: ReportDecision,
  ): Observable<ModerateReviewResponse> {
    return this.http.patch<ModerateReviewResponse>(
      `${environment.apiBaseUrl}/admin/reports/${reviewId}/reviewreport`,
      { decision },
      {
        headers: new HttpHeaders({ 'X-Jukeboxd-Request': '1' }),
        withCredentials: true,
      },
    );
  }

}
