import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, type CanActivateFn } from '@angular/router';
import { catchError, map, of, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.loadSession().pipe(
    map(() => router.createUrlTree(['/dashboard'])),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return of(true);
      }

      return throwError(() => error);
    }),
  );
};