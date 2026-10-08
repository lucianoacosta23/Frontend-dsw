import { HttpErrorResponse } from '@angular/common/http';
export function profileError(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 401)
      return 'Tu sesión venció. Iniciá sesión en otra pestaña y reintentá; tu borrador sigue acá.';
    if (typeof error.error?.message === 'string') return error.error.message;
  }
  return fallback;
}
