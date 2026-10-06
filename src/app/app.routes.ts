import { Routes } from '@angular/router';

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
  { path: 'login', component: Login },
  { path: 'register', component: Register },

    // La búsqueda requiere una sesión válida.
  {
    path: 'search',
    component: Search,
    canActivate: [authGuard],
  },
  
  // Debe quedar última: captura las direcciones desconocidas.
  { path: '**', redirectTo: '' },
];