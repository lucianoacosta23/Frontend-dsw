import type { CriticalReview, ReviewReportItem } from './report.js';

export type AccountStatus = 'ENABLED' | 'SUSPENDED' | 'BANNED';
export type AccountAction = 'SUSPEND' | 'BAN' | 'REACTIVATE';
export interface Pagination { page: number; pageSize: number; total: number; totalPages: number; }
export interface AdminUser {
  id: number; username: string; fullName: string; status: AccountStatus;
  pendingReportCount: number; criticalReviewCount: number; suspendedUntil: string | null;
}
export interface SanctionEntry {
  id: number; action: AccountAction; reason: string; createdAt: string;
  suspendedUntil: string | null; administrator: { id: number; username: string };
}
export interface AdminUserDetail extends AdminUser {
  removedReviewCount: number;
  activeSanction: SanctionEntry | null;
}
export interface UserReportedReview {
  review: CriticalReview & { deletedAt: string | null };
  reports: ReviewReportItem[];
}
export interface UserActionRequest { action: AccountAction; reason: string; suspendedUntil?: string; }
export interface DataResponse<T> { message: string; data: T; }
export interface PageResponse<T> extends DataResponse<T[]> { pagination: Pagination; }
