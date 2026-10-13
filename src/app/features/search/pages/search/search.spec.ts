import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Search } from './search';
import { SearchService } from '../../../../core/services/search.service';
import type { SearchResponse } from '../../../../models/search';
import { signal } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';

describe('Search query from navbar', () => {
  const params = new BehaviorSubject(convertToParamMap({}));
  const service = { search: vi.fn(), searchSpotifyMusic: vi.fn() };

  beforeEach(() => {
    params.next(convertToParamMap({}));
    vi.clearAllMocks();
    service.search.mockReturnValue(
      of({ data: { tracks: [], releases: [], artists: [], playlists: [], users: [] } }),
    );
    service.searchSpotifyMusic.mockReturnValue(
      of({ data: { albums: [], tracks: [], artists: [] } }),
    );
    TestBed.configureTestingModule({
      imports: [Search],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: params.asObservable() } },
        { provide: SearchService, useValue: service },
        {
          provide: AuthService,
          useValue: { currentUser: signal({ id: 1, username: 'listener', category: 'USER' }) },
        },
      ],
    });
  });

  it('executes the query in the URL and keeps its text', () => {
    params.next(convertToParamMap({ q: 'Sade' }));
    const fixture = TestBed.createComponent(Search);
    fixture.detectChanges();
    expect(fixture.componentInstance.query).toBe('Sade');
    expect(service.search).toHaveBeenCalledWith('Sade', []);
    expect(service.searchSpotifyMusic).toHaveBeenCalledWith('Sade', ['album', 'track', 'artist']);
    expect(fixture.componentInstance.hasSearched()).toBe(true);
  });

  it('does not query services when opening /search without a query', () => {
    const fixture = TestBed.createComponent(Search);
    fixture.detectChanges();
    expect(service.search).not.toHaveBeenCalled();
    expect(fixture.componentInstance.hasSearched()).toBe(false);
  });

  it('cancels an older query and searches again when the navbar changes the URL', () => {
    const pending = new Subject<SearchResponse>();
    service.search.mockReturnValueOnce(pending);
    params.next(convertToParamMap({ q: 'first' }));
    const fixture = TestBed.createComponent(Search);
    fixture.detectChanges();
    expect(pending.observed).toBe(true);
    params.next(convertToParamMap({ q: 'second' }));
    expect(pending.observed).toBe(false);
    expect(fixture.componentInstance.query).toBe('second');
    expect(service.search).toHaveBeenLastCalledWith('second', []);
    fixture.destroy();
    params.next(convertToParamMap({ q: 'third' }));
    expect(service.search).toHaveBeenCalledTimes(2);
  });

  it('validates a URL query before calling services', () => {
    params.next(convertToParamMap({ q: 'a'.repeat(256) }));
    const fixture = TestBed.createComponent(Search);
    fixture.detectChanges();
    expect(service.search).not.toHaveBeenCalled();
    expect(fixture.componentInstance.errorMessage()).toContain('255');
  });
  it('renders artists from both sources in a single section and no source labels', () => {
    service.search.mockReturnValue(
      of({
        data: {
          artists: [{ id: 1, name: 'Sade', spotifyId: 'sade', imageUrl: null }],
          tracks: [],
          releases: [],
          playlists: [],
          users: [],
        },
      }),
    );
    service.searchSpotifyMusic.mockReturnValue(
      of({
        data: {
          artists: [
            { id: 'sade', name: 'Sade', images: [], external_urls: { spotify: '' } },
            { id: 'tribute', name: 'Sade Tribute', images: [], external_urls: { spotify: '' } },
          ],
          tracks: [],
          albums: [],
        },
      }),
    );
    params.next(convertToParamMap({ q: 'Sade' }));
    const fixture = TestBed.createComponent(Search);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('#results-artists')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('app-search-result')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).not.toContain('de Spotify');
    expect(fixture.componentInstance.totalResults()).toBe(2);
  });
  it('preserves filters and clears results when navigating back to a blank search', () => {
    params.next(convertToParamMap({ q: 'Sade' }));
    const fixture = TestBed.createComponent(Search);
    fixture.detectChanges();
    fixture.componentInstance.toggleFilter('users');
    expect(service.search).toHaveBeenLastCalledWith('Sade', ['users']);
    fixture.componentInstance.selectAll();
    expect(service.search).toHaveBeenLastCalledWith('Sade', []);
    params.next(convertToParamMap({}));
    fixture.detectChanges();
    expect(fixture.componentInstance.hasSearched()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('¿Qué te gustaría escuchar?');
  });
  it('shows loading and a retryable failure while preserving the query', () => {
    const pending = new Subject<SearchResponse>();
    service.search.mockReturnValueOnce(pending);
    params.next(convertToParamMap({ q: 'Sade' }));
    const fixture = TestBed.createComponent(Search);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Buscando conexiones');
    pending.error(new Error('offline'));
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    fixture.nativeElement.querySelector('.text-button').click();
    expect(service.search).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.query).toBe('Sade');
  });
  it('keeps local cards visible on an external failure and preserves their real links', () => {
    service.search.mockReturnValue(of({ data: { artists: [], tracks: [], releases: [], playlists: [{ id: 4, name: 'Late nights', userId: 8 }], users: [] } }));
    service.searchSpotifyMusic.mockReturnValue(throwError(() => new Error('external offline')));
    params.next(convertToParamMap({ q: 'nights' }));
    const fixture = TestBed.createComponent(Search);
    fixture.detectChanges();
    expect(fixture.componentInstance.warning()).toBeTruthy();
    expect(fixture.nativeElement.querySelector('a.result').getAttribute('href')).toBe('/playlists/4');
    expect(fixture.nativeElement.querySelector('#results-playlists')).not.toBeNull();
  });
});
