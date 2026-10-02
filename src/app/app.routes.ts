import { Routes } from '@angular/router';

import { Home } from './features/catalog/pages/home/home';
import { Login } from './features/auth/pages/login/login';
import { Register } from './features/auth/pages/register/register';

export const routes: Routes = [
  // Portada pública con el ranking de álbumes.
  { path: '', component: Home, pathMatch: 'full' },

  // Formularios de acceso y registro.
  { path: 'login', component: Login },
  { path: 'register', component: Register },

  // Las direcciones desconocidas vuelven a la portada.
  { path: '**', redirectTo: '' },
];