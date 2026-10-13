import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service.js';
import { environment } from '../../../../environments/environments';
import { SearchBox } from '../search-box/search-box';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, SearchBox],
  templateUrl: './navbar.html',
  styleUrl: './navbar-home.scss',
  host: { class: 'home-nav', '[style.height.px]': 'headerHeight()' },
})
export class Navbar implements AfterViewInit {
  @Input() home = false;
  @Input() sessionLoading = false;
  @Input() sessionError: string | null = null;
  @Output() retrySession = new EventEmitter<void>();
  readonly spotifyLoginUrl = `${environment.apiBaseUrl}/auth/spotify/login?returnUrl=${encodeURIComponent('/dashboard')}`;
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  @ViewChild('header', { static: true }) private header!: ElementRef<HTMLElement>;
  readonly headerHeight = signal(94);
  query = '';

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.query = params.get('q') ?? '';
    });
  }

  ngAfterViewInit(): void {
    const measure = () =>
      this.headerHeight.set(Math.ceil(this.header.nativeElement.getBoundingClientRect().height));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(this.header.nativeElement);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  submitSearch(): void {
    const query = this.query.trim();
    if (!query || query.length > 255) return;
    const destination = this.router.createUrlTree(['/search'], { queryParams: { q: query } });
    if (this.auth.currentUser()) {
      void this.router.navigateByUrl(destination);
    } else {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.serializeUrl(destination) },
      });
    }
  }

  readonly loggingOut = signal(false);
  readonly logoutError = signal('');

  scrollToTrends(event: Event): void {
    if (!this.home) return;
    const trends = document.getElementById('tendencias');
    if (!trends) return;
    event.preventDefault();
    window.scrollTo({
      top: window.scrollY + trends.getBoundingClientRect().top - this.headerHeight() - 24,
      behavior: 'auto',
    });
  }

  // El backend elimina la sesión; después volvemos a la portada pública.
  logout(): void {
    if (this.loggingOut()) return;

    this.loggingOut.set(true);
    this.logoutError.set('');

    this.auth
      .logout()
      .pipe(finalize(() => this.loggingOut.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/');
        },
        error: () => {
          this.logoutError.set('No pudimos cerrar sesión. Intentá nuevamente.');
        },
      });
  }
}
{
}
