// Datos del artista que devuelve el endpoint de pistas populares.
export interface PopularTrackArtist {
  id: number;
  name: string;
  imageUrl: string | null;
  spotifyId: string | null;
}

// Datos del lanzamiento asociados a la pista.
export interface PopularTrackRelease {
  id: number;
  name: string;
  imageUrl: string | null;
}

// Pista tal como llega dentro de cada resultado del ranking.
export interface PopularTrack {
  id: number;
  spotifyId: string | null;
  name: string;
  durationMs: number;
  discNumber: number;
  trackNumber: number;
  explicit: boolean;
  release: PopularTrackRelease;
  artists: PopularTrackArtist[];
}

// El endpoint envuelve cada pista junto a la cantidad de reseñas.
export interface PopularTrackItem {
  track: PopularTrack;
  reviewCount: number;
}

export interface PopularTracksResponse {
  message: string;
  data: PopularTrackItem[];
}