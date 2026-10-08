// Una reseña apunta a un álbum o a una pista.
export type ReviewTarget =
  | { type: 'release'; id: number }
  | { type: 'track'; id: number };

// El request incluye el ID del elemento y una puntuación de 0.5 a 5.
export type CreateReviewRequest = {
  rating: number;
  text?: string;
} & ({ releaseId: number; trackId?: never } | { trackId: number; releaseId?: never });

export interface ReviewApiResponse {
  message: string;
  data: unknown;
}
export type ReviewSort = 'newest' | 'popular';

export interface ReviewListItem {
  id: number;
  author: {
    id: number;
    username: string;
  };
  releaseId: number | null;
  trackId: number | null;
  text: string | null;
  rating: number;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
  editedAt: string | null;
}

export interface ReviewListResponse {
  message: string;
  data: ReviewListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  sort: ReviewSort;
}
export interface ReviewLikeResponse {
  message: string;
  data: {
    reviewId: number;
    liked: boolean;
    likeCount: number;
    createdAt?: string;
  };
}

export interface ReviewDetailData extends ReviewListItem {
  target: {
    type: 'release' | 'track';
    id: number;
    name: string;
    imageUrl: string | null;
    artists: Array<{ id: number; name: string }>;
  };
}

export interface ReviewDetailResponse {
  message: string;
  data: ReviewDetailData;
}

export interface ReviewTextUpdate {
  text: string | null;
  editedAt: string | null;
}

export interface ReviewEditResponse {
  message: string;
  data: ReviewTextUpdate & { id: number };
}

export interface ReviewRevisionItem {
  id: number;
  text: string | null;
  effectiveAt: string;
  replacedAt: string;
}

export interface ReviewHistoryResponse {
  message: string;
  data: ReviewRevisionItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}