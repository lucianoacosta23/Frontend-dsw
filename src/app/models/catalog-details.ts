// Artista asociado a un lanzamiento o a una pista.
export interface CatalogArtist {
  id: number;
  name: string;
  imageUrl: string | null;
  spotifyId: string | null;
}

// Datos del lanzamiento que muestra la pantalla de detalle.
export interface ReleaseDetail {
  id: number;
  spotifyId: string | null;
  name: string;
  type: 'ALBUM' | 'EP' | 'SINGLE' | 'MIXTAPE' | 'COMPILATION';
  description: string | null;
  imageUrl: string | null;
  releaseDate: string;
  releaseDatePrecision: 'YEAR' | 'MONTH' | 'DAY';
  artists: CatalogArtist[];
}

// Datos de la pista y su lanzamiento asociado.
export interface TrackDetail {
  id: number;
  spotifyId: string | null;
  name: string;
  durationMs: number;
  discNumber: number;
  trackNumber: number;
  explicit: boolean;
  release: ReleaseDetail;
  artists: CatalogArtist[];
}

// Formato común de las respuestas del backend.
export interface CatalogDetailResponse<T> {
  message: string;
  data: T;
}