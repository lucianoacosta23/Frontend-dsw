export type ActivityScope = 'following' | 'own' | 'incoming';

export type ActivityType =
  | 'REVIEW_CREATED'
  | 'FOLLOW_RECEIVED'
  | 'LIKE_RECEIVED'
  | 'COMMENT_RECEIVED'
  | 'REPLY_RECEIVED';

export interface ActivityTarget {
  type: 'release' | 'track';
  id: number;
  name: string;
  imageUrl: string | null;
  artists: Array<{ id: number; name: string }>;
}

export interface ActivityItem {
  id?: string;
  type: ActivityType;
  reviewId: number | null;
  commentId?: number | null;
  parentId?: number | null;
  createdAt: string;
  author: {
    id: number;
    username: string;
  };
  rating: number | null;
  text: string | null;
  target: ActivityTarget | null;
}

export interface ActivityResponse {
  message: string;
  scope: ActivityScope;
  data: ActivityItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}