import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { CanActivateFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { readAccountRestriction } from '../../models/account-restriction';
import { AuthService } from '../services/auth.service.js';

// Comprueba la sesión antes de permitir entrar al dashboard.
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.loadSession().pipe(
    map(() => true),
    catchError((error: unknown) => {
      if (_route.data['restrictionView'] === true && readAccountRestriction(error)?.scope === 'account') return of(true);
      return of(
        router.createUrlTree(['/login'], {
          queryParams: { returnUrl: state.url },
        }),
      );
    }),
  );
};