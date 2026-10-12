// Valores aceptados por el backend para reportar una reseña.
export type ReportReason =
  | 'SPAM'
  | 'HARASSMENT'
  | 'HATE_SPEECH'
  | 'INAPPROPRIATE_CONTENT'
  | 'SPOILER'
  | 'OTHER';

export type ReportStatus = 'PENDING' | 'DISMISSED' | 'ACTIONED';

export type ReportDecision = 'DISMISS' | 'REMOVE_REVIEW';

export interface CriticalReview {
  id: number;
  author: { id: number; username: string };
  text: string | null;
  rating: number;
  reportCount: number;
}

export interface CriticalReviewsResponse {
  message: string;
  data: CriticalReview[];
}

export interface ModerateReviewResponse {
  message: string;
  data: { reviewId: number; affectedReports: number };
}

export interface ReviewReportItem {
  id: number;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  reporter: { id: number; username: string };
}

export interface ReviewReportsResponse {
  message: string;
  data: ReviewReportItem[];
}

export interface CreateReportRequest {
  reason: ReportReason;
  details?: string;
}

export interface CreateReportResponse {
  message: string;
  data: {
    id: number;
    reviewId: number;
    reason: ReportReason;
    details: string | null;
    status: ReportStatus;
    createdAt: string;
  };
}
