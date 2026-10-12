import { Component } from '@angular/core';

import { Home } from '../../../catalog/pages/home/home';

@Component({
  selector: 'app-dashboard',
  imports: [Home],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {}