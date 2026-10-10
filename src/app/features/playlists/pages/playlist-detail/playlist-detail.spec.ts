import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import type { PlaylistDetailData } from '../../../../core/services/playlist.service.js';
import { PlaylistDetail } from './playlist-detail';

function buildPlaylist(
  overrides: Partial<PlaylistDetailData> = {},
): PlaylistDetailData {
  return {
    id: 7,
    name: 'Rock Argentino',
    author: { id: 3, username: 'juan', fullName: 'Juan Pérez' },
    saveCount: 1,
    savedByMe: false,
    isOwnPlaylist: false,
    tracks: [
      {
        id: 20,
        spotifyId: null,
        name: 'Segunda',
        durationMs: 3 * 60_000 + 7_000,
        release: { id: 1, name: 'Disco B', imageUrl: null },
        artists: [{ id: 1, name: 'Artista B' }],
      },
      {
        id: 10,
        spotifyId: null,
        name: 'Primera',
        durationMs: 45 * 60_000 + 5_000,
        release: { id: 2, name: 'Disco A', imageUrl: 'https://img/a.jpg' },
        artists: [
          { id: 2, name: 'Artista A' },
          { id: 3, name: 'Invitado' },
        ],
      },
    ],
    ...overrides,
  };
}

describe('PlaylistDetail', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'playlists/:id', component: PlaylistDetail },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  async function open(data: PlaylistDetailData): Promise<HTMLElement> {
    await harness.navigateByUrl('/playlists/7', PlaylistDetail);

    http.expectOne(req => req.url.endsWith('/playlist/7')).flush({
      message: 'ok',
      data,
    });

    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  it('muestra nombre, creador, guardados, canciones y duración total', async () => {
    const el = await open(buildPlaylist());

    expect(el.querySelector('h1')?.textContent).toContain('Rock Argentino');

    const meta = el.querySelector('.meta')?.textContent ?? '';
    expect(meta).toContain('juan');
    expect(meta).toContain('1 guardado');
    expect(meta).toContain('2 canciones');
    expect(meta).toContain('48 min');
  });

  it('el creador enlaza a su perfil y cada canción a su detalle', async () => {
    const el = await open(buildPlaylist());

    const author = el.querySelector<HTMLAnchorElement>('.author-link');
    expect(author?.getAttribute('href')).toBe('/users/juan');

    const links = Array.from(
      el.querySelectorAll<HTMLAnchorElement>('.track-link'),
    );
    expect(links.map(link => link.getAttribute('href'))).toEqual([
      '/tracks/10',
      '/tracks/20',
    ]);
  });

  it('formatea la duración de cada canción como m:ss', async () => {
    const el = await open(buildPlaylist());

    const durations = Array.from(
      el.querySelectorAll('td.duration'),
    ).map(cell => cell.textContent?.trim());

    expect(durations).toEqual(['45:05', '3:07']);
  });

  it('muestra el botón + solo al creador de la playlist', async () => {
    const other = await open(buildPlaylist({ isOwnPlaylist: false }));
    expect(other.querySelector('.add-toggle')).toBeNull();
    expect(other.querySelector('.save-toggle')).not.toBeNull();
  });

  it('el dueño no ve el ícono de guardar y sí el botón +', async () => {
    const el = await open(buildPlaylist({ isOwnPlaylist: true }));
    expect(el.querySelector('.save-toggle')).toBeNull();
    expect(el.querySelector('.add-toggle')).not.toBeNull();
  });

  it('muestra el menú de tres puntos en cada canción', async () => {
    const el = await open(buildPlaylist({ isOwnPlaylist: false }));
    expect(el.querySelectorAll('.menu-toggle').length).toBe(2);
    expect(el.querySelector('.menu')).toBeNull();

    el.querySelector<HTMLButtonElement>('.menu-toggle')!.click();
    harness.detectChanges();

    expect(el.querySelector('.menu')?.textContent).toContain('Agregar');
    expect(el.querySelector('.menu')?.textContent).not.toContain('Eliminar');
  });

  it('el dueño puede eliminar una canción desde el menú', async () => {
    const el = await open(buildPlaylist({ isOwnPlaylist: true }));

    el.querySelector<HTMLButtonElement>('.menu-toggle')!.click();
    harness.detectChanges();

    expect(el.querySelector('.menu')?.textContent).toContain('Eliminar');

    el.querySelector<HTMLButtonElement>('.menu .danger')!.click();
    harness.detectChanges();

    http.expectOne(
      req =>
        req.method === 'DELETE' &&
        req.url.endsWith('/playlist/7/tracks/10'),
    ).flush({
      message: 'ok',
      data: {
        id: 7,
        name: 'Rock Argentino',
        tracks: [
          {
            id: 20,
            spotifyId: null,
            name: 'Segunda',
            durationMs: 3 * 60_000 + 7_000,
            release: { id: 1, name: 'Disco B', imageUrl: null },
            artists: [{ id: 1, name: 'Artista B' }],
          },
        ],
      },
    });

    harness.detectChanges();

    expect(el.querySelectorAll('.track-link').length).toBe(1);
    expect(el.textContent).toContain('Eliminaste “Primera”.');
  });

  it('permite guardar una playlist ajena', async () => {
    const el = await open(buildPlaylist({ isOwnPlaylist: false }));

    el.querySelector<HTMLButtonElement>('.save-toggle')!.click();
    harness.detectChanges();

    http.expectOne(
      req => req.method === 'POST' && req.url.endsWith('/playlist/7/save'),
    ).flush({
      message: 'ok',
      data: { playlistId: 7, savedByMe: true, saveCount: 2 },
    });

    harness.detectChanges();

    expect(el.querySelector('.save-toggle')?.classList.contains('saved')).toBe(
      true,
    );
    expect(el.querySelector('.meta')?.textContent).toContain('2 guardados');
  });

  it('lista playlists propias sin esa canción al agregar', async () => {
    const el = await open(buildPlaylist({ isOwnPlaylist: false }));

    el.querySelector<HTMLButtonElement>('.menu-toggle')!.click();
    harness.detectChanges();
    el.querySelector<HTMLButtonElement>('[role="menuitem"]')!.click();
    harness.detectChanges();

    http.expectOne(
      req =>
        req.url.includes('/playlist/mine/targets') &&
        req.params.get('trackId') === '10',
    ).flush({
      data: [
        { id: 7, name: 'Actual', containsTrack: false },
        { id: 8, name: 'Otra mía', containsTrack: false },
        { id: 9, name: 'Ya la tiene', containsTrack: true },
      ],
    });

    harness.detectChanges();

    const labels = Array.from(
      el.querySelectorAll('.picker-list button'),
    ).map(button => button.textContent?.trim());

    expect(labels).toEqual(['Otra mía']);
  });

  it('el creador ve el botón + y puede abrir el panel de búsqueda', async () => {
    const el = await open(buildPlaylist({ isOwnPlaylist: true }));

    const button = el.querySelector<HTMLButtonElement>('.add-toggle');
    expect(button).not.toBeNull();
    expect(el.querySelector('#add-panel')).toBeNull();

    button!.click();
    harness.detectChanges();

    expect(el.querySelector('#add-panel')).not.toBeNull();
    expect(button!.getAttribute('aria-expanded')).toBe('true');
  });

  it('muestra un mensaje cuando la playlist no tiene canciones', async () => {
    const el = await open(buildPlaylist({ tracks: [] }));

    expect(el.querySelector('.track-table')).toBeNull();
    expect(el.querySelector('.empty')?.textContent).toContain(
      'todavía no tiene canciones',
    );
  });

  it('muestra el error del backend si la playlist no existe', async () => {
    await harness.navigateByUrl('/playlists/7', PlaylistDetail);

    http.expectOne(req => req.url.endsWith('/playlist/7')).flush(
      { message: 'Playlist no encontrada' },
      { status: 404, statusText: 'Not Found' },
    );

    harness.detectChanges();

    const el = harness.routeNativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Playlist no encontrada',
    );
  });
});
