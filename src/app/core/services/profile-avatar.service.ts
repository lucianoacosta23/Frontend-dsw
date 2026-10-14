import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import type { Subscription } from 'rxjs';
import type { UserProfile } from '../../models/user-profile';
import { AuthService } from './auth.service';
import { UserService } from './user-service';

@Injectable({ providedIn: 'root' })
export class ProfileAvatarService {
  private readonly auth = inject(AuthService);
  private readonly users = inject(UserService);
  private readonly userId = computed(() => this.auth.currentUser()?.id ?? null);
  private readonly photo = signal<{ userId: number; url: string | null } | null>(null);
  private ownerId: number | null = null;
  private version = 0;
  private request?: Subscription;

  // Oculta la foto anterior incluso antes de que se ejecute la limpieza del efecto.
  readonly url = computed(() => {
    const photo = this.photo();
    return photo?.userId === this.userId() ? photo.url : null;
  });

  constructor() {
    effect(() => {
      const userId = this.userId();
      untracked(() => this.loadFor(userId));
    });
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
  }

  private loadFor(userId: number | null): void {
    if (userId === this.ownerId) return;
    this.cancelRequest();
    this.ownerId = userId;
    this.photo.set(null);
    if (userId === null) return;

    const version = this.version;
    this.request = this.users.getOwnProfile().subscribe({
      next: ({ data }) => {
        if (version !== this.version || this.userId() !== userId || data.id !== userId) return;
        this.photo.set({ userId, url: data.avatarUrl });
      },
      error: () => {
        if (version === this.version && this.userId() === userId) this.photo.set(null);
      },
    });
  }

  updateFromProfile(profile: UserProfile): void {
    if (!profile.isOwnProfile || profile.id !== this.userId()) return;
    // Un GET pendiente no debe reemplazar una foto recién guardada o eliminada.
    this.cancelRequest();
    this.ownerId = profile.id;
    this.photo.set({ userId: profile.id, url: profile.avatarUrl });
  }

  private cancelRequest(): void {
    this.version++;
    this.request?.unsubscribe();
    this.request = undefined;
  }
}
