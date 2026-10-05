// Valores aceptados por el backend para reportar una reseña.
export type ReportReason =
  | 'SPAM'
  | 'HARASSMENT'
  | 'HATE_SPEECH'
  | 'INAPPROPRIATE_CONTENT'
  | 'SPOILER'
  | 'OTHER';

export type ReportStatus = 'PENDING' | 'DISMISSED' | 'ACTIONED';

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
