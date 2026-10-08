import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

import type { PopularAlbum } from '../../../../models/popular-album';
import { ReleaseCover } from '../release-cover/release-cover';

@Component({
  selector: 'app-popular-carousel',
  imports: [RouterLink, NgTemplateOutlet, ReleaseCover],
  templateUrl: './popular-carousel.html',
  styleUrl: './popular-carousel.scss',
})
export class PopularCarousel implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) albums: PopularAlbum[] = [];
  @Input() directNavigation = false;

  @ViewChild('rail') rail!: ElementRef<HTMLDivElement>;
  @ViewChild('originals') originals!: ElementRef<HTMLDivElement>;

  private readonly zone = inject(NgZone);

  readonly paused = signal(false);
  readonly reduced = signal(false);
  readonly overflow = signal(false);

  private hovered = false;
  private focused = false;
  private visible = true;
  private destroyed = false;
  private frame = 0;
  private previousTime = 0;
  private position = 0;
  private cycle = 0;
  private resize?: ResizeObserver;
  private intersection?: IntersectionObserver;
  private media?: MediaQueryList;

  ngAfterViewInit(): void {
    this.media = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reduced.set(this.media.matches);
    this.media.addEventListener('change', this.onMotionChange);

    document.addEventListener('visibilitychange', this.updateAnimation);

    this.resize = new ResizeObserver(() => this.measure());
    this.resize.observe(this.rail.nativeElement);
    this.resize.observe(this.originals.nativeElement);

    this.intersection = new IntersectionObserver(entries => {
      this.visible = entries[0]?.isIntersecting ?? false;
      this.updateAnimation();
    });

    this.intersection.observe(this.rail.nativeElement);
    this.measure();
  }

  ngOnChanges(): void {
    // Espera a que se rendericen los discos recibidos.
    queueMicrotask(() => {
      if (!this.destroyed && this.rail) {
        this.measure();
      }
    });
  }

  private measure(): void {
    const rail = this.rail.nativeElement;
    const group = this.originals.nativeElement;
    const track = group.parentElement!;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;

    this.cycle = group.getBoundingClientRect().width + gap;

    this.overflow.set(
      this.albums.length > 1 &&
      group.scrollWidth > rail.clientWidth + 1,
    );

    this.updateAnimation();
  }

  private readonly onMotionChange = (
    event: MediaQueryListEvent,
  ): void => {
    this.reduced.set(event.matches);
    this.updateAnimation();
  };

  private canAnimate(): boolean {
    return (
      this.cycle > 0 &&
      this.overflow() &&
      !this.paused() &&
      !this.reduced() &&
      !this.hovered &&
      !this.focused &&
      !document.hidden &&
      this.visible
    );
  }

  private readonly updateAnimation = (): void => {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.previousTime = 0;

    if (
      this.destroyed ||
      !this.rail ||
      !this.canAnimate()
    ) {
      return;
    }

    this.position = this.rail.nativeElement.scrollLeft % this.cycle;

    this.zone.runOutsideAngular(() => {
      this.frame = requestAnimationFrame(this.tick);
    });
  };

  private readonly tick = (time: number): void => {
    if (this.destroyed || !this.canAnimate()) {
      this.frame = 0;
      return;
    }

    if (this.previousTime) {
      // Mantiene el progreso fraccional del movimiento.
      this.position = (
        this.position +
        Math.min(time - this.previousTime, 50) * 0.018
      ) % this.cycle;

      this.rail.nativeElement.scrollLeft = this.position;
    }

    this.previousTime = time;
    this.frame = requestAnimationFrame(this.tick);
  };

  hover(value: boolean): void {
    this.hovered = value;
    this.updateAnimation();
  }

  focus(): void {
    this.focused = true;
    this.updateAnimation();
  }

  blur(event: FocusEvent): void {
    const element = event.currentTarget as HTMLElement;
    const nextElement = event.relatedTarget as Node | null;

    if (!element.contains(nextElement)) {
      this.focused = false;
      this.updateAnimation();
    }
  }

  pause(): void {
    this.paused.set(true);
    this.updateAnimation();
  }

  toggle(): void {
    this.paused.update(value => !value);
    this.updateAnimation();
  }

  move(direction: number): void {
    this.pause();

    const rail = this.rail.nativeElement;
    const max = Math.max(
      0,
      this.originals.nativeElement.scrollWidth - rail.clientWidth,
    );

    rail.scrollTo({
      left: Math.max(
        0,
        Math.min(
          max,
          rail.scrollLeft + direction * rail.clientWidth * 0.75,
        ),
      ),
      behavior: this.reduced() ? 'instant' : 'smooth',
    });
  }

  artists(album: PopularAlbum): string {
    return (
      album.artists.map(artist => artist.name).join(', ') ||
      'Artista desconocido'
    );
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.resize?.disconnect();
    this.intersection?.disconnect();
    this.media?.removeEventListener('change', this.onMotionChange);

    document.removeEventListener(
      'visibilitychange',
      this.updateAnimation,
    );
  }
}