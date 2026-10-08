import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { UserService } from './user-service';
import { environment } from '../../../environments/environments';
import { resolveMediaUrl } from '../utils/media-url';
describe('Profile HTTP contracts', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('sends multipart with cookies and mutation header, without explicit content type', () => {
    TestBed.inject(UserService)
      .uploadProfileImage(new File(['x'], 'a.png'), 'cover')
      .subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/users/me/images`);
    expect(req.request.body.get('purpose')).toBe('cover');
    expect(req.request.body.get('file').name).toBe('a.png');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('X-Jukeboxd-Request')).toBe('1');
    expect(req.request.headers.has('Content-Type')).toBe(false);
    req.flush({});
  });
  it('sends only selected PATCH fields', () => {
    const patch = { coverImageId: null, favoriteReleaseIds: [], favoriteTrackIds: [9, 2] };
    TestBed.inject(UserService).updateOwnProfile(patch).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/users/me/profile`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(patch);
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });
  it('resolves media against API origin and rejects executable URLs', () => {
    expect(resolveMediaUrl('/media/a.webp', 'http://127.0.0.1:3000/api')).toBe(
      'http://127.0.0.1:3000/media/a.webp',
    );
    expect(resolveMediaUrl('https://images.example/a.png')).toBe('https://images.example/a.png');
    expect(resolveMediaUrl('javascript:alert(1)')).toBeNull();
  });
});
