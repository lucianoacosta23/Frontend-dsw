import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environments.js';
import type {
  CreateReportRequest,
  CreateReportResponse,
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
}
