import { HttpErrorResponse } from '@angular/common/http';

export interface AccountRestriction {
  status: 'SUSPENDED' | 'BANNED';
  scope: 'account' | 'profile';
  suspendedUntil: string | null;
}

// A normal 403 (permissions/CSRF) or 404 must never be treated as a sanction.
export function readAccountRestriction(error: unknown): AccountRestriction | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const body: unknown = error.error;
  if (!body || typeof body !== 'object' || !('code' in body)) return null;
  const code = body.code;
  const account = error.status === 403 && (code === 'ACCOUNT_SUSPENDED' || code === 'ACCOUNT_BANNED');
  const profile = error.status === 404 && (code === 'PROFILE_SUSPENDED' || code === 'PROFILE_BANNED');
  if (!account && !profile) return null;
  const until = 'suspendedUntil' in body ? body.suspendedUntil : null;
  return {
    status: code === 'ACCOUNT_BANNED' || code === 'PROFILE_BANNED' ? 'BANNED' : 'SUSPENDED',
    scope: account ? 'account' : 'profile',
    suspendedUntil: typeof until === 'string' && Number.isFinite(Date.parse(until)) ? until : null,
  };
}
