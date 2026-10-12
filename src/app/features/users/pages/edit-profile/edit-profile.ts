import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { finalize, map, Observable, of, Subscription, switchMap } from 'rxjs';
import { Navbar } from '../../../../shared/components/navbar/navbar';
import { ProfileImage } from '../../../../shared/components/profile-image/profile-image';
import { FavoritePicker } from '../../components/favorite-picker/favorite-picker';
import { UserService } from '../../../../core/services/user-service';
import { profileError } from '../../../../core/utils/profile-error';
import type {
  UserProfile,
  ProfilePatch,
  ImagePurpose,
  FavoriteRelease,
  FavoriteTrack,
} from '../../../../models/user-profile';

interface DraftImage {
  file: File | null;
  preview: string | null;
  imageId: number | null | undefined;
  changed: boolean;
  error: string;
}
const emptyImage = (): DraftImage => ({
  file: null,
  preview: null,
  imageId: undefined,
  changed: false,
  error: '',
});
@Component({
  selector: 'app-edit-profile',
  imports: [Navbar, RouterLink, ProfileImage, FavoritePicker],
  templateUrl: './edit-profile.html',
  styleUrl: './edit-profile.scss',
})
export class EditProfile implements OnInit, OnDestroy {
  private readonly users = inject(UserService);
  private readonly router = inject(Router);
  private loadRequest?: Subscription;
  private saveRequest?: Subscription;
  private destroyed = false;
  private versions = { avatar: 0, cover: 0 };
  readonly purposes: ImagePurpose[] = ['avatar', 'cover'];
  readonly profile = signal<UserProfile | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly saving = signal(false);
  readonly validating = signal(0);
  readonly error = signal('');
  readonly success = signal('');
  readonly sessionExpired = signal(false);
  readonly images = signal<Record<ImagePurpose, DraftImage>>({
    avatar: emptyImage(),
    cover: emptyImage(),
  });
  readonly releases = signal<FavoriteRelease[]>([]);
  readonly tracks = signal<FavoriteTrack[]>([]);
  readonly pickerBusy = signal({ release: false, track: false });

