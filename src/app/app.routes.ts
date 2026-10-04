import { Routes } from '@angular/router';

import { Home } from './features/catalog/pages/home/home';
import { Login } from './features/auth/pages/login/login';
import { Register } from './features/auth/pages/register/register';
import { ReleaseDetail } from './features/catalog/pages/release-detail/release-detail';
import { TrackDetail } from './features/catalog/pages/track-detail/track-detail';
import { ArtistProfile } from './features/catalog/pages/artist-profile/artist-profile';
import { UserProfile } from './features/users/pages/user-profile/user-profile';
export const routes: Routes = [
  // Portada pública con el ranking de álbumes.
  { path: '', component: Home, pathMatch: 'full' },

    // Detalles públicos de lanzamientos y pistas.
  { path: 'releases/:id', component: ReleaseDetail },
  { path: 'tracks/:id', component: TrackDetail },
  // Formularios de acceso y registro.
  { path: 'login', component: Login },
  { path: 'register', component: Register },
 { path: 'artists/:id', component: ArtistProfile },
{ path: 'users/:username', component: UserProfile },
  // Las direcciones desconocidas vuelven a la portada.
  { path: '**', redirectTo: '' },



];