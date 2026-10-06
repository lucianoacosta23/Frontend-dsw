// Categorías que acepta el endpoint del backend.
export type SearchType =
  | 'tracks'
  | 'releases'
  | 'artists'
  | 'playlists'
  | 'users';

// Datos básicos para identificar un resultado musical.
export interface SearchMusicItem {
  id: number;
  name: string;
}

export interface SearchReleaseItem extends SearchMusicItem {
  spotifyId: string | null;
  imageUrl: string | null;
  releaseDate: string;
}

export interface SearchArtistItem extends SearchMusicItem {
  imageUrl: string | null;
}

export interface SearchUserItem {
  id: number;
  username: string;
  fullName: string;
}

export interface SearchPlaylistItem {
  id: number;
  name: string;
  userId: number;
}

// Cada categoría tiene su propio listado de resultados.
export interface SearchResults {
  tracks: SearchMusicItem[];
  releases: SearchReleaseItem[];
  artists: SearchArtistItem[];
  playlists: SearchPlaylistItem[];
  users: SearchUserItem[];
}

export interface SearchResponse {
  success: boolean;
  data: SearchResults;
}

// Datos de un álbum devuelto por Spotify.
// Su ID es un texto, distinto del ID numérico de nuestra base.
export interface SpotifyAlbumResult {
  id: string;
  name: string;
  release_date: string;
  images: Array<{
    url: string;
    height: number | null;
    width: number | null;
  }>;
  artists: Array<{
    id: string;
    name: string;
  }>;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyAlbumSearchResponse {
  message: string;
  data: {
    albums: SpotifyAlbumResult[];
  };
}

// Después de importar, recibimos el ID local para abrir el detalle.
export interface SpotifyAlbumImportResponse {
  message: string;
  data: {
    releaseId: number;
    createdRelease: boolean;
  };
}