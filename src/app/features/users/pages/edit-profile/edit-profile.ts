import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Navbar } from '../../../../shared/components/navbar/navbar.js';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [Navbar, RouterLink],
  templateUrl: './edit-profile.html',
  styleUrl: './edit-profile.scss',
})
export class EditProfile {}