import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../environments/environments';
import { AuthService } from './services/auth.service';
import { authGuard } from './guards/auth-guard';
import { guestGuard } from './guards/guest-guard';
import { accountRestrictionInterceptor } from './interceptors/account-restriction.interceptor';
import { readAccountRestriction } from '../models/account-restriction';
import { OwnProfile } from '../features/users/pages/own-profile/own-profile';
import { Login } from '../features/auth/pages/login/login';
import { Navbar } from '../shared/components/navbar/navbar';

@Component({ selector: 'app-navbar', template: '' })
class NavbarStub {}
const until = '2026-10-20T18:00:00.000Z';
const suspended = { code: 'ACCOUNT_SUSPENDED', suspendedUntil: until };
const publicSuspended = { code: 'PROFILE_SUSPENDED', suspendedUntil: until };
const user = { id: 7, username: 'listener', fullName: 'Persona', email: 'a@example.test', category: 'USER', createdAt: '2026-01-01' };

describe('Account restrictions', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), provideHttpClient(withInterceptors([accountRestrictionInterceptor])), provideHttpClientTesting(),
    ] });
    TestBed.overrideComponent(OwnProfile, { remove: { imports: [Navbar] }, add: { imports: [NavbarStub] } });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });
  afterEach(() => http.verify());
  const flushSession = (body: object, status = 403) => {
    const req = http.expectOne(`${environment.apiBaseUrl}/auth/me`);
    expect(req.request.withCredentials).toBe(true);
    req.flush(body, { status, statusText: status === 200 ? 'OK' : 'Restricted' });
  };
  const route = (restrictedView = false) => Object.assign(new ActivatedRouteSnapshot(), { data: { restrictionView: restrictedView } });
  const state = { url: '/profile' } as RouterStateSnapshot;

  it('does not confuse ordinary permissions, missing users or target restrictions with account sanctions', () => {
    expect(readAccountRestriction(new HttpErrorResponse({ status: 403, error: { message: 'Forbidden' } }))).toBeNull();
    expect(readAccountRestriction(new HttpErrorResponse({ status: 404, error: { message: 'Not found' } }))).toBeNull();
    expect(readAccountRestriction(new HttpErrorResponse({ status: 403, error: publicSuspended }))).toBeNull();
    expect(readAccountRestriction(new HttpErrorResponse({ status: 404, error: { ...publicSuspended, suspendedUntil: 'invalid' } }))?.suspendedUntil).toBeNull();
  });

  it('allows only the profile restriction view; other guarded pages still redirect', async () => {
    const blocked = TestBed.runInInjectionContext(() => authGuard(route(), state)) as Observable<unknown>;
    const denied = firstValueFrom(blocked);
    flushSession(suspended);
    expect(TestBed.inject(Router).serializeUrl(await denied as never)).toContain('/login');
    expect(auth.currentUser()).toBeNull();
    const profile = TestBed.runInInjectionContext(() => authGuard(route(true), state)) as Observable<unknown>;
    const allowed = firstValueFrom(profile);
    flushSession(suspended);
    expect(await allowed).toBe(true);
  });

  it('does not admit anonymous users to Mi perfil', async () => {
    const result = TestBed.runInInjectionContext(() => authGuard(route(true), state)) as Observable<unknown>;
    const verdict = firstValueFrom(result);
    flushSession({ message: 'Debe iniciar sesión' }, 401);
    expect(TestBed.inject(Router).serializeUrl(await verdict as never)).toContain('/login');
  });

  it('allows the login page to display a restricted existing session', async () => {
    const result = TestBed.runInInjectionContext(() => guestGuard(route(), state)) as Observable<unknown>;
    const verdict = firstValueFrom(result);
    flushSession(suspended);
    expect(await verdict).toBe(true);
    expect(auth.restriction()?.status).toBe('SUSPENDED');
  });

  it('renders login suspension and clears it on successful login of another account', async () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({ email: 'a@example.test', password: 'password' });
    fixture.componentInstance.submit();
    http.expectOne(`${environment.apiBaseUrl}/auth/login`).flush(suspended, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cuenta suspendida');
    expect(fixture.nativeElement.textContent).toContain('20/10/2026');
    expect(fixture.nativeElement.querySelector('input[type=email]')).not.toBeNull();
    const next = firstValueFrom(auth.login({ email: 'other@example.test', password: 'password' }));
    const req = http.expectOne(`${environment.apiBaseUrl}/auth/login`);
    expect(req.request.withCredentials).toBe(true);
    req.flush({ message: 'OK', data: user });
    await next;
    fixture.detectChanges();
    expect(auth.restriction()).toBeNull();
    expect(auth.currentUser()?.id).toBe(7);
    expect(fixture.nativeElement.textContent).not.toContain('Cuenta suspendida');
  });

  it('Mi perfil shows only the sanction, without fetching reviews or playlists', () => {
    const fixture = TestBed.createComponent(OwnProfile);
    fixture.detectChanges();
    flushSession(suspended);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cuenta suspendida');
    expect(fixture.nativeElement.querySelector('.profile-header')).toBeNull();
    expect(fixture.nativeElement.querySelector('.edit-button')).toBeNull();
    http.expectNone(`${environment.apiBaseUrl}/users/me`);
  });

  it('public suspended and banned profiles expose no identity and never restrict the active viewer', () => {
    const fixture = TestBed.createComponent(OwnProfile);
    fixture.componentRef.setInput('publicUsername', 'hidden');
    fixture.detectChanges();
    flushSession({ data: user }, 200);
    http.expectOne(req => req.url.endsWith('/users/search') && req.params.get('username') === 'hidden')
      .flush(publicSuspended, { status: 404, statusText: 'Not found' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cuenta suspendida');
    expect(fixture.nativeElement.querySelector('.identity')).toBeNull();
    expect(auth.currentUser()?.id).toBe(7);
    expect(auth.restriction()).toBeNull();
    fixture.componentInstance.loadProfile();
    http.expectOne(req => req.url.endsWith('/users/search'))
      .flush({ code: 'PROFILE_BANNED', suspendedUntil: null }, { status: 404, statusText: 'Not found' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cuenta baneada');
    expect(auth.currentUser()?.id).toBe(7);
  });

  it('can consult again after reactivation and returns to the normal empty profile', () => {
    const fixture = TestBed.createComponent(OwnProfile);
    fixture.detectChanges();
    flushSession(suspended);
    fixture.detectChanges();
    fixture.componentInstance.loadProfile();
    flushSession({ data: user }, 200);
    http.expectOne(`${environment.apiBaseUrl}/users/me`).flush({ data: {
      ...user, avatarUrl: null, coverUrl: null, favoriteReleases: [], favoriteTracks: [],
      followersCount: 0, followingCount: 0, isFollowing: false, followsMe: false, isOwnProfile: true,
    } });
    http.match(req => req.url.includes('/playlist') || req.url.endsWith('/reviews')).forEach(req => {
      req.flush({ data: [], pagination: { page: 1, pageSize: 6, total: 0, totalPages: 0 } });
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Cuenta suspendida');
    expect(fixture.nativeElement.querySelector('.edit-button')).not.toBeNull();
  });
});
