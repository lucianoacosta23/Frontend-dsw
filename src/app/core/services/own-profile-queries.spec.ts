import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ReviewService } from './review.service';
import { PlaylistService } from './playlist.service';
import { environment } from '../../../environments/environments';

describe('Own profile queries', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('requests only authored reviews with newest sorting and bounded pagination', () => {
    TestBed.inject(ReviewService).getReviewsByAuthor(37, 2, 6).subscribe();
    const request = http.expectOne((req) => req.url === `${environment.apiBaseUrl}/reviews`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('authorId')).toBe('37');
    expect(request.request.params.get('sort')).toBe('newest');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('pageSize')).toBe('6');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ data: [], pagination: { page: 2, pageSize: 6, total: 0, totalPages: 0 } });
  });

  it('uses the own-playlists endpoint and session without adding author or image fields', () => {
    TestBed.inject(PlaylistService).getMine(3, 6).subscribe();
    const request = http.expectOne((req) => req.url === `${environment.apiBaseUrl}/playlist/mine`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys().sort()).toEqual(['page', 'pageSize']);
    expect(request.request.params.get('page')).toBe('3');
    expect(request.request.params.get('pageSize')).toBe('6');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ data: [], pagination: { page: 3, pageSize: 6, total: 0, totalPages: 0 } });
  });
});
