import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service.js';
import { Navbar } from '../../../../shared/components/navbar/navbar.js';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [Navbar, RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboard {
  // El guard ya comprobó la sesión y el rol.
  readonly auth = inject(AuthService);
}