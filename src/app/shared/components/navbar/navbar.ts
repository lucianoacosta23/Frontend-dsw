import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service.js';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loggingOut = signal(false);
  readonly logoutError = signal('');

  // El backend elimina la sesión; después volvemos a la portada pública.
  logout(): void {
    if (this.loggingOut()) return;

    this.loggingOut.set(true);
    this.logoutError.set('');

    this.auth.logout()
      .pipe(finalize(() => this.loggingOut.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/');
        },
        error: () => {
          this.logoutError.set(
            'No pudimos cerrar sesión. Intentá nuevamente.',
          );
        },
      });
  }
}{}
