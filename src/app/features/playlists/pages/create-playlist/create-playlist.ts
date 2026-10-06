import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, of, Subscription, switchMap } from 'rxjs';

import {
  PlaylistService,
  type PlaylistData,
  type PlaylistSearchTrack,
  type PlaylistTrack,
} from '../../../../core/services/playlist.service.js';
import { Navbar } from '../../../../shared/components/navbar/navbar.js';

@Component({
  selector: 'app-create-playlist',
  imports: [FormsModule, RouterLink, Navbar],
  templateUrl: './create-playlist.html',
  styleUrl: './create-playlist.scss',
})
export class CreatePlaylist {
  private readonly playlistService = inject(PlaylistService);
  private readonly destroyRef = inject(DestroyRef);
  private searchRequest: Subscription | undefined;

  name = '';
  query = '';

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly createdPlaylist = signal<PlaylistData | null>(null);

  readonly searching = signal(false);
  readonly searched = signal(false);
  readonly results = signal<PlaylistSearchTrack[]>([]);
  readonly searchError = signal<string | null>(null);
  readonly searchWarning = signal<string | null>(null);

  readonly addingKey = signal<string | null>(null);
  readonly addError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  create(): void {
    if (this.saving() || this.createdPlaylist()) return;

    const name = this.name.trim();

    if (!name || name.length > 255) {
      this.errorMessage.set(
        'Ingresá un nombre de entre 1 y 255 caracteres.',
      );
      return;
    }

    this.errorMessage.set(null);
    this.saving.set(true);

    this.playlistService.create(name)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: response => {
          this.createdPlaylist.set({
            ...response.data,
            tracks: [],
          });
        },
        error: (error: unknown) => {
          this.errorMessage.set(
            this.getErrorMessage(error, 'No pudimos crear la playlist.'),
          );
        },
      });
  }

  search(): void {
    if (!this.createdPlaylist()) return;

    // Cancela una búsqueda anterior para evitar resultados desactualizados.
    this.searchRequest?.unsubscribe();

    this.results.set([]);
    this.searchError.set(null);
    this.searchWarning.set(null);
    this.searched.set(false);

    const query = this.query.trim();

    if (!query || query.length > 255) {
      this.searchError.set(
        'Ingresá una búsqueda de entre 1 y 255 caracteres.',
      );
      return;
    }

    this.searching.set(true);

    this.searchRequest = this.playlistService.searchTracks(query)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.searching.set(false)),
      )
      .subscribe({
        next: response => {
          this.results.set(response.tracks);
          this.searchWarning.set(response.warning);
          this.searched.set(true);
        },
        error: (error: unknown) => {
          this.searchError.set(
            this.getErrorMessage(error, 'No pudimos completar la búsqueda.'),
          );
        },
      });
  }

  add(track: PlaylistSearchTrack): void {
    const playlist = this.createdPlaylist();

    if (!playlist || this.addingKey() || this.isAdded(track)) return;

    this.addingKey.set(track.key);
    this.addError.set(null);
    this.successMessage.set(null);

    // Los resultados locales ya tienen ID.
    // Los externos se importan antes de agregarlos a la playlist.
    const trackIdRequest = track.localId !== null
      ? of(track.localId)
      : this.playlistService
          .importTrack(track.spotifyId!)
          .pipe(switchMap(response => of(response.data.trackId)));

    trackIdRequest
      .pipe(
        switchMap(trackId =>
          this.playlistService.addTrack(playlist.id, trackId),
        ),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.addingKey.set(null)),
      )
      .subscribe({
        next: response => {
          // Usa la lista que confirmó y guardó el backend.
          this.createdPlaylist.set(response.data);
          this.successMessage.set(`Agregaste “${track.name}”.`);
        },
        error: (error: unknown) => {
          this.addError.set(
            this.getErrorMessage(error, 'No pudimos agregar la canción.'),
          );
        },
      });
  }

  isAdded(track: PlaylistSearchTrack): boolean {
    return this.createdPlaylist()?.tracks.some(item =>
      (track.localId !== null && item.id === track.localId) ||
      (track.spotifyId !== null && item.spotifyId === track.spotifyId),
    ) ?? false;
  }

  artistsLabel(track: PlaylistTrack): string {
    return track.artists.map(artist => artist.name).join(', ');
  }

  duration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  createAnother(): void {
    // Evita cambiar de playlist mientras se está agregando una canción.
    if (this.addingKey() || this.saving()) return;

    this.searchRequest?.unsubscribe();
    this.name = '';
    this.query = '';
    this.createdPlaylist.set(null);
    this.results.set([]);
    this.searched.set(false);
    this.errorMessage.set(null);
    this.searchError.set(null);
    this.searchWarning.set(null);
    this.addError.set(null);
    this.successMessage.set(null);
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No pudimos conectar con el servidor.';
      }

      if (error.status === 401) {
        return 'Tu sesión venció. Iniciá sesión nuevamente.';
      }

      if (
        error.status >= 400 &&
        error.status < 500 &&
        typeof error.error?.message === 'string'
      ) {
        return error.error.message;
      }
    }

    return `${fallback} Intentá nuevamente.`;
  }
}
