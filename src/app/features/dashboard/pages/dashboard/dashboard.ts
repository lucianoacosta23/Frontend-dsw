import { Component, inject } from '@angular/core';

import { AuthService } from '../../../../core/services/auth.service.js';
import { Navbar } from '../../../../shared/components/navbar/navbar.js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [Navbar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  // El guard recupera la sesión antes de mostrar esta página.
  readonly auth = inject(AuthService);
}
