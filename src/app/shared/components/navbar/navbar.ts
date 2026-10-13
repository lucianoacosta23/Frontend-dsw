import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service.js';
import { environment } from '../../../../environments/environments';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss', './navbar-home.scss'],
  host: { '[class.home-nav]': "home || appearance === 'home'" },
})
export class Navbar {
  @Input() home = false;
  // Appearance does not change the Trends link's navigation behavior.
  @Input() appearance: 'default' | 'home' = 'default';
  @Input() sessionLoading = false;
  @Input() sessionError: string | null = null;
  @Output() retrySession = new EventEmitter<void>();
  readonly spotifyLoginUrl = `${environment.apiBaseUrl}/auth/spotify/login?returnUrl=${encodeURIComponent('/dashboard')}`;
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loggingOut = signal(false);
  readonly logoutError = signal('');

  scrollToTrends(event: Event): void {
    if (!this.home) return;
    event.preventDefault();
    document.getElementById('tendencias')?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }

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
