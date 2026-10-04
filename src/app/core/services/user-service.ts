import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type { UserProfileResponse } from '../../models/user-profile.js';
import { environment } from '../../../environments/environments.js';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  // Busca los datos públicos del perfil para mostrarlos en su página.
  getProfileByUsername(username: string): Observable<UserProfileResponse> {
    const params = new HttpParams().set('username', username);

    return this.http.get<UserProfileResponse>(
      `${environment.apiBaseUrl}/users/search`,
      { params, withCredentials: true },
    );
  }
}