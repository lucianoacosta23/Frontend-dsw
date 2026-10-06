import { DatePipe } from '@angular/common';
import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import type { Subscription } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service.js';
import { UserService } from '../../../../core/services/user-service.js';
import type {
  UserProfile as UserProfileData,
} from '../../../../models/user-profile.js';
import { Navbar } from '../../../../shared/components/navbar/navbar.js';

@Component({
  selector: 'app-own-profile',
  standalone: true,
  imports: [Navbar, RouterLink, DatePipe],
  templateUrl: './own-profile.html',
  styleUrl: './own-profile.scss',
})
export class OwnProfile implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private request?: Subscription;

  readonly profile = signal<UserProfileData | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.loadProfile();
  }

  // El usuario se obtiene de la sesión, no de un ID ingresado en la URL.
  loadProfile(): void {
    this.request?.unsubscribe();

    const user = this.auth.currentUser();

    this.errorMessage.set('');
    this.profile.set(null);

    if (!user) {
      this.loading.set(false);
      this.errorMessage.set('No pudimos recuperar tu sesión.');
      return;
    }

    this.loading.set(true);

    // Recupera los contadores de seguimiento del perfil propio.
    this.request = this.userService
      .getOwnProfile()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: response => {
          this.profile.set(response.data);
        },
        error: () => {
          this.errorMessage.set(
            'No pudimos cargar tu perfil. Intentá nuevamente.',
          );
        },
      });
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }
}