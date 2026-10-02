import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../../environments/environments.js';
import { CatalogService } from '../../../../core/services/catalog.service';
import { PopularAlbum } from '../../../../models/popular-album.js';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',imports: [RouterLink],
})
export class Home implements OnInit {
  private readonly catalog = inject(CatalogService);

  // El backend inicia el flujo OAuth y luego redirige a Spotify.
readonly spotifyLoginUrl = `${environment.apiBaseUrl}/auth/spotify/login`;
  // Signals para que la vista reaccione cuando cambian los datos.
  readonly albums = signal<PopularAlbum[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  // Al entrar a la portada, cargamos el ranking público.
  ngOnInit(): void {
    this.loadPopularAlbums();
  }

  // Pide los diez álbumes más reseñados y actualiza el estado de la pantalla.
  loadPopularAlbums(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.catalog
      .getPopularAlbums(10)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: response => this.albums.set(response.data),
        error: (error: unknown) => {
          this.errorMessage.set(this.getErrorMessage(error));
        },
      });
  }

  // Junta los artistas para mostrarlos en una sola línea.
  artistsLabel(album: PopularAlbum): string {
    return album.artists.map(artist => artist.name).join(', ') || 'Artista desconocido';
  }

  // El año se puede mostrar tomando los primeros cuatro caracteres de la fecha.
  releaseYear(album: PopularAlbum): string {
    return album.releaseDate.slice(0, 4);
  }

  // Traduce errores técnicos a un mensaje entendible para quien usa la app.
  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'No pudimos conectar con el catálogo. Revisá que el backend esté iniciado.';
    }

    return 'No pudimos cargar los álbumes populares. Intentá nuevamente.';
  }
}
