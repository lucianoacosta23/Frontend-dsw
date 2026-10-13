import { describe, expect, it } from 'vitest';
import { combineSearchResults, topSuggestions } from './search-view';
import type { SearchResults, SpotifyMusicSearchResponse } from './search';

const emptyLocal = (): SearchResults => ({
  tracks: [],
  releases: [],
  artists: [],
  playlists: [],
  users: [],
});
const emptyRemote = (): SpotifyMusicSearchResponse['data'] => ({
  albums: [],
  tracks: [],
  artists: [],
});

describe('Unified search presentation', () => {
  it('uses one artist section, removes duplicate Spotify IDs and prefers the local destination', () => {
    const local = emptyLocal();
    local.artists = [{ id: 7, name: 'Sade', spotifyId: 'sade', imageUrl: null }];
    const remote = emptyRemote();
    remote.artists = [
      { id: 'sade', name: 'Sade', images: [], external_urls: { spotify: '' } },
      { id: 'band', name: 'Sade Tribute', images: [], external_urls: { spotify: '' } },
      { id: 'band', name: 'Sade Tribute', images: [], external_urls: { spotify: '' } },
    ];
    const artists = combineSearchResults(local, remote, 'Sade')[0];
    expect(artists.entries).toHaveLength(2);
    expect(artists.entries[0].target).toEqual({ source: 'local', url: '/artists/7' });
    expect(artists.title).toBe('Artistas');
  });
  it('does not merge different artists just because their names match', () => {
    const local = emptyLocal();
    local.artists = [{ id: 1, name: 'Phoenix', imageUrl: null }];
    const remote = emptyRemote();
    remote.artists = [{ id: 'other', name: 'Phoenix', images: [], external_urls: { spotify: '' } }];
    expect(combineSearchResults(local, remote, 'Phoenix')[0].entries).toHaveLength(2);
  });
  it('deduplicates tracks and releases by IDs independently', () => {
    const local = emptyLocal();
    local.tracks = [{ id: 2, spotifyId: 'track', name: 'Song' }];
    local.releases = [
      {
        id: 3,
        spotifyId: 'release',
        name: 'Album',
        imageUrl: null,
        type: 'ALBUM',
        releaseDate: '2000',
      },
    ];
    const remote = emptyRemote();
    remote.tracks = [
      {
        id: 'track',
        name: 'Song',
        duration_ms: 100,
        artists: [],
        album: { name: 'Album', images: [] },
        external_urls: { spotify: '' },
      },
    ];
    remote.albums = [
      {
        id: 'release',
        name: 'Album',
        release_date: '2000',
        artists: [],
        images: [],
        external_urls: { spotify: '' },
      },
    ];
    const groups = combineSearchResults(local, remote, 'Song');
    expect(groups.find((group) => group.type === 'tracks')?.entries).toHaveLength(1);
    expect(groups.find((group) => group.type === 'releases')?.entries).toHaveLength(1);
  });
  it('ranks exact and accented matches first, limits suggestions and does not mutate groups', () => {
    const local = emptyLocal();
    local.artists = Array.from({ length: 7 }, (_, i) => ({
      id: i,
      name: i === 6 ? 'Björk' : 'Björk Tribute ' + i,
      imageUrl: null,
    }));
    const groups = combineSearchResults(local, emptyRemote(), 'bjork');
    const suggestions = topSuggestions(groups, 'bjork');
    expect(suggestions).toHaveLength(5);
    expect(suggestions[0].name).toBe('Björk');
    expect(groups[0].entries).toHaveLength(7);
  });
});
