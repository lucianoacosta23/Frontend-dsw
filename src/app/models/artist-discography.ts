import type { ReleaseDetail } from './catalog-details.js';

export interface ArtistReleaseCard {
  key: string;
  localId: number | null;
  spotifyId: string | null;
  name: string;
  imageUrl: string | null;
  releaseDate: string;
  type: ReleaseDetail['type'];
}

export interface SpotifyArtistReleasesResponse {
  message: string;
  data: {
    items: Array<{
      spotifyId: string;
      name: string;
      imageUrl: string | null;
      releaseDate: string;
      type: 'ALBUM' | 'SINGLE' | 'COMPILATION';
    }>;
    total: number;
    nextOffset: number | null;
  };
}
