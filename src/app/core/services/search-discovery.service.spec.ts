import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchService } from './search.service';
import { SearchDiscoveryService } from './search-discovery.service';
import type { SearchEntry } from '../../models/search-view';

describe('Search discovery services', () => {
  const api = {
    search: vi.fn(),
    searchSpotifyMusic: vi.fn(),
    importSpotifyArtist: vi.fn(),
    importSpotifyTrack: vi.fn(),
    importSpotifyAlbum: vi.fn(),
  };
  beforeEach(() => {
    vi.clearAllMocks();
    api.search.mockReturnValue(
      of({
        data: {
          artists: [{ id: 1, name: 'Local', imageUrl: null }],
          tracks: [],
          releases: [],
          playlists: [],
          users: [],
        },
      }),
    );
    api.searchSpotifyMusic.mockReturnValue(of({ data: { artists: [], tracks: [], albums: [] } }));
    api.importSpotifyArtist.mockReturnValue(of({ data: { artistId: 9 } }));
    api.importSpotifyTrack.mockReturnValue(of({ data: { trackId: 8 } }));
    api.importSpotifyAlbum.mockReturnValue(of({ data: { releaseId: 7 } }));
    TestBed.configureTestingModule({ providers: [{ provide: SearchService, useValue: api }] });
  });
  it('keeps local results when Spotify fails without importing any result', async () => {
    api.searchSpotifyMusic.mockReturnValue(throwError(() => new Error('unavailable')));
    const response = await firstValueFrom(TestBed.inject(SearchDiscoveryService).search('Local'));
    expect(response.groups[0].entries[0].name).toBe('Local');
    expect(response.warning).toBeTruthy();
    expect(api.importSpotifyArtist).not.toHaveBeenCalled();
    expect(api.importSpotifyTrack).not.toHaveBeenCalled();
    expect(api.importSpotifyAlbum).not.toHaveBeenCalled();
  });
  it('does not query Spotify when only playlists or people are selected', async () => {
    await firstValueFrom(
      TestBed.inject(SearchDiscoveryService).search('Local', ['users', 'playlists']),
    );
    expect(api.search).toHaveBeenCalledWith('Local', ['users', 'playlists']);
    expect(api.searchSpotifyMusic).not.toHaveBeenCalled();
  });
  it('opens local destinations directly and imports selected external targets only', async () => {
    const discovery = TestBed.inject(SearchDiscoveryService);
    const entry: SearchEntry = {
      key: 'local',
      type: 'artists',
      name: 'Artist',
      subtitle: '',
      label: 'Artista',
      imageUrl: null,
      target: { source: 'local', url: '/artists/1' },
    };
    expect(await firstValueFrom(discovery.open(entry))).toBe('/artists/1');
    expect(api.importSpotifyArtist).not.toHaveBeenCalled();
    for (const [type, expected] of [
      ['artists', '/artists/9'],
      ['tracks', '/tracks/8'],
      ['releases', '/releases/7'],
    ] as const) {
      expect(
        await firstValueFrom(
          discovery.open({ ...entry, target: { source: 'spotify', type, id: 'remote' } }),
        ),
      ).toBe(expected);
    }
    expect(api.importSpotifyArtist).toHaveBeenCalledTimes(1);
    expect(api.importSpotifyTrack).toHaveBeenCalledTimes(1);
    expect(api.importSpotifyAlbum).toHaveBeenCalledTimes(1);
  });
});
