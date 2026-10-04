import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  CommentApiResponse,
  CommentListResponse,
} from '../../models/comment.js';
import { environment } from '../../../environments/environments.js';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly http = inject(HttpClient);

  // Carga los comentarios principales de una reseña.
  getReviewComments(
    reviewId: number,
    page = 1,
    pageSize = 20,
  ): Observable<CommentListResponse> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http.get<CommentListResponse>(
      `${environment.apiBaseUrl}/reviews/${reviewId}/comments`,
      { params, withCredentials: true },
    );
  }

  // Carga las respuestas directas de un comentario.
  getCommentReplies(
    commentId: number,
    page = 1,
    pageSize = 20,
  ): Observable<CommentListResponse> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http.get<CommentListResponse>(
      `${environment.apiBaseUrl}/comments/${commentId}/replies`,
      { params, withCredentials: true },
    );
  }

  // Publica un comentario en la reseña o responde a otro comentario.
  createReviewComment(
    reviewId: number,
    text: string,
    parentId?: number,
  ): Observable<CommentApiResponse> {
    const body = parentId === undefined ? { text } : { text, parentId };

    return this.http.post<CommentApiResponse>(
      `${environment.apiBaseUrl}/reviews/${reviewId}/comments`,
      body,
      {
        withCredentials: true,
        headers: new HttpHeaders({ 'X-Jukeboxd-Request': '1' }),
      },
    );
  }
}