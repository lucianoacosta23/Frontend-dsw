import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, catchError, finalize, forkJoin, of } from 'rxjs';

import { SearchService } from '../../../../core/services/search.service';
import type { ArtistReleaseCard, SpotifyArtistReleasesResponse } from '../../../../models/artist-discography.js';
import { CatalogService } from '../../../../core/services/catalog.service';
import type { ArtistDetail, ReleaseDetail } from '../../../../models/catalog-details.js';
import { Navbar } from '../../../../shared/components/navbar/navbar';

type ReleaseFilter = 'ALL' | ReleaseDetail['type'];
type ReleaseOrder = 'newest' | 'oldest' | 'name';

@Component({
  imports: [RouterLink, Navbar, NgTemplateOutlet],
  selector: 'app-artist-profile',
  styleUrl: './artist-profile.scss',
  templateUrl: './artist-profile.html',
})
export class ArtistProfile implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(CatalogService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  private spotifyRequest?: Subscription;
  private importRequest?: Subscription;
  private readonly search = inject(SearchService);
  private readonly router = inject(Router);
  readonly spotifyReleases = signal<SpotifyArtistReleasesResponse['data']['items']>([]);
  readonly spotifyLoading = signal(false);
  readonly spotifyError = signal<string | null>(null);
  readonly nextOffset = signal<number | null>(null);
  readonly spotifyTotal = signal(0);
  readonly importingId = signal<string | null>(null);
  readonly importError = signal<string | null>(null);
  readonly allReleases = computed(() => {
    const locals = this.releases().map((item): ArtistReleaseCard => ({
      key: item.spotifyId ? `spotify:${item.spotifyId}` : `local:${item.id}`,
      localId: item.id, spotifyId: item.spotifyId, name: item.name,
      imageUrl: item.imageUrl, releaseDate: item.releaseDate, type: item.type,
    }));
    const merged = new Map(locals.map(item => [item.key, item]));
    for (const item of this.spotifyReleases()) {
      const key = `spotify:${item.spotifyId}`;
      if (!merged.has(key)) merged.set(key, { ...item, key, localId: null });
    }
    return [...merged.values()];
  });

  readonly artist = signal<ArtistDetail | null>(null);
  readonly releases = signal<ReleaseDetail[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly releasesError = signal<string | null>(null);
  readonly releaseFilter = signal<ReleaseFilter>('ALL');
  readonly releaseOrder = signal<ReleaseOrder>('newest');
  readonly visibleReleases = computed(() => {
    const filter = this.releaseFilter();
    const order = this.releaseOrder();
    return this.allReleases().filter(item => filter === 'ALL' || item.type === filter)
      .sort((a, b) => {
        if (order === 'name') return a.name.localeCompare(b.name, 'es') || a.key.localeCompare(b.key);
        const dates = a.releaseDate.localeCompare(b.releaseDate);
        return (order === 'oldest' ? dates : -dates)
          || a.name.localeCompare(b.name, 'es') || a.key.localeCompare(b.key);
      });
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.releaseFilter.set('ALL');
      this.releaseOrder.set('newest');
      this.loadArtist();
    });
  }

  loadArtist(): void {
    this.request?.unsubscribe();
    this.spotifyRequest?.unsubscribe();
    this.importRequest?.unsubscribe();
    this.spotifyReleases.set([]);
    this.spotifyError.set(null);
    this.spotifyLoading.set(false);
    this.nextOffset.set(null);
    this.spotifyTotal.set(0);
    this.importingId.set(null);
    this.importError.set(null);
    this.artist.set(null);
    this.releases.set([]);
    this.errorMessage.set(null);
    this.releasesError.set(null);
    const rawId = this.route.snapshot.paramMap.get('id');
    const id = Number(rawId);
    if (!rawId || !/^[1-9]\d*$/.test(rawId) || !Number.isSafeInteger(id) || id > 2147483647) {
      this.errorMessage.set('El ID del artista no es válido.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.request = forkJoin({
      artist: this.catalog.getArtistById(id),
      releases: this.catalog.getArtistReleases(id).pipe(catchError(() => {
        this.releasesError.set('No pudimos cargar la discografía. Intentá nuevamente.');
        return of([] as ReleaseDetail[]);
      })),
    }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: result => {
          this.artist.set(result.artist.data);
          this.releases.set(result.releases);
          if (result.artist.data.spotifyId) this.loadSpotifyReleases(0);
        },
        error: (error: unknown) => this.errorMessage.set(this.getErrorMessage(error)),
      });
  }

  loadMoreSpotify(): void {
    const offset = this.nextOffset();
    if (offset !== null) this.loadSpotifyReleases(offset);
  }

  retrySpotify(): void {
    this.loadSpotifyReleases(this.nextOffset() ?? 0);
  }

  private loadSpotifyReleases(offset: number): void {
    const spotifyId = this.artist()?.spotifyId;
    if (!spotifyId || this.spotifyLoading()) return;
    this.spotifyLoading.set(true);
    this.spotifyError.set(null);
    this.spotifyRequest = this.catalog.getSpotifyArtistReleases(spotifyId, offset)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.spotifyLoading.set(false)))
      .subscribe({
        next: response => {
          const combined = offset === 0 ? [] : this.spotifyReleases();
          const unique = new Map(combined.map(item => [item.spotifyId, item]));
          for (const item of response.data.items) unique.set(item.spotifyId, item);
          this.spotifyReleases.set([...unique.values()]);
          this.spotifyTotal.set(response.data.total);
          this.nextOffset.set(response.data.nextOffset);
        },
        error: (error: unknown) => this.spotifyError.set(
          error instanceof HttpErrorResponse && error.status === 401
            ? 'Iniciá sesión para consultar la discografía de Spotify.'
            : error instanceof HttpErrorResponse && error.status === 429
              ? 'Spotify alcanzó su límite de consultas. Reintentá más tarde.'
              : 'No pudimos consultar Spotify. Los releases locales siguen disponibles.',
        ),
      });
  }

  openSpotifyRelease(item: ArtistReleaseCard): void {
    if (!item.spotifyId || this.importingId()) return;
    this.importError.set(null);
    this.importingId.set(item.spotifyId);
    this.importRequest = this.search.importSpotifyAlbum(item.spotifyId)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.importingId.set(null)))
      .subscribe({
        next: response => { void this.router.navigate(['/releases', response.data.releaseId]); },
        error: (error: unknown) => this.importError.set(
          error instanceof HttpErrorResponse && error.status === 401
            ? 'Iniciá sesión para abrir este release.'
            : 'No pudimos abrir el release. Intentá nuevamente.',
        ),
      });
  }

  setFilter(value: string): void {
    if (['ALL', 'ALBUM', 'EP', 'SINGLE', 'MIXTAPE', 'COMPILATION'].includes(value)) {
      this.releaseFilter.set(value as ReleaseFilter);
    }
  }

  setOrder(value: string): void {
    if (value === 'newest' || value === 'oldest' || value === 'name') {
      this.releaseOrder.set(value);
    }
  }

  typeLabel(type: ReleaseDetail['type']): string {
    return { ALBUM: 'Álbum', EP: 'EP', SINGLE: 'Single', MIXTAPE: 'Mixtape', COMPILATION: 'Compilación' }[type];
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'No pudimos conectar con el catálogo. Revisá que el backend esté iniciado.';
      if (error.status === 404) return 'No encontramos ese artista.';
    }
    return 'No pudimos cargar el perfil del artista. Intentá nuevamente.';
  }
}
