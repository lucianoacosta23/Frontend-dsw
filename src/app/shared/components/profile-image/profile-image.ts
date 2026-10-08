import { Component, input, signal } from '@angular/core';
import { resolveMediaUrl } from '../../../core/utils/media-url';

@Component({
  selector: 'app-profile-image',
  template: `@if (url(); as source) {
      @if (failed() !== source) {
        <img [src]="source" [alt]="alt()" (error)="failed.set(source)" />
      } @else {
        <span role="img" [attr.aria-label]="alt() + ' — imagen no disponible'">{{
          fallback()
        }}</span>
      }
    } @else {
      <span role="img" [attr.aria-label]="alt() + ' — sin imagen'">{{ fallback() }}</span>
    }`,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    span {
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
      color: var(--jb-gold);
    }
  `,
})
export class ProfileImage {
  readonly src = input<string | null | undefined>(null);
  readonly alt = input('');
  readonly fallback = input('♫');
  readonly failed = signal('');
  url(): string | null {
    return resolveMediaUrl(this.src());
  }
}
