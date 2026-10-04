import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { CatalogService } from '../../../../core/services/catalog.service';
import type { ArtistDetail } from '../../../../models/catalog-details.js';

@Component({
  imports: [RouterLink],
  selector: 'app-artist-profile',
  styleUrl: './artist-profile.scss',
  templateUrl: './artist-profile.html',
})
export class ArtistProfile implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(CatalogService);

  readonly artist = signal<ArtistDetail | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadArtist();
  }

  // Carga el artista indicado en la URL.
  loadArtist(): void {
    const rawId = this.route.snapshot.paramMap.get('id');

    if (!rawId || !/^[1-9]\d*$/.test(rawId)) {
      this.errorMessage.set('El ID del artista no es válido.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.catalog
      .getArtistById(Number(rawId))
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: response => this.artist.set(response.data),
        error: (error: unknown) => {
          this.errorMessage.set(this.getErrorMessage(error));
        },
      });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No pudimos conectar con el catálogo. Revisá que el backend esté iniciado.';
      }

      if (error.status === 404) {
        return 'No encontramos ese artista.';
      }
    }

    return 'No pudimos cargar el perfil del artista. Intentá nuevamente.';
  }
}