import { Routes } from '@angular/router';
import { guestGuard } from './core/guards/guest-guard';
import {
  SpotifyRegister,
} from './features/auth/pages/spotify-register/spotify-register.js';
import { ReviewDetail } from './features/reviews/pages/review-detail/review-detail.js';
import { PlaylistDetail } from './features/playlists/pages/playlist-detail/playlist-detail.js';
import { CreatePlaylist } from './features/playlists/pages/create-playlist/create-playlist.js';
import { adminGuard } from './core/guards/admin-guard.js';
import { AdminDashboard } from './features/admin/pages/admin-dashboard/admin-dashboard.js';
import { Activity } from './features/activity/pages/activity/activity.js';
import { OwnProfile } from './features/users/pages/own-profile/own-profile.js';
import { EditProfile } from './features/users/pages/edit-profile/edit-profile.js';
import { Search } from './features/search/pages/search/search.js';
import { authGuard } from './core/guards/auth-guard.js';
import { Home } from './features/catalog/pages/home/home';
import { Dashboard } from './features/dashboard/pages/dashboard/dashboard';
import { Login } from './features/auth/pages/login/login';
import { Register } from './features/auth/pages/register/register';
import { ReleaseDetail } from './features/catalog/pages/release-detail/release-detail';
import { TrackDetail } from './features/catalog/pages/track-detail/track-detail';
import { ArtistProfile } from './features/catalog/pages/artist-profile/artist-profile';
import { UserProfile } from './features/users/pages/user-profile/user-profile';

export const routes: Routes = [
  // Portada pública.
  { path: '', component: Home, pathMatch: 'full' },

  // Inicio privado: consulta la sesión antes de entrar.
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard],
  },

  // Detalles y perfiles.
  { path: 'releases/:id', component: ReleaseDetail },
  { path: 'tracks/:id', component: TrackDetail },
  { path: 'artists/:id', component: ArtistProfile },
  { path: 'users/:username', component: UserProfile },

  // Acceso y registro.
  {
  path: 'login',
  component: Login,
  canActivate: [guestGuard],
},
  { path: 'register', component: Register },

    // La búsqueda requiere una sesión válida.
  {
    path: 'search',
    component: Search,
    canActivate: [authGuard],
  },
  
  // Ambas páginas trabajan con la cuenta autenticada.
  {
    path: 'profile/edit',
    component: EditProfile,
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    component: OwnProfile,
    canActivate: [authGuard],
  },

    // Actividad de la cuenta autenticada y su comunidad.
  {
    path: 'activity',
    component: Activity,
    canActivate: [authGuard],
  },

    // El guard comprueba tanto la sesión como el rol ADMIN.
  {
    path: 'admin',
    component: AdminDashboard,
    canActivate: [adminGuard],
  },

    {
    path: 'playlists/new',
    component: CreatePlaylist,
    canActivate: [authGuard],
  },

  {
    path: 'playlists/:id',
    component: PlaylistDetail,
    canActivate: [authGuard],
  },

    {
    path: 'reviews/:id',
    component: ReviewDetail,
    canActivate: [authGuard],
  },

{
  path: 'register/spotify',
  component: SpotifyRegister,
},

  // Debe quedar última: captura las direcciones desconocidas.
  { path: '**', redirectTo: '' },
];