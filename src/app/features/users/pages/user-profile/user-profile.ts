import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { UserService } from '../../../../core/services/user-service';
import type { UserProfile as UserProfileData } from '../../../../models/user-profile.js';

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

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    const username = this.route.snapshot.paramMap.get('username')?.trim();

    if (!username) {
      this.errorMessage.set('El nombre de usuario no es válido.');
      this.loading.set(false);
      return;
    }

    this.username.set(username);
    this.loading.set(true);
    this.errorMessage.set(null);

    this.userService
      .getProfileByUsername(username)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: response => this.user.set(response.data),
        error: (error: unknown) => {
          this.errorMessage.set(this.getErrorMessage(error));
        },
      });
  }

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