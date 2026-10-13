import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  readonly auth = inject(AuthService);
}
