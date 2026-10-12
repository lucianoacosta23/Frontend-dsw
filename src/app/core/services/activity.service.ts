import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { environment } from '../../../environments/environments.js';
import type {
  ActivityResponse,
  ActivityScope,
} from '../../models/activity.js';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly http = inject(HttpClient);

  getActivity(
    scope: ActivityScope,
    page = 1,
    pageSize = 20,
  ): Observable<ActivityResponse> {
    return this.http.get<ActivityResponse>(
      `${environment.apiBaseUrl}/activity`,
      {
        params: { scope, page, pageSize },
        withCredentials: true,
      },
    );
  }
}