import { Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-release-cover',
  template: `
    <div
      class="cover-frame"
      [class.interactive]="effect() === 'interactive'"
      [class.plain]="effect() === 'plain'"
    >
      @if (projected()) {
        <ng-content />
      } @else if (src() && failed() !== src()) {
        <img [src]="src()" [alt]="alt()" [loading]="loading()" (error)="failed.set(src())" />
      } @else {
        <div class="fallback" role="img" [attr.aria-label]="alt() + ' — portada no disponible'">
          <span aria-hidden="true">♪</span><small>Sin portada</small>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      aspect-ratio: 1;
      width: 100%;
      container-type: inline-size;
    }
    .cover-frame {
      display: grid;
      place-items: center;
      position: relative;
      isolation: isolate;
      box-sizing: border-box;
      height: 100%;
      background: var(--jb-surface-raised);
      border-radius: 8px;
      border: 1px solid var(--jb-border);
      box-shadow: 0 5px 12px #0006;
      overflow: hidden;
    }
    .cover-frame.plain {
      border: 0;
      border-radius: 0;
      box-shadow: none;
    }
    .cover-frame.interactive::after {
      content: '';
      position: absolute;
      inset: -65%;
      z-index: 1;
      pointer-events: none;
      background: linear-gradient(
        115deg, transparent 39%, #fff0 43%, #fff3 49%, #fff1 54%, transparent 60%
      );
      transform: translateX(-60%);
      opacity: 0;
    }
    @media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
      /* Las portadas menores de 80px conservan solo el acabado estático. */
      @container (min-width: 80px) {
        .cover-frame.interactive {
          transition: transform 200ms ease-out, box-shadow 200ms ease-out,
            border-color 200ms ease-out;
        }
        :host-context(a:hover) .cover-frame.interactive,
        :host-context(button:enabled:hover) .cover-frame.interactive {
          transform: scale(1.025);
          border-color: color-mix(in srgb, var(--jb-gold) 27%, transparent);
          box-shadow: 0 9px 19px #0008;
        }
        :host-context(a:hover) .cover-frame.interactive::after,
        :host-context(button:enabled:hover) .cover-frame.interactive::after {
          animation: cover-sheen 760ms ease-out both;
        }
      }
    }
    @keyframes cover-sheen {
      0% { transform: translateX(-60%); opacity: 0; }
      18%, 70% { opacity: 0.5; }
      100% { transform: translateX(60%); opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .cover-frame.interactive {
        transition: none;
        transform: none;
      }
      .cover-frame.interactive::after { animation: none; }
    }
    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .fallback {
      width: 100%;
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
  readonly effect = input<'static' | 'interactive' | 'plain'>('static');
  // Permite conservar el componente de imagen y su fallback en los usos existentes.
  readonly projected = input(false);
  readonly failed = signal<string | null>(null);
}
