import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  inject,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, forkJoin, map, of, Subscription, switchMap, throwError } from 'rxjs';
import { PlaylistService, type OwnPlaylistItem } from '../../../../core/services/playlist.service.js';

interface PlaylistOption extends OwnPlaylistItem {
  alreadyAdded: boolean;
  unavailable: boolean;
}


import type {
  CreateReviewRequest,
  ReviewTarget,
} from '../../../../models/review.js';

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet, RouterLink],
  templateUrl: './review-form.html',
  styleUrl: './review-form.scss',
})
export class ReviewForm implements OnChanges {
  @Input({ required: true }) target!: ReviewTarget;
  @Input() submitting = false;
  @Input() errorMessage = '';
  @Input() title = '';
  @Input() imageUrl: string | null = null;

  @Output() submitReview = new EventEmitter<CreateReviewRequest>();

  @ViewChild('reviewDialog')
  private dialog!: ElementRef<HTMLDialogElement>;

  @ViewChild('playlistDialog')
  private playlistDialog!: ElementRef<HTMLDialogElement>;

  private readonly playlists = inject(PlaylistService);
  private readonly destroyRef = inject(DestroyRef);
  private listRequest?: Subscription;
  private addRequest?: Subscription;
  private targetKey = '';

  readonly playlistOptions = signal<PlaylistOption[]>([]);
  readonly playlistsLoading = signal(false);
  readonly playlistsError = signal<string | null>(null);
  readonly playlistAddError = signal<string | null>(null);
  readonly playlistSuccess = signal<string | null>(null);
  readonly addingPlaylistId = signal<number | null>(null);
  readonly playlistPage = signal(0);
  readonly playlistTotalPages = signal(0);

  readonly stars = [1, 2, 3, 4, 5];
  readonly validationError = signal<string | null>(null);

  rating = 3;
  text = '';

  ngOnChanges(changes: SimpleChanges): void {
    const key = `${this.target.type}:${this.target.id}`;
    if (this.targetKey !== key) {
      this.targetKey = key;
      this.listRequest?.unsubscribe();
      this.addRequest?.unsubscribe();
      this.playlistDialog?.nativeElement.close();
      this.playlistOptions.set([]);
      this.playlistPage.set(0);
      this.playlistTotalPages.set(0);
      this.playlistsError.set(null);
      this.playlistAddError.set(null);
      this.playlistSuccess.set(null);
    }

    const submittingChange = changes['submitting'];

    // Cierra y limpia únicamente después de una publicación exitosa.
    if (
      submittingChange?.previousValue === true &&
      submittingChange.currentValue === false &&
      !this.errorMessage
    ) {
      this.dialog?.nativeElement.close();
      this.text = '';
      this.validationError.set(null);
    }
  }

  open(): void {
    if (this.submitting) return;

    this.validationError.set(null);

    if (!this.dialog.nativeElement.open) {
      this.dialog.nativeElement.showModal();
    }
  }

  close(): void {
    if (!this.submitting) {
      this.dialog.nativeElement.close();
    }
  }

  onCancel(event: Event): void {
    if (this.submitting) {
      event.preventDefault();
    }
  }

  openPlaylists(): void {
    if (this.target.type !== 'track') return;
    this.playlistAddError.set(null);
    this.playlistSuccess.set(null);
    if (!this.playlistDialog.nativeElement.open) {
      this.playlistDialog.nativeElement.showModal();
    }
    this.loadPlaylists();
  }

  closePlaylists(): void {
    if (this.addingPlaylistId() !== null) return;
    this.listRequest?.unsubscribe();
    this.playlistDialog.nativeElement.close();
  }

  cancelPlaylists(event: Event): void {
    if (this.addingPlaylistId() !== null) event.preventDefault();
    else this.listRequest?.unsubscribe();
  }