  ngOnInit(): void {
    this.load();
  }
  load(): void {
    this.loadRequest?.unsubscribe();
    this.loading.set(true);
    this.loadError.set('');
    this.loadRequest = this.users
      .getOwnProfile()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          if (!response.data.isOwnProfile) {
            this.loadError.set('Solo el dueño puede editar este perfil.');
            return;
          }
          this.applyProfile(response.data);
        },
        error: (error) => this.loadError.set(profileError(error, 'No pudimos cargar tu perfil.')),
      });
  }
  private applyProfile(profile: UserProfile): void {
    this.releasePreviews();
    this.profile.set(profile);
    this.releases.set([...profile.favoriteReleases]);
    this.tracks.set([...profile.favoriteTracks]);
    this.images.set({
      avatar: { ...emptyImage(), preview: profile.avatarUrl },
      cover: { ...emptyImage(), preview: profile.coverUrl },
    });
  }
  busy(): boolean {
    return (
      this.saving() || this.validating() > 0 || this.pickerBusy().release || this.pickerBusy().track
    );
  }
  setPickerBusy(kind: 'release' | 'track', value: boolean): void {
    this.pickerBusy.update((state) => ({ ...state, [kind]: value }));
  }
  releaseIds(): number[] {
    return this.releases().map((item) => item.id);
  }
  trackIds(): number[] {
    return this.tracks().map((item) => item.id);
  }
  addFavorite(item: FavoriteRelease | FavoriteTrack): void {
    if (this.saving()) return;
    this.error.set('');
    this.success.set('');
    if ('type' in item) {
      if (item.type === 'SINGLE') {
        this.error.set('Los singles no pueden ser proyectos favoritos.');
        return;
      }
      if (this.releases().length >= 5 || this.releaseIds().includes(item.id)) {
        this.error.set('Elegí hasta cinco proyectos únicos.');
        return;
      }
      this.releases.update((items) => [...items, item]);
    } else {
      if (this.tracks().length >= 5 || this.trackIds().includes(item.id)) {
        this.error.set('Elegí hasta cinco canciones únicas.');
        return;
      }
      this.tracks.update((items) => [...items, item]);
    }
  }
  removeFavorite(kind: 'release' | 'track', index: number): void {
    if (this.busy()) return;
    if (kind === 'release') this.releases.update((items) => items.filter((_, i) => i !== index));
    else this.tracks.update((items) => items.filter((_, i) => i !== index));
    this.success.set('');
  }
  moveFavorite(kind: 'release' | 'track', index: number, step: number): void {
    if (this.busy()) return;
    const reorder = <T>(items: T[]): T[] => {
      const next = index + step;
      if (next < 0 || next >= items.length) return items;
      const copy = [...items];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    };
    if (kind === 'release') this.releases.update(reorder);
    else this.tracks.update(reorder);
    this.success.set('');
  }
  fileChange(event: Event, purpose: ImagePurpose): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void this.selectFile(file, purpose);
  }
  async selectFile(file: File, purpose: ImagePurpose): Promise<void> {
    if (this.busy()) return;
    const version = ++this.versions[purpose];
    this.imageError(purpose, '');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.imageError(purpose, 'Elegí una imagen JPEG, PNG o WebP estática.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.imageError(purpose, 'La imagen supera los 5 MiB.');
      return;
    }
    this.validating.update((count) => count + 1);
    try {
      if (typeof createImageBitmap === 'function') {
        const bitmap = await createImageBitmap(file);
        const pixels = bitmap.width * bitmap.height;
        bitmap.close();
        if (pixels > 20_000_000) throw new Error('La imagen supera los 20 millones de píxeles.');
      }
      if (this.destroyed || this.versions[purpose] !== version) return;
      this.revoke(this.images()[purpose].preview);
      this.images.update((images) => ({
        ...images,
        [purpose]: {
          file,
          preview: URL.createObjectURL(file),
          imageId: undefined,
          changed: true,
          error: '',
        },
      }));
      this.success.set('');
    } catch (error) {
      if (!this.destroyed && this.versions[purpose] === version)
        this.imageError(
          purpose,
          error instanceof Error && error.message.includes('20 millones')
            ? error.message
            : 'No pudimos leer esa imagen.',
        );
    } finally {
      this.validating.update((count) => count - 1);
    }
  }
  removeImage(purpose: ImagePurpose): void {
    if (this.busy()) return;
    ++this.versions[purpose];
    this.revoke(this.images()[purpose].preview);
    this.images.update((images) => ({
      ...images,
      [purpose]: { ...emptyImage(), imageId: null, changed: true },
    }));
    this.success.set('');
  }
  private imageError(purpose: ImagePurpose, error: string): void {
    this.images.update((images) => ({ ...images, [purpose]: { ...images[purpose], error } }));
  }
  private uploadIfNeeded(purpose: ImagePurpose): Observable<number | null> {
    const draft = this.images()[purpose];
    if (!draft.file || draft.imageId !== undefined) return of(null);
    return this.users.uploadProfileImage(draft.file, purpose).pipe(
      map((response) => {
        // Keep the uploaded ID on a PATCH error. A retry does not upload this file again.
        this.images.update((images) => ({
          ...images,
          [purpose]: { ...images[purpose], file: null, imageId: response.data.imageId, error: '' },
        }));
        return response.data.imageId;
      }),
    );
  }
  buildPatch(): ProfilePatch {
    const original = this.profile();
    const patch: ProfilePatch = {};
    if (!original) return patch;
    const avatar = this.images().avatar;
    const cover = this.images().cover;
    if (avatar.changed && avatar.imageId !== undefined) patch.avatarImageId = avatar.imageId;
    if (cover.changed && cover.imageId !== undefined) patch.coverImageId = cover.imageId;
    if (
      JSON.stringify(this.releaseIds()) !==
      JSON.stringify(original.favoriteReleases.map((item) => item.id))
    )
      patch.favoriteReleaseIds = this.releaseIds();
    if (
      JSON.stringify(this.trackIds()) !==
      JSON.stringify(original.favoriteTracks.map((item) => item.id))
    )
      patch.favoriteTrackIds = this.trackIds();
    return patch;
  }
  save(): void {
    if (this.busy() || !this.profile()?.isOwnProfile) return;
    if (
      this.releaseIds().length > 5 ||
      this.trackIds().length > 5 ||
      new Set(this.releaseIds()).size !== this.releaseIds().length ||
      new Set(this.trackIds()).size !== this.trackIds().length ||
      this.releases().some((item) => item.type === 'SINGLE')
    ) {
      this.error.set(
        'Elegí hasta cinco favoritos únicos por categoría, sin singles entre los proyectos.',
      );
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    this.sessionExpired.set(false);
    this.saveRequest = this.uploadIfNeeded('avatar')
      .pipe(
        switchMap(() => this.uploadIfNeeded('cover')),
        switchMap(() => {
          const patch = this.buildPatch();
          return Object.keys(patch).length ? this.users.updateOwnProfile(patch) : of(null);
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (response) => {
          if (response) {
            this.applyProfile(response.data);
            this.success.set('Perfil guardado.');
          } else this.success.set('No hay cambios para guardar.');
        },
        error: (error) => {
          this.sessionExpired.set(error instanceof HttpErrorResponse && error.status === 401);
          this.error.set(
            profileError(error, 'No pudimos guardar el perfil. Tu borrador sigue disponible.'),
          );
        },
      });
  }
  cancel(): void {
    if (this.saving()) return;
    this.releasePreviews();
    void this.router.navigateByUrl('/profile');
  }
  private revoke(url: string | null): void {
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
  }
  private releasePreviews(): void {
    this.versions.avatar++;
    this.versions.cover++;
    for (const purpose of this.purposes) this.revoke(this.images()[purpose].preview);
  }
  ngOnDestroy(): void {
    this.destroyed = true;
    this.loadRequest?.unsubscribe();
    this.saveRequest?.unsubscribe();
    this.releasePreviews();
  }
}
