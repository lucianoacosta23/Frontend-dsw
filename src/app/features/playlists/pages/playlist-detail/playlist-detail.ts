import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, of, Subscription, switchMap } from 'rxjs';

import {
  PlaylistService,
  type PlaylistDetailData,
  type PlaylistSearchTrack,
  type PlaylistTarget,
  type PlaylistTrack,
} from '../../../../core/services/playlist.service.js';
import { Navbar } from '../../../../shared/components/navbar/navbar.js';

@Component({
  selector: 'app-playlist-detail',
  imports: [FormsModule, RouterLink, Navbar],
  styleUrl: './playlist-detail.scss',
  templateUrl: './playlist-detail.html',
})
export class PlaylistDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly playlistService = inject(PlaylistService);
  private readonly destroyRef = inject(DestroyRef);

  private loadRequest: Subscription | undefined;
  private searchRequest: Subscription | undefined;

  readonly playlist = signal<PlaylistDetailData | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  // Panel para agregar canciones (solo lo ve el creador).
  readonly adding = signal(false);
  query = '';
  readonly searching = signal(false);
  readonly searched = signal(false);
  readonly results = signal<PlaylistSearchTrack[]>([]);
  readonly searchError = signal<string | null>(null);
  readonly searchWarning = signal<string | null>(null);
  readonly addingKey = signal<string | null>(null);
  readonly addError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly savingPlaylist = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly actionMessage = signal<string | null>(null);

  readonly openPlaylistMenu = signal(false);
  readonly deletingPlaylist = signal(false);

  readonly openMenuTrackId = signal<number | null>(null);
  readonly removingTrackId = signal<number | null>(null);

  readonly pickerTrack = signal<PlaylistTrack | null>(null);
  readonly pickerPlaylists = signal<PlaylistTarget[]>([]);
  readonly pickerLoading = signal(false);
  readonly pickerError = signal<string | null>(null);
  readonly addingToPlaylistId = signal<number | null>(null);

  // Los totales salen de la lista, así se actualizan al agregar canciones.
  readonly trackCount = computed(
    () => this.playlist()?.tracks.length ?? 0,
  );

  readonly totalDurationMs = computed(() =>
    (this.playlist()?.tracks ?? []).reduce(
      (total, track) => total + track.durationMs,
      0,
    ),
  );

  // La playlist no tiene imagen propia: usa las portadas de sus canciones.
  readonly covers = computed(() => {
    const urls = (this.playlist()?.tracks ?? [])
      .map(track => track.release.imageUrl)
      .filter((url): url is string => !!url);

    return [...new Set(urls)].slice(0, 4);
  });

  ngOnInit(): void {
    // Escucha el parámetro para recargar si cambia el ID sin salir de la página.
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => this.load(params.get('id')));
  }

  retry(): void {
    this.load(this.route.snapshot.paramMap.get('id'));
  }

  toggleAdding(): void {
    this.adding.update(value => !value);
  }

  @HostListener('document:click')
  closeMenus(): void {
    this.openMenuTrackId.set(null);
    this.openPlaylistMenu.set(false);
  }

  @HostListener('document:keydown.escape')
  closeOverlays(): void {
    this.openMenuTrackId.set(null);
    this.openPlaylistMenu.set(false);
    this.closePicker();
  }

  togglePlaylistMenu(event: Event): void {
    event.stopPropagation();
    this.openMenuTrackId.set(null);
    this.openPlaylistMenu.update(value => !value);
  }

  deletePlaylist(): void {
    const playlist = this.playlist();

    if (!playlist || !playlist.isOwnPlaylist || this.deletingPlaylist()) {
      return;
    }

    if (!window.confirm('¿Estás seguro de que querés eliminar esta playlist?')) {
      return;
    }

    this.deletingPlaylist.set(true);
    this.openPlaylistMenu.set(false);
    this.saveError.set(null);

    this.playlistService
      .delete(playlist.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deletingPlaylist.set(false)),
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (error: unknown) => {
          this.saveError.set(
            this.getErrorMessage(error, 'No pudimos eliminar la playlist.'),
          );
        },
      });
  }

  toggleSave(): void {
    const playlist = this.playlist();

    if (!playlist || playlist.isOwnPlaylist || this.savingPlaylist()) {
      return;
    }

    this.savingPlaylist.set(true);
    this.saveError.set(null);
    this.actionMessage.set(null);

    const request = playlist.savedByMe
      ? this.playlistService.unsave(playlist.id)
      : this.playlistService.save(playlist.id);

    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.savingPlaylist.set(false)),
      )
      .subscribe({
        next: response => {
          this.playlist.update(current =>
            current
              ? {
                  ...current,
                  savedByMe: response.data.savedByMe,
                  saveCount: response.data.saveCount,
                }
              : current,
          );
          this.actionMessage.set(
            response.data.savedByMe
              ? 'Guardaste esta playlist en tu biblioteca.'
              : 'Quitaste esta playlist de tu biblioteca.',
          );
        },
        error: (error: unknown) => {
          this.saveError.set(
            this.getErrorMessage(error, 'No pudimos actualizar el guardado.'),
          );
        },
      });
  }

  toggleTrackMenu(trackId: number, event: Event): void {
    event.stopPropagation();
    this.openMenuTrackId.update(current =>
      current === trackId ? null : trackId,
    );
  }

  keepMenuOpen(event: Event): void {
    event.stopPropagation();
  }

  removeTrack(track: PlaylistTrack): void {
    const playlist = this.playlist();

    if (
      !playlist?.isOwnPlaylist ||
      this.removingTrackId() !== null
    ) {
      return;
    }

    this.openMenuTrackId.set(null);
    this.removingTrackId.set(track.id);
    this.saveError.set(null);
    this.actionMessage.set(null);

    this.playlistService
      .removeTrack(playlist.id, track.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.removingTrackId.set(null)),
      )
      .subscribe({
        next: response => {
          this.playlist.update(current =>
            current
              ? { ...current, tracks: sortTracks(response.data.tracks) }
              : current,
          );
          this.actionMessage.set(`Eliminaste “${track.name}”.`);
        },
        error: (error: unknown) => {
          this.saveError.set(
            this.getErrorMessage(error, 'No pudimos eliminar la canción.'),
          );
        },
      });
  }

  openAddToPlaylist(track: PlaylistTrack, event: Event): void {
    event.stopPropagation();
    this.openMenuTrackId.set(null);
    this.pickerTrack.set(track);
    this.pickerPlaylists.set([]);
    this.pickerError.set(null);
    this.pickerLoading.set(true);

    this.playlistService
      .listTargets(track.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.pickerLoading.set(false)),
      )
      .subscribe({
        next: response => {
          const currentId = this.playlist()?.id;
          this.pickerPlaylists.set(
            response.data.filter(
              item => !item.containsTrack && item.id !== currentId,
            ),
          );
        },
        error: (error: unknown) => {
          this.pickerError.set(
            this.getErrorMessage(
              error,
              'No pudimos cargar tus playlists.',
            ),
          );
        },
      });
  }

  closePicker(): void {
    if (this.addingToPlaylistId()) return;

    this.pickerTrack.set(null);
    this.pickerPlaylists.set([]);
    this.pickerError.set(null);
  }

  addToPlaylist(target: PlaylistTarget): void {
    const track = this.pickerTrack();

    if (!track || this.addingToPlaylistId() !== null) return;

    this.addingToPlaylistId.set(target.id);
    this.pickerError.set(null);

    this.playlistService
      .addTrack(target.id, track.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.addingToPlaylistId.set(null)),
      )
      .subscribe({
        next: () => {
          this.actionMessage.set(
            `Agregaste “${track.name}” a “${target.name}”.`,
          );
          this.pickerTrack.set(null);
          this.pickerPlaylists.set([]);
        },
        error: (error: unknown) => {
          this.pickerError.set(
            this.getErrorMessage(
              error,
              'No pudimos agregar la canción a esa playlist.',
            ),
          );
        },
      });
  }

  search(): void {
    if (!this.playlist()?.isOwnPlaylist) return;

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
    const playlist = this.playlist();

    if (
      !playlist?.isOwnPlaylist ||
      this.addingKey() ||
      this.isAdded(track)
    ) {
      return;
    }

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
          // Usa la lista que confirmó el backend, con el mismo orden que al recargar.
          this.playlist.update(current =>
            current
              ? { ...current, tracks: sortTracks(response.data.tracks) }
              : current,
          );
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
    return this.playlist()?.tracks.some(item =>
      (track.localId !== null && item.id === track.localId) ||
      (track.spotifyId !== null && item.spotifyId === track.spotifyId),
    ) ?? false;
  }

  artistsLabel(track: PlaylistTrack): string {
    return track.artists.map(artist => artist.name).join(', ');
  }

  // 3:07
  duration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  // 9 h 12 min  |  48 min
  totalDuration(milliseconds: number): string {
    const totalMinutes = Math.round(milliseconds / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) return `${minutes} min`;
    return `${hours} h ${minutes} min`;
  }

  pluralize(count: number, singular: string, plural: string): string {
    return `${count.toLocaleString('es-AR')} ${count === 1 ? singular : plural}`;
  }

  private load(rawId: string | null): void {
    this.loadRequest?.unsubscribe();
    this.resetAddPanel();
    this.openMenuTrackId.set(null);
    this.openPlaylistMenu.set(false);
    this.pickerTrack.set(null);
    this.pickerPlaylists.set([]);
    this.pickerError.set(null);
    this.saveError.set(null);
    this.actionMessage.set(null);
    this.playlist.set(null);

    if (!rawId || !/^[1-9]\d*$/.test(rawId)) {
      this.errorMessage.set('El ID de la playlist no es válido.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.loadRequest = this.playlistService
      .getById(Number(rawId))
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: response => {
          this.playlist.set({
            ...response.data,
            tracks: sortTracks(response.data.tracks),
          });
        },
        error: (error: unknown) => {
          this.errorMessage.set(
            this.getErrorMessage(error, 'No pudimos cargar la playlist.'),
          );
        },
      });
  }

  private resetAddPanel(): void {
    this.searchRequest?.unsubscribe();
    this.adding.set(false);
    this.query = '';
    this.results.set([]);
    this.searched.set(false);
    this.searchError.set(null);
    this.searchWarning.set(null);
    this.addError.set(null);
    this.successMessage.set(null);
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No pudimos conectar con el servidor. Revisá que el backend esté iniciado.';
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

// El backend no guarda posición: se ordena por ID para que sea estable.
function sortTracks(tracks: PlaylistTrack[]): PlaylistTrack[] {
  return [...tracks].sort((a, b) => a.id - b.id);
}
