import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { environment } from '../../../environments/environments.js';
import type { AdminUser, AdminUserDetail, DataResponse, PageResponse, SanctionEntry, UserActionRequest, UserReportedReview } from '../../models/admin-users.js';

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/admin/users`;
  list(q = '', page = 1): Observable<PageResponse<AdminUser>> {
    return this.http.get<PageResponse<AdminUser>>(this.url, {
      params: { q: q.trim(), page, pageSize: 10, sort: 'priority' }, withCredentials: true,
    });
  }
  detail(id: number): Observable<DataResponse<AdminUserDetail>> {
    return this.http.get<DataResponse<AdminUserDetail>>(`${this.url}/${id}`, { withCredentials: true });
  }
  history(id: number, page = 1): Observable<PageResponse<SanctionEntry>> {
    return this.http.get<PageResponse<SanctionEntry>>(`${this.url}/${id}/sanctions`, {
      params: { page, pageSize: 10 }, withCredentials: true,
    });
  }
  reports(id: number, page = 1): Observable<PageResponse<UserReportedReview>> {
    return this.http.get<PageResponse<UserReportedReview>>(`${this.url}/${id}/review-reports`, {
      params: { page, pageSize: 10 }, withCredentials: true,
    });
  }
  apply(id: number, input: UserActionRequest): Observable<DataResponse<AdminUserDetail>> {
    return this.http.post<DataResponse<AdminUserDetail>>(`${this.url}/${id}/sanctions`, input, {
      withCredentials: true, headers: new HttpHeaders({ 'X-Jukeboxd-Request': '1' }),
    });
  }
}
