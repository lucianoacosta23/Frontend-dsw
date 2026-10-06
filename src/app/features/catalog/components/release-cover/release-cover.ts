import { Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-release-cover',
  template: `
    @if (src() && failed() !== src()) {
      <img [src]="src()" [alt]="alt()" [loading]="loading()" (error)="failed.set(src())" />
    } @else {
      <div class="fallback" role="img" [attr.aria-label]="alt() + ' — portada no disponible'">
        <span aria-hidden="true">♪</span><small>Sin portada</small>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      aspect-ratio: 1;
      width: 100%;
      background: var(--jb-surface-raised);
      border-radius: 4px;
      overflow: hidden;
    }
    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .fallback {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      color: var(--jb-muted);
      background:
        radial-gradient(ellipse at 25% 15%, #b8756733, transparent), var(--jb-surface-raised);
    }
    .fallback span {
      font-size: clamp(2rem, 6vw, 5rem);
      color: var(--jb-gold);
    }
    small {
      font: inherit;
      font-size: 0.8rem;
    }
  `,
})
export class ReleaseCover {
  readonly src = input<string | null>(null);
  readonly alt = input('');
  readonly loading = input<'eager' | 'lazy'>('lazy');
  readonly failed = signal<string | null>(null);
}
