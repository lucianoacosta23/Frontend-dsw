import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type { FollowUserResponse, UserProfileResponse, ProfilePatch, ProfileImageResponse, ImagePurpose } from '../../models/user-profile.js';
import { environment } from '../../../environments/environments.js';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  getProfileById(id: number): Observable<UserProfileResponse> {
    return this.http.get<UserProfileResponse>(`${environment.apiBaseUrl}/users/${id}/profile`, { withCredentials: true });
  }

  updateOwnProfile(patch: ProfilePatch): Observable<UserProfileResponse> {
    return this.http.patch<UserProfileResponse>(`${environment.apiBaseUrl}/users/me/profile`, patch, {
      withCredentials: true, headers: new HttpHeaders({ 'X-Jukeboxd-Request': '1' }),
    });
  }

  uploadProfileImage(file: File, purpose: ImagePurpose): Observable<ProfileImageResponse> {
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', purpose);
    return this.http.post<ProfileImageResponse>(`${environment.apiBaseUrl}/users/me/images`, form, {
      withCredentials: true, headers: new HttpHeaders({ 'X-Jukeboxd-Request': '1' }),
    });
  }

  // Quita el seguimiento de la cuenta autenticada.
  unfollowUser(userId: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiBaseUrl}/users/${userId}/follow`,
      {
        withCredentials: true,
        headers: new HttpHeaders({
          'X-Jukeboxd-Request': '1',
        }),
      },
    );
  }

  // Busca los datos públicos del perfil para mostrarlos en su página.
  getProfileByUsername(username: string): Observable<UserProfileResponse> {
    const params = new HttpParams().set('username', username);

    return this.http.get<UserProfileResponse>(
      `${environment.apiBaseUrl}/users/search`,
      { params, withCredentials: true },
    );
  }
    // La sesión identifica quién sigue; el ID identifica a quién seguir.
  followUser(userId: number): Observable<FollowUserResponse> {
    return this.http.put<FollowUserResponse>(
      `${environment.apiBaseUrl}/users/${userId}/follow`,
      {},
      {
        withCredentials: true,
        headers: new HttpHeaders({
          'X-Jukeboxd-Request': '1',
        }),
      },
    );
  }
    // Consulta el perfil de la cuenta autenticada, sin buscar por username.
  getOwnProfile(): Observable<UserProfileResponse> {
    return this.http.get<UserProfileResponse>(
      `${environment.apiBaseUrl}/users/me`,
      { withCredentials: true },
    );
  }
}
