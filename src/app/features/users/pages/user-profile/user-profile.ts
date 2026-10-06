import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, map} from 'rxjs';

import { UserService } from '../../../../core/services/user-service';
import type {
  UserProfile as UserProfileData,
} from '../../../../models/user-profile.js';

@Component({
  imports: [RouterLink],
  selector: 'app-user-profile',
  styleUrl: './user-profile.scss',
  templateUrl: './user-profile.html',
})
export class UserProfile implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);

  readonly user = signal<UserProfileData | null>(null);
  readonly username = signal('');
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  // Estado del botón para seguir al usuario.
  readonly followSubmitting = signal(false);
  readonly followError = signal('');

  ngOnInit(): void {
    this.loadProfile();
  }

  // Carga el perfil junto con sus contadores y relaciones de seguimiento.
  loadProfile(): void {
    const username = this.route.snapshot.paramMap.get('username')?.trim();

    if (!username) {
      this.user.set(null);
      this.errorMessage.set('El nombre de usuario no es válido.');
      this.loading.set(false);
      return;
    }

    this.username.set(username);
    this.loading.set(true);
    this.errorMessage.set(null);
    this.followError.set('');
    this.user.set(null);

    this.userService
      .getProfileByUsername(username)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: response => {
          this.user.set(response.data);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getErrorMessage(error));
        },
      });
  }

    // El mismo botón permite seguir o dejar de seguir.
  followUser(): void {
    const profile = this.user();

    if (
      !profile ||
      profile.isOwnProfile ||
      this.followSubmitting()
    ) {
      return;
    }

    this.followSubmitting.set(true);
    this.followError.set('');

    // Ambas operaciones devuelven el nuevo estado del botón.
    const request = profile.isFollowing
      ? this.userService
          .unfollowUser(profile.id)
          .pipe(map(() => false))
      : this.userService
          .followUser(profile.id)
          .pipe(map(() => true));

    request
      .pipe(finalize(() => this.followSubmitting.set(false)))
      .subscribe({
        next: isFollowing => {
          this.user.update(current => {
            if (!current || current.id !== profile.id) {
              return current;
            }

            return {
              ...current,
              isFollowing,
            };
          });

          // Recupera los contadores reales desde el backend.
          this.loadProfile();
        },
        error: (error: unknown) => {
          if (
            error instanceof HttpErrorResponse &&
            error.status === 409
          ) {
            this.loadProfile();
            return;
          }

          this.followError.set(
            error instanceof HttpErrorResponse &&
              typeof error.error?.message === 'string'
              ? error.error.message
              : 'No pudimos actualizar el seguimiento. Intentá nuevamente.',
          );
        },
      });
  }

  // Traduce los errores de carga a mensajes para el usuario.
  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No pudimos conectar con el servidor. Revisá que el backend esté iniciado.';
      }

      if (error.status === 401) {
        return 'Iniciá sesión para ver el perfil de este usuario.';
      }

      if (error.status === 404) {
        return 'No encontramos ese usuario.';
      }
    }

    return 'No pudimos cargar el perfil. Intentá nuevamente.';
  }
}