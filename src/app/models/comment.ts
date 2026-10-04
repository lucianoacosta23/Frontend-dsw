export interface CommentItem {
  id: number;
  reviewId: number;
  parentId: number | null;
  author: {
    id: number;
    username: string;
  };
  text: string;
  createdAt: string;
  editedAt: string | null;
}

export interface CommentListResponse {
  message: string;
  data: CommentItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CommentApiResponse {
  message: string;
  data: CommentItem;
}