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
import { ActivatedRoute, NavigationStart, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service.js';
import { ProfileAvatarService } from '../../../core/services/profile-avatar.service';
import { ProfileImage } from '../profile-image/profile-image';
import { SearchBox } from '../search-box/search-box';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, SearchBox, ProfileImage],
  templateUrl: './navbar.html',
  styleUrl: './navbar-home.scss',
  host: {
    class: 'home-nav',
    '[style.height.px]': 'headerHeight()',
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeMenu(true)',
    '(document:focusin)': 'onFocusChange($event)',
  },
})
export class Navbar implements AfterViewInit {
  @Input() home = false;
  // Appearance does not change the Trends link's navigation behavior.
  @Input() appearance: 'default' | 'home' = 'default';
  @Input() sessionLoading = false;
  @Input() sessionError: string | null = null;
  @Output() retrySession = new EventEmitter<void>();
  readonly auth = inject(AuthService);
  readonly avatar = inject(ProfileAvatarService);
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
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event instanceof NavigationStart) this.closeMenu();
    });
  }

  closeMenu(restoreFocus = false): void {
    const menu = this.header?.nativeElement.querySelector<HTMLDetailsElement>('details[open]');
    if (!menu) return;
    menu.open = false;
    if (restoreFocus) menu.querySelector('summary')?.focus();
  }

  onDocumentClick(event: MouseEvent): void {
    const menu = this.header.nativeElement.querySelector<HTMLDetailsElement>('details[open]');
    const target = event.target;
    if (!menu || !(target instanceof Node)) return;
    if (!menu.contains(target) || (target instanceof Element && target.closest('.dropdown a, .dropdown button'))) {
      this.closeMenu();
    }
  }

  onFocusChange(event: FocusEvent): void {
    const menu = this.header.nativeElement.querySelector<HTMLDetailsElement>('details[open]');
    if (menu && event.target instanceof Node && !menu.contains(event.target)) this.closeMenu();
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
