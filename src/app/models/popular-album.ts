export interface PopularAlbumArtist {
  id: number;
  name: string;
  imageUrl: string | null;
  spotifyId: string | null;
}

export interface PopularAlbum {
  id: number;
  spotifyId: string | null;
  name: string;
  type: 'ALBUM' | 'EP' | 'SINGLE' | 'MIXTAPE' | 'COMPILATION';
  description: string | null;
  imageUrl: string | null;
  releaseDate: string;
  releaseDatePrecision: 'YEAR' | 'MONTH' | 'DAY';
  artists: PopularAlbumArtist[];
  reviewCount: number;
}

export interface PopularAlbumsResponse {
  message: string;
  data: PopularAlbum[];
  sort: {
    field: 'reviewCount';
    direction: 'desc';
  };
  limit: number;
}