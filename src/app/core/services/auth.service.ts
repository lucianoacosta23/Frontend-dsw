import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environments.js';
import {
  ApiResponse,
  AuthUser,
  LoginCredentials,
  RegisterData,
} from '../../models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly currentUserState = signal<AuthUser | null>(null);
  readonly currentUser = this.currentUserState.asReadonly();

  login(
    credentials: LoginCredentials,
  ): Observable<ApiResponse<AuthUser>> {
    return this.http
      .post<ApiResponse<AuthUser>>(
        `${environment.apiBaseUrl}/auth/login`,
        credentials,
        { withCredentials: true },
      )
      .pipe(tap(response => this.currentUserState.set(response.data)));
  }

  register(data: RegisterData): Observable<ApiResponse<AuthUser>> {
    return this.http.post<ApiResponse<AuthUser>>(
      `${environment.apiBaseUrl}/auth/register`,
      data,
      { withCredentials: true },
    );
  }

  loadSession(): Observable<ApiResponse<AuthUser>> {
    return this.http
      .get<ApiResponse<AuthUser>>(`${environment.apiBaseUrl}/auth/me`, {
        withCredentials: true,
      })
      .pipe(
        tap(response => this.currentUserState.set(response.data)),
        catchError(error => {
          this.currentUserState.set(null);
          return throwError(() => error);
        }),
      );
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(
        `${environment.apiBaseUrl}/auth/logout`,
        {},
        { withCredentials: true },
      )
      .pipe(tap(() => this.currentUserState.set(null)));
  }
}