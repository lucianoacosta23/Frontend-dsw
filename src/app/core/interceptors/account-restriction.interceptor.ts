import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environments';
import { AuthService } from '../services/auth.service';

export const accountRestrictionInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);
  return next(req).pipe(catchError((error: unknown) => {
    // Only our API can change account state; public target restrictions cannot log out the viewer.
    if (req.url.startsWith(`${environment.apiBaseUrl}/`) && error instanceof HttpErrorResponse && error.status === 403) {
      injector.get(AuthService).rememberRestriction(error);
    }
    return throwError(() => error);
  }));
};
