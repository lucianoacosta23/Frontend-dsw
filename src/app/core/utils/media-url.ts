import { environment } from '../../../environments/environments';

// Media paths belong to the backend origin, even when API calls use an /api prefix.
export function resolveMediaUrl(
  value: string | null | undefined,
  apiBase = environment.apiBaseUrl,
): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value, new URL(apiBase).origin + '/');
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}
