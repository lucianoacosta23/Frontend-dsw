import { Component, EventEmitter, Input, Output, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, of, Subscription, switchMap, map } from 'rxjs';
import { SearchService } from '../../../../core/services/search.service';
import { CatalogService } from '../../../../core/services/catalog.service';
import { PlaylistService } from '../../../../core/services/playlist.service';
import { profileError } from '../../../../core/utils/profile-error';
import { ProfileImage } from '../../../../shared/components/profile-image/profile-image';
import type { FavoriteRelease, FavoriteTrack } from '../../../../models/user-profile';

interface Choice {
  key: string;
  id: number | null;
  spotifyId: string | null;
  name: string;
  image: string | null;
}
@Component({
  selector: 'app-favorite-picker',
  imports: [FormsModule, ProfileImage],
  templateUrl: './favorite-picker.html',
  styleUrl: './favorite-picker.scss',
})
export class FavoritePicker implements OnDestroy {
  @Input({ required: true }) kind!: 'release' | 'track';
  @Input() selectedIds: number[] = [];
  @Input() disabled = false;
  @Output() picked = new EventEmitter<FavoriteRelease | FavoriteTrack>();
  @Output() busyChange = new EventEmitter<boolean>();
  private readonly searchService = inject(SearchService);
  private readonly catalog = inject(CatalogService);
  private readonly playlists = inject(PlaylistService);
  private request?: Subscription;
  private selection?: Subscription;
  query = '';
  source = 'local';
  readonly results = signal<Choice[]>([]);
  readonly loading = signal(false);
  readonly selecting = signal(false);
  readonly searched = signal(false);
  readonly error = signal('');
  private readonly importedIds = new Map<string, number>();

  resetSearch(): void {
    this.request?.unsubscribe();
    this.results.set([]);
    this.searched.set(false);
    this.error.set('');
  }
  search(): void {
    if (this.disabled || this.selecting()) return;
    this.resetSearch();
    if (!this.query.trim()) {
      this.error.set('Escribí un nombre para buscar.');
      return;
    }
    this.loading.set(true);
    this.searched.set(true);
    const request =
      this.source === 'local'
        ? this.searchService
            .search(this.query, [this.kind === 'release' ? 'releases' : 'tracks'])
            .pipe(
              map((response) =>
                (this.kind === 'release'
                  ? response.data.releases.filter((item) => item.type !== 'SINGLE')
                  : response.data.tracks
                ).map((item) => ({
                  key: 'local-' + item.id,
                  id: item.id,
                  spotifyId: null,
                  name: item.name,
                  image: 'imageUrl' in item ? (item.imageUrl as string | null) : null,
                })),
              ),
            )
        : this.kind === 'release'
          ? this.searchService
              .searchSpotifyAlbums(this.query)
              .pipe(
                map((response) =>
                  response.data.albums.map((item) => ({
                    key: 'spotify-' + item.id,
                    id: null,
                    spotifyId: item.id,
                    name: item.name,
                    image: item.images[0]?.url ?? null,
                  })),
                ),
              )
          : this.playlists.searchTracks(this.query).pipe(
              map((response) => {
                if (response.warning) this.error.set(response.warning);
                return response.tracks.map((item) => ({
                  key: item.key,
                  id: item.localId,
                  spotifyId: item.spotifyId,
                  name: item.name,
                  image: item.imageUrl,
                }));
              }),
            );
    this.request = request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (data) => this.results.set(data),
      error: (error) => this.error.set(profileError(error, 'No pudimos buscar. Reintentá.')),
    });
  }
  choose(item: Choice): void {
    if (this.disabled || this.selecting() || this.selectedIds.length >= 5) return;
    this.error.set('');
    this.selecting.set(true);
    this.busyChange.emit(true);
    const knownId = item.id ?? this.importedIds.get(item.key);
    const idRequest =
      knownId !== undefined && knownId !== null
        ? of(knownId)
        : this.kind === 'release'
          ? this.searchService
              .importSpotifyAlbum(item.spotifyId!)
              .pipe(map((response) => response.data.releaseId))
          : this.playlists
              .importTrack(item.spotifyId!)
              .pipe(map((response) => response.data.trackId));
    this.selection = idRequest
      .pipe(
        switchMap((id) => {
          this.importedIds.set(item.key, id);
          return this.kind === 'release'
            ? this.catalog
                .getReleaseById(id)
                .pipe(map((response) => response.data as FavoriteRelease | FavoriteTrack))
            : this.catalog
                .getTrackById(id)
                .pipe(map((response) => response.data as FavoriteRelease | FavoriteTrack));
        }),
        finalize(() => {
          this.selecting.set(false);
          this.busyChange.emit(false);
        }),
      )
      .subscribe({
        next: (favorite) => {
          if ('type' in favorite && favorite.type === 'SINGLE') {
            this.error.set(
              'Los singles no pueden ser proyectos favoritos. Podés elegir sus canciones.',
            );
            return;
          }
          if (this.selectedIds.includes(favorite.id)) {
            this.error.set('Ya elegiste este favorito.');
            return;
          }
          this.picked.emit(favorite);
        },
        error: (error) =>
          this.error.set(profileError(error, 'No pudimos agregar esta selección. Reintentá.')),
      });
  }
  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.selection?.unsubscribe();
  }
}
