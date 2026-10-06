import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { CanActivateFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthService } from '../services/auth.service.js';

// Comprueba la sesión y el rol antes de abrir una página de administración.
export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.loadSession().pipe(
    map(response => {
      if (response.data.category === 'ADMIN') {
        return true;
      }

      // Un usuario autenticado sin permiso vuelve al inicio privado.
      return router.createUrlTree(['/dashboard']);
    }),
    catchError(() =>
      of(
        router.createUrlTree(['/login'], {
          queryParams: { returnUrl: state.url },
        }),
      ),
    ),
  );
};