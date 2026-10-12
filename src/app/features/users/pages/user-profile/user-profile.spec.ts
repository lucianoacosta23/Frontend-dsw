import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OwnProfile } from '../own-profile/own-profile';
import { AuthService } from '../../../../core/services/auth.service';
import { UserService } from '../../../../core/services/user-service';
import { PlaylistService } from '../../../../core/services/playlist.service';
import { ReviewService } from '../../../../core/services/review.service';
import { Navbar } from '../../../../shared/components/navbar/navbar';
@Component({ selector: 'app-navbar', template: '' })
class NavbarStub {}
const profile = {
  id: 17,
  username: 'public',
  fullName: 'Public person',
  createdAt: '',
  avatarUrl: null,
  coverUrl: null,
  favoriteReleases: [],
  favoriteTracks: [],
  followersCount: 0,
  followingCount: 0,
  isFollowing: false,
  followsMe: false,
  isOwnProfile: false,
};
const empty = { data: [], pagination: { page: 1, pageSize: 6, total: 0, totalPages: 0 } };
describe('Public profile integration', () => {
  const auth = {
    currentUser: signal<any>(null),
    loadSession: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 401 }))),
  };
  let users: any, playlists: any, reviews: any;
  beforeEach(() => {
    auth.currentUser.set(null);
    users = {
      getProfileByUsername: vi.fn(() => of({ data: profile })),
      getProfileById: vi.fn(() => of({ data: profile })),
    };
    playlists = { getByAuthor: vi.fn(() => of(empty)), getMine: vi.fn() };
    reviews = { getReviewsByAuthor: vi.fn(() => of(empty)) };
    TestBed.configureTestingModule({
      imports: [OwnProfile],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: UserService, useValue: users },
        { provide: PlaylistService, useValue: playlists },
        { provide: ReviewService, useValue: reviews },
      ],
    });
    TestBed.overrideComponent(OwnProfile, {
      remove: { imports: [Navbar] },
      add: { imports: [NavbarStub] },
    });
  });
  function render() {
    const fixture = TestBed.createComponent(OwnProfile);
    fixture.componentRef.setInput('publicUsername', 'public');
    fixture.detectChanges();
    return fixture;
  }
  it('renders anonymously after session 401 and loads the correct author', () => {
    const fixture = render();
    expect(fixture.nativeElement.textContent).toContain('Public person');
    expect(playlists.getByAuthor).toHaveBeenCalledWith(17, 1, 6);
    expect(playlists.getMine).not.toHaveBeenCalled();
    expect(reviews.getReviewsByAuthor).toHaveBeenCalledWith(17, 1, 6);
    expect(fixture.nativeElement.querySelector('a[href="/profile/edit"]')).toBeNull();
  });
  it('does not expose edit controls to an administrator viewing another user', () => {
    auth.currentUser.set({ id: 99, role: 'ADMIN' });
    const fixture = render();
    expect(fixture.componentInstance.isOwner()).toBe(false);
    expect(fixture.nativeElement.querySelector('a[href="/profile/edit"]')).toBeNull();
  });
  it('cancels an old profile request on navigation', () => {
    const old = new Subject();
    users.getProfileById.mockReturnValueOnce(old);
    const fixture = render();
    users.getProfileByUsername.mockReturnValue(of({ data: { ...profile, id: 18 } }));
    users.getProfileById.mockReturnValue(of({ data: { ...profile, id: 18 } }));
    fixture.componentRef.setInput('publicUsername', 'next');
    fixture.detectChanges();
    old.next({ data: profile });
    expect(fixture.componentInstance.profile()?.id).toBe(18);
    expect(playlists.getByAuthor).toHaveBeenCalledWith(18, 1, 6);
  });
});
