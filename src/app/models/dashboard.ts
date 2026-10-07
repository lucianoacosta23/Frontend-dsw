import type { ReviewListItem } from './review.js';

export interface PopularPlaylist {
  id: number;
  name: string;
  author: {
    id: number;
    username: string;
    fullName: string;
  };
  trackCount: number;
  saveCount: number;
  savedByMe: boolean;
  isOwnPlaylist: boolean;
}

export interface PopularReview extends ReviewListItem {
  target: {
    type: 'release' | 'track';
    id: number;
    name: string;
    imageUrl: string | null;
    artists: Array<{ id: number; name: string }>;
  };
}