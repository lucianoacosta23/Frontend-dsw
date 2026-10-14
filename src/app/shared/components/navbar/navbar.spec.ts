import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, tap } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Navbar } from './navbar';
import { AuthService } from '../../../core/services/auth.service';
import { SearchDiscoveryService } from '../../../core/services/search-discovery.service';
import { UserService } from '../../../core/services/user-service';
import { ProfileAvatarService } from '../../../core/services/profile-avatar.service';
import type { UserProfile, UserProfileResponse } from '../../../models/user-profile';

const ownProfile = (id: number, avatarUrl: string | null): UserProfile => ({
  id, username: 'listener', fullName: 'Listener', createdAt: '', avatarUrl,
  coverUrl: null, favoriteReleases: [], favoriteTracks: [], followersCount: 0,
  followingCount: 0, isFollowing: false, followsMe: false, isOwnProfile: true,
});

describe('Navbar search', () => {
  const currentUser = signal<{ id: number; username: string; category: string } | null>(null);
  const getOwnProfile = vi.fn();

  beforeEach(() => {
    currentUser.set(null);
    getOwnProfile.mockReset().mockImplementation(() => of({ data: ownProfile(currentUser()?.id ?? 0, null) }));
    TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser, logout: () => of(undefined).pipe(tap(() => currentUser.set(null))) } },
        { provide: UserService, useValue: { getOwnProfile } },
        {
          provide: SearchDiscoveryService,
          useValue: { search: () => of({ groups: [], warning: null }) },
        },
      ],
    });
  });

  it('offers a direct login link and separate registration without the visitor dropdown', async () => {
    const fixture = TestBed.createComponent(Navbar);
    await fixture.whenStable();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.login-link');
    expect(link.getAttribute('href')).toBe('/login');
    expect(link.textContent).toContain('Iniciar sesión');
    expect(fixture.nativeElement.querySelector('.signup-link').getAttribute('href')).toBe('/register');
    expect(fixture.nativeElement.querySelector('details')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Ingresar con email');
    expect(fixture.nativeElement.textContent).not.toContain('Entrar con Spotify');
    expect(getOwnProfile).not.toHaveBeenCalled();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    link.click();
    const target = navigate.mock.calls[0][0];
    expect(typeof target === 'string' ? target : router.serializeUrl(target)).toBe('/login');
  });

  it('shows the username initial while loading and reuses one profile request across navbars', async () => {
    const response = new Subject<UserProfileResponse>();
    getOwnProfile.mockReturnValue(response);
    currentUser.set({ id: 1, username: 'listener', category: 'USER' });
    const first = TestBed.createComponent(Navbar);
    const second = TestBed.createComponent(Navbar);
    await first.whenStable();
    await second.whenStable();
    expect(getOwnProfile).toHaveBeenCalledTimes(1);
    expect(first.nativeElement.querySelector('.nav-avatar').textContent.trim()).toBe('L');
    response.next({ message: 'OK', data: ownProfile(1, '/media/avatar.webp') });
    response.complete();
    await first.whenStable();
    await second.whenStable();
    for (const fixture of [first, second]) {
      const image: HTMLImageElement = fixture.nativeElement.querySelector('.nav-avatar img');
      expect(image.getAttribute('src')).toContain('/media/avatar.webp');
      expect(image.closest('summary')).not.toBeNull();
      expect(fixture.nativeElement.querySelectorAll('summary a, summary button, summary input')).toHaveLength(0);
      expect(fixture.nativeElement.querySelector('.nav-avatar app-release-cover')).toBeNull();
      const menu: HTMLDetailsElement = fixture.nativeElement.querySelector('.user-menu');
      image.click();
      expect(menu.open).toBe(true);
      fixture.nativeElement.querySelector('.menu-label').click();
      expect(menu.open).toBe(false);
    }
  });

  it('uses the initial without a photo and after an image load error', async () => {
    currentUser.set({ id: 1, username: 'listener', category: 'USER' });
    const fixture = TestBed.createComponent(Navbar);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.nav-avatar').textContent.trim()).toBe('L');
    TestBed.inject(ProfileAvatarService).updateFromProfile(ownProfile(1, '/media/broken.webp'));
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.nav-avatar img').dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.nav-avatar img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.nav-avatar').textContent.trim()).toBe('L');
    expect(fixture.nativeElement.querySelector('.menu-label').textContent).toContain('listener');
  });

  it('updates all menu avatars after a saved profile and clears them on logout', async () => {
    currentUser.set({ id: 1, username: 'listener', category: 'USER' });
    const fixture = TestBed.createComponent(Navbar);
    await fixture.whenStable();
    const avatar = TestBed.inject(ProfileAvatarService);
    avatar.updateFromProfile(ownProfile(1, '/media/changed.webp'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.nav-avatar img').getAttribute('src')).toContain('/media/changed.webp');
    avatar.updateFromProfile(ownProfile(1, null));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.nav-avatar').textContent.trim()).toBe('L');
    avatar.updateFromProfile(ownProfile(1, '/media/restored.webp'));
    expect(avatar.url()).toBe('/media/restored.webp');
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance.logout();
    await fixture.whenStable();
    expect(avatar.url()).toBeNull();
    expect(fixture.nativeElement.querySelector('summary')).toBeNull();
    expect(fixture.nativeElement.querySelector('.login-link')).not.toBeNull();
  });

  it('lets visitors type without navigating and preserves the submitted query through login', async () => {
    const fixture = TestBed.createComponent(Navbar);
    await fixture.whenStable();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="search"]');
    input.value = 'MF DOOM & friends';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(navigate).not.toHaveBeenCalled();
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/search?q=MF%20DOOM%20%26%20friends' },
    });
  });

  it('opens the search with a trimmed query for a signed-in user', () => {
    currentUser.set({ id: 1, username: 'listener', category: 'USER' });
    const fixture = TestBed.createComponent(Navbar);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance.query = '  Sade  ';
    fixture.componentInstance.submitSearch();
    const destination = navigate.mock.calls[0][0];
    expect(typeof destination === 'string' ? destination : router.serializeUrl(destination)).toBe(
      '/search?q=Sade',
    );
  });

  it('does not submit an empty or excessively long query', () => {
    const fixture = TestBed.createComponent(Navbar);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate');
    fixture.componentInstance.query = '   ';
    fixture.componentInstance.submitSearch();
    fixture.componentInstance.query = 'a'.repeat(256);
    fixture.componentInstance.submitSearch();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows the shared home identity and keeps account permissions', async () => {
    currentUser.set({ id: 1, username: 'admin', category: 'ADMIN' });
    const fixture = TestBed.createComponent(Navbar);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe(
      '/jukeboxd-logo.svg',
    );
    expect(fixture.nativeElement.querySelector('a[href="/admin"]')).not.toBeNull();
    currentUser.set({ id: 2, username: 'listener', category: 'USER' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[href="/admin"]')).toBeNull();
  });

  it('closes on outside clicks and Escape, but keeps the menu open when its background is clicked', async () => {
    currentUser.set({ id: 1, username: 'listener', category: 'USER' });
    const fixture = TestBed.createComponent(Navbar);
    await fixture.whenStable();
    const menu: HTMLDetailsElement = fixture.nativeElement.querySelector('details');
    menu.open = true;
    menu.querySelector('.dropdown')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(menu.open).toBe(true);
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(menu.open).toBe(false);
    menu.open = true;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(menu.open).toBe(false);
    expect(document.activeElement).toBe(menu.querySelector('summary'));
  });

  it('closes when a menu action is selected or keyboard focus leaves the menu', async () => {
    currentUser.set({ id: 1, username: 'listener', category: 'USER' });
    const fixture = TestBed.createComponent(Navbar);
    await fixture.whenStable();
    const menu: HTMLDetailsElement = fixture.nativeElement.querySelector('details');
    menu.open = true;
    const action = menu.querySelector('button')!;
    fixture.componentInstance.onDocumentClick({ target: action } as unknown as MouseEvent);
    expect(menu.open).toBe(false);
    menu.open = true;
    fixture.nativeElement.querySelector('input').focus();
    expect(menu.open).toBe(false);
  });
});
