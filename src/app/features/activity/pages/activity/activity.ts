import { Component, signal } from '@angular/core';

import { Navbar } from '../../../../shared/components/navbar/navbar.js';

type ActivityTab = 'following' | 'own' | 'incoming';

@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [Navbar],
  templateUrl: './activity.html',
  styleUrl: './activity.scss',
})
export class Activity {
  readonly selectedTab = signal<ActivityTab>('following');

  readonly tabs: Array<{
    id: ActivityTab;
    label: string;
    description: string;
  }> = [
    {
      id: 'following',
      label: 'Seguidos',
      description: 'La actividad de las personas que seguís.',
    },
    {
      id: 'own',
      label: 'Vos',
      description: 'Tus reseñas, likes y comentarios.',
    },
    {
      id: 'incoming',
      label: 'Recibida',
      description: 'Las interacciones de otras personas con tu cuenta.',
    },
  ];

  selectTab(tab: ActivityTab): void {
    this.selectedTab.set(tab);
  }
}
