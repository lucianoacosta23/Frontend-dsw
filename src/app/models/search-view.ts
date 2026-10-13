import type { SearchResults, SearchType, SpotifyMusicSearchResponse } from './search';

// Modelo de presentación del frontend; no cambia los contratos de las APIs.
export interface SearchEntry {
  key: string;
  type: SearchType;
  name: string;
  subtitle: string;
  label: string;
  imageUrl: string | null;
  target:
    | { source: 'local'; url: string }
    | { source: 'spotify'; id: string; type: 'artists' | 'tracks' | 'releases' };
}

export interface SearchGroup {
  type: SearchType;
  title: string;
  entries: SearchEntry[];
}

export const searchCategories: Array<{ type: SearchType; label: string }> = [
  { type: 'artists', label: 'Artistas' },
  { type: 'tracks', label: 'Canciones' },
  { type: 'releases', label: 'Lanzamientos' },
  { type: 'playlists', label: 'Playlists' },
  { type: 'users', label: 'Personas' },
];

const releaseLabels: Record<string, string> = {
  ALBUM: 'Álbum',
  album: 'Álbum',
  EP: 'EP',
  SINGLE: 'Single',
  single: 'Single',
  MIXTAPE: 'Mixtape',
  COMPILATION: 'Compilación',
  compilation: 'Compilación',
};
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim();

export function relevance(entry: SearchEntry, query: string): number {
  const name = normalize(entry.name);
  const text = normalize(query);
  if (!text) return 0;
  if (name === text) return 0;
  if (name.startsWith(text)) return 1;
  if (name.includes(text)) return 2;
  if (text.split(/\s+/).every((word) => name.includes(word))) return 3;
  if (normalize(entry.subtitle).includes(text)) return 4;
  return 5;
}

export function combineSearchResults(
  local: SearchResults,
  spotify: SpotifyMusicSearchResponse['data'],
  query: string,
): SearchGroup[] {
  const groups: SearchGroup[] = searchCategories.map((category) => ({
    type: category.type,
    title: category.label,
    entries: [],
  }));
  const add = (entry: SearchEntry) =>
    groups.find((group) => group.type === entry.type)?.entries.push(entry);
  const localEntry = (
    type: SearchType,
    id: number,
    name: string,
    subtitle: string,
    label: string,
    imageUrl: string | null,
    url: string,
  ): SearchEntry => ({
    key: `${type}:local:${id}`,
    type,
    name,
    subtitle,
    label,
    imageUrl,
    target: { source: 'local', url },
  });
  const remoteEntry = (
    type: 'artists' | 'tracks' | 'releases',
    id: string,
    name: string,
    subtitle: string,
    label: string,
    imageUrl: string | null,
  ): SearchEntry => ({
    key: `${type}:spotify:${id}`,
    type,
    name,
    subtitle,
    label,
    imageUrl,
    target: { source: 'spotify', type, id },
  });

  local.artists.forEach((item) =>
    add(
      localEntry(
        'artists',
        item.id,
        item.name,
        'Artista',
        'Artista',
        item.imageUrl,
        `/artists/${item.id}`,
      ),
    ),
  );
  local.tracks.forEach((item) =>
    add(
      localEntry(
        'tracks',
        item.id,
        item.name,
        item.artists?.map((artist) => artist.name).join(', ') || item.release?.name || 'Canción',
        'Canción',
        item.release?.imageUrl ?? null,
        `/tracks/${item.id}`,
      ),
    ),
  );
  local.releases.forEach((item) =>
    add(
      localEntry(
        'releases',
        item.id,
        item.name,
        [releaseLabels[item.type] ?? 'Lanzamiento', item.releaseDate?.slice(0, 4)]
          .filter(Boolean)
          .join(' · '),
        releaseLabels[item.type] ?? 'Lanzamiento',
        item.imageUrl,
        `/releases/${item.id}`,
      ),
    ),
  );
  local.playlists.forEach((item) =>
    add(
      localEntry(
        'playlists',
        item.id,
        item.name,
        'Playlist',
        'Playlist',
        null,
        `/playlists/${item.id}`,
      ),
    ),
  );
  local.users.forEach((item) =>
    add(
      localEntry(
        'users',
        item.id,
        item.fullName || item.username,
        `@${item.username}`,
        'Persona',
        null,
        `/users/${encodeURIComponent(item.username)}`,
      ),
    ),
  );

  const artistIds = new Set(local.artists.map((item) => item.spotifyId).filter(Boolean));
  const trackIds = new Set(local.tracks.map((item) => item.spotifyId).filter(Boolean));
  const releaseIds = new Set(local.releases.map((item) => item.spotifyId).filter(Boolean));
  spotify.artists.forEach((item) => {
    if (artistIds.has(item.id)) return;
    artistIds.add(item.id);
    add(
      remoteEntry('artists', item.id, item.name, 'Artista', 'Artista', item.images[0]?.url ?? null),
    );
  });
  spotify.tracks.forEach((item) => {
    if (trackIds.has(item.id)) return;
    trackIds.add(item.id);
    add(
      remoteEntry(
        'tracks',
        item.id,
        item.name,
        item.artists.map((artist) => artist.name).join(', '),
        'Canción',
        item.album.images[0]?.url ?? null,
      ),
    );
  });
  spotify.albums.forEach((item) => {
    if (releaseIds.has(item.id)) return;
    releaseIds.add(item.id);
    add(
      remoteEntry(
        'releases',
        item.id,
        item.name,
        [item.artists.map((artist) => artist.name).join(', '), item.release_date?.slice(0, 4)]
          .filter(Boolean)
          .join(' · '),
        releaseLabels[item.album_type ?? ''] ?? 'Lanzamiento',
        item.images[0]?.url ?? null,
      ),
    );
  });
  groups.forEach((group) =>
    group.entries.sort((a, b) => relevance(a, query) - relevance(b, query)),
  );
  return groups;
}

export function topSuggestions(groups: SearchGroup[], query: string): SearchEntry[] {
  return groups
    .flatMap((group) => group.entries)
    .sort((a, b) => relevance(a, query) - relevance(b, query))
    .slice(0, 5);
}