  loadPlaylists(append = false): void {
    if (this.target.type !== 'track' || this.playlistsLoading() ||
        this.addingPlaylistId() !== null) return;

    const trackId = this.target.id;
    const key = this.targetKey;
    const page = append ? this.playlistPage() + 1 : 1;
    this.playlistsError.set(null);
    this.playlistsLoading.set(true);

    if (!append) {
      this.playlistOptions.set([]);
      this.playlistPage.set(0);
      this.playlistTotalPages.set(0);
    }

    this.listRequest = this.playlists.getMine(page, 10).pipe(
      switchMap(response => {
        const options = response.data.map(playlist =>
          this.playlists.getDetail(playlist.id).pipe(
            map(detail => ({
              ...playlist,
              isOwnPlaylist: detail.data.isOwnPlaylist,
              trackCount: detail.data.tracks.length,
              alreadyAdded: detail.data.tracks.some(track => track.id === trackId),
              unavailable: false,
            })),
            catchError(() => of({ ...playlist, alreadyAdded: false, unavailable: true })),
          ),
        );
        return (options.length ? forkJoin(options) : of([])).pipe(
          map(items => ({ items, pagination: response.pagination })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.playlistsLoading.set(false)),
    ).subscribe({
      next: response => {
        if (this.targetKey !== key) return;
        const items = response.items.filter(item => item.isOwnPlaylist);
        this.playlistOptions.update(current => {
          const seen = new Set(current.map(item => item.id));
          return append ? [...current, ...items.filter(item => !seen.has(item.id))] : items;
        });
        this.playlistPage.set(response.pagination.page);
        this.playlistTotalPages.set(response.pagination.totalPages);
      },
      error: (error: unknown) => {
        if (this.targetKey === key) {
          this.playlistsError.set(this.playlistErrorMessage(error, 'No pudimos cargar tus playlists.'));
        }
      },
    });
  }

  addToPlaylist(playlist: PlaylistOption): void {
    if (this.target.type !== 'track' || !playlist.isOwnPlaylist ||
        playlist.alreadyAdded || playlist.unavailable ||
        this.addingPlaylistId() !== null || this.playlistsLoading()) return;

    const trackId = this.target.id;
    const key = this.targetKey;
    this.addingPlaylistId.set(playlist.id);
    this.playlistAddError.set(null);
    this.playlistSuccess.set(null);

    this.addRequest = this.playlists.getDetail(playlist.id).pipe(
      switchMap(detail => {
        if (!detail.data.isOwnPlaylist) {
          return throwError(() => new Error('Solo podés agregar canciones a tus playlists.'));
        }
        if (detail.data.tracks.some(track => track.id === trackId)) {
          this.markPlaylistAdded(playlist.id, detail.data.tracks.length);
          return throwError(() => new Error('La canción ya está en esta playlist.'));
        }
        return this.playlists.addTrack(playlist.id, trackId);
      }),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.addingPlaylistId.set(null)),
    ).subscribe({
      next: response => {
        if (this.targetKey !== key) return;
        this.markPlaylistAdded(playlist.id, response.data.tracks.length);
        this.playlistSuccess.set(`Agregaste “${this.title}” a “${playlist.name}”.`);
      },
      error: (error: unknown) => {
        if (this.targetKey === key) {
          this.playlistAddError.set(this.playlistErrorMessage(error, 'No pudimos agregar la canción.'));
        }
      },
    });
  }

  private markPlaylistAdded(id: number, trackCount: number): void {
    this.playlistOptions.update(items => items.map(item =>
      item.id === id ? { ...item, alreadyAdded: true, trackCount } : item,
    ));
  }

  private playlistErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) return 'Iniciá sesión para ver tus playlists.';
      if (error.status === 0) return 'No pudimos conectar con el servidor.';
      if (typeof error.error?.message === 'string') return error.error.message;
      return fallback;
    }
    return error instanceof Error ? error.message : fallback;
  }

  selectRating(value: number, openDialog = false): void {
    if (this.submitting) return;

    this.rating = value;

    if (openDialog) this.open();
  }

  fill(star: number): number {
    return Math.max(0, Math.min(1, this.rating - star + 1)) * 100;
  }

  submit(): void {
    if (this.submitting) return;

    const reviewText = this.text.trim();

    if (
      Array.from(reviewText).length > 2000 ||
      reviewText.includes('\0')
    ) {
      this.validationError.set(
        'La reseña puede tener hasta 2000 caracteres y no contener caracteres NUL.',
      );
      return;
    }

    if (
      !Number.isFinite(this.rating) ||
      this.rating < 0.5 ||
      this.rating > 5 ||
      !Number.isInteger(this.rating * 2)
    ) {
      this.validationError.set('Elegí una puntuación entre 0.5 y 5.');
      return;
    }

    this.validationError.set(null);

    const request: CreateReviewRequest = {
      ...(this.target.type === 'release'
        ? { releaseId: this.target.id }
        : { trackId: this.target.id }),
      rating: this.rating,
      ...(reviewText ? { text: reviewText } : {}),
    };

    this.submitReview.emit(request);
  }
}
