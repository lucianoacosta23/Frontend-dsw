import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environments';
import type { AuthUser } from '../../models/auth.models';
import type { UserProfile } from '../../models/user-profile';
import { AuthService } from './auth.service';
import { ProfileAvatarService } from './profile-avatar.service';

const account = (id: number): AuthUser => ({
  id, username: `listener${id}`, fullName: 'Listener', email: null,
  category: 'USER', createdAt: '',
});
const profile = (id: number, avatarUrl: string | null): UserProfile => ({
  id, username: `listener${id}`, fullName: 'Listener', createdAt: '', avatarUrl,
  coverUrl: null, favoriteReleases: [], favoriteTracks: [], followersCount: 0,
  followingCount: 0, isFollowing: false, followsMe: false, isOwnProfile: true,
});

describe('Shared profile avatar', () => {
  const currentUser = signal<AuthUser | null>(null);
  let http: HttpTestingController;
  let avatars: ProfileAvatarService;
  const endpoint = `${environment.apiBaseUrl}/users/me`;

  beforeEach(() => {
    currentUser.set(null);
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthService, useValue: { currentUser } },
    ] });
    http = TestBed.inject(HttpTestingController);
    avatars = TestBed.inject(ProfileAvatarService);
  });
  afterEach(() => http.verify());

  it('does not fetch a profile for visitors', () => {
    TestBed.tick();
    expect(avatars.url()).toBeNull();
    http.expectNone(endpoint);
  });

  it('shares one request and cached photo across consumers and same-account session refreshes', () => {
    currentUser.set(account(1));
    TestBed.tick();
    expect(TestBed.inject(ProfileAvatarService)).toBe(avatars);
    const request = http.expectOne(endpoint);
    expect(request.request.withCredentials).toBe(true);
    expect(avatars.url()).toBeNull();
    request.flush({ data: profile(1, '/media/first.webp') });
    currentUser.set({ ...account(1), username: 'renamed' });
    TestBed.tick();
    expect(avatars.url()).toBe('/media/first.webp');
    http.expectNone(endpoint);
  });

  it('cancels pending requests on logout and fetches again on a new login', () => {
    currentUser.set(account(1));
    TestBed.tick();
    const pending = http.expectOne(endpoint);
    currentUser.set(null);
    expect(avatars.url()).toBeNull();
    TestBed.tick();
    expect(pending.cancelled).toBe(true);
    currentUser.set(account(1));
    TestBed.tick();
    http.expectOne(endpoint).flush({ data: profile(1, '/media/new-session.webp') });
    expect(avatars.url()).toBe('/media/new-session.webp');
  });

  it('hides cached photos immediately and cancels requests when the account changes', () => {
    currentUser.set(account(1));
    TestBed.tick();
    http.expectOne(endpoint).flush({ data: profile(1, '/media/first.webp') });
    currentUser.set(account(2));
    expect(avatars.url()).toBeNull();
    TestBed.tick();
    const pending = http.expectOne(endpoint);
    currentUser.set(account(3));
    TestBed.tick();
    expect(pending.cancelled).toBe(true);
    http.expectOne(endpoint).flush({ data: profile(3, '/media/third.webp') });
    expect(avatars.url()).toBe('/media/third.webp');
  });

  it('ignores an old response arriving before the session-change effect runs', () => {
    currentUser.set(account(1));
    TestBed.tick();
    const old = http.expectOne(endpoint);
    currentUser.set(account(2));
    old.flush({ data: profile(1, '/media/old.webp') });
    expect(avatars.url()).toBeNull();
    TestBed.tick();
    http.expectOne(endpoint).flush({ data: profile(2, '/media/current.webp') });
    avatars.updateFromProfile(profile(1, '/media/late-save.webp'));
    expect(avatars.url()).toBe('/media/current.webp');
  });

  it('updates a saved or removed avatar and prevents an older GET from overwriting it', () => {
    currentUser.set(account(1));
    TestBed.tick();
    const pending = http.expectOne(endpoint);
    avatars.updateFromProfile(profile(1, '/media/saved.webp'));
    expect(pending.cancelled).toBe(true);
    expect(avatars.url()).toBe('/media/saved.webp');
    avatars.updateFromProfile(profile(1, null));
    TestBed.tick();
    expect(avatars.url()).toBeNull();
    http.expectNone(endpoint);
  });

  it('uses the fallback on errors without changing the session or retrying every render', () => {
    const user = account(1);
    currentUser.set(user);
    TestBed.tick();
    http.expectOne(endpoint).flush({}, { status: 500, statusText: 'Unavailable' });
    TestBed.tick();
    expect(avatars.url()).toBeNull();
    expect(currentUser()).toBe(user);
    http.expectNone(endpoint);
  });

  it('rejects a profile returned for a different account', () => {
    currentUser.set(account(1));
    TestBed.tick();
    http.expectOne(endpoint).flush({ data: profile(2, '/media/wrong.webp') });
    expect(avatars.url()).toBeNull();
  });
});
