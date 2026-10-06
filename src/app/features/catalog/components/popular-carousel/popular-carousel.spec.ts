import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PopularCarousel } from './popular-carousel';

describe('PopularCarousel: motion and accessibility', () => {
  let frames: Map<number, FrameRequestCallback>;
  let resize: () => void;
  let motion: (event: { matches: boolean }) => void;
  let visibility: (entries: { isIntersecting: boolean }[]) => void;
  let id: number;
  beforeEach(() => {
    frames = new Map();
    id = 0;
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
      frames.set(++id, fn);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (key: number) => frames.delete(key));
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: (_: string, fn: typeof motion) => {
        motion = fn;
      },
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(fn: () => void) {
          resize = fn;
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(fn: typeof visibility) {
          visibility = fn;
        }
        observe() {}
        disconnect() {}
      },
    );
    TestBed.configureTestingModule({ imports: [PopularCarousel], providers: [provideRouter([])] });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });
  function render(width = 1200) {
    const fixture = TestBed.createComponent(PopularCarousel);
    fixture.componentRef.setInput(
      'albums',
      Array.from({ length: 6 }, (_, i) => ({
        id: i + 1,
        name: 'Album ' + i,
        artists: [],
        imageUrl: null,
        releaseDate: '2020',
        reviewCount: 2,
      })),
    );
    fixture.detectChanges();
    const rail = fixture.nativeElement.querySelector('.rail') as HTMLElement;
    const group = fixture.nativeElement.querySelector('.group') as HTMLElement;
    Object.defineProperty(rail, 'clientWidth', { value: 600, configurable: true });
    Object.defineProperty(group, 'scrollWidth', { value: width, configurable: true });
    vi.spyOn(group, 'getBoundingClientRect').mockReturnValue({ width } as DOMRect);
    rail.scrollTo = vi.fn();
    resize();
    fixture.detectChanges();
    return { fixture, rail, group, component: fixture.componentInstance };
  }
  function step(time: number) {
    const entry = [...frames.entries()].at(-1);
    if (entry) {
      frames.delete(entry[0]);
      entry[1](time);
    }
  }
  it('moves uniformly and wraps one repeated group without an animated rewind', () => {
    const { component, rail, group } = render();
    step(100);
    step(150);
    expect(rail.scrollLeft).toBeCloseTo(0.9);
    step(200);
    expect(rail.scrollLeft).toBeCloseTo(1.8);
    const gap = parseFloat(getComputedStyle(group.parentElement!).columnGap) || 0;
    component.pause();
    rail.scrollLeft = 1200 + gap - 0.4;
    component.toggle();
    step(300);
    step(350);
    expect(rail.scrollLeft).toBeCloseTo(0.5);
  });
  it('provides only one interactive, accessible set of links', () => {
    const { fixture } = render();
    const copy = fixture.nativeElement.querySelector('.copy');
    expect(copy.getAttribute('aria-hidden')).toBe('true');
    expect(copy.hasAttribute('inert')).toBe(true);
    expect(copy.querySelectorAll('a,button,[tabindex],[id]')).toHaveLength(0);
    expect(fixture.nativeElement.querySelectorAll('a')).toHaveLength(6);
  });
  it('stops on hover, keyboard focus and manual interaction', () => {
    const { component, rail, fixture } = render();
    component.hover(true);
    expect(frames.size).toBe(0);
    component.hover(false);
    expect(frames.size).toBe(1);
    component.focus();
    expect(frames.size).toBe(0);
    fixture.nativeElement
      .querySelector('.carousel')
      .dispatchEvent(new FocusEvent('focusout', { relatedTarget: null, bubbles: true }));
    fixture.detectChanges();
    expect(frames.size).toBe(1);
    component.move(1);
    fixture.detectChanges();
    expect(frames.size).toBe(0);
    expect(component.paused()).toBe(true);
    expect(rail.scrollTo).toHaveBeenCalledWith({ left: 450, behavior: 'smooth' });
  });
  it('disables automatic motion when reduced motion is requested', () => {
    const { component, rail, fixture } = render();
    motion({ matches: true });
    fixture.detectChanges();
    expect(component.reduced()).toBe(true);
    expect(frames.size).toBe(0);
    component.move(1);
    expect(rail.scrollTo).toHaveBeenCalledWith({ left: 450, behavior: 'instant' });
  });
  it('does not duplicate or animate a group that fits', () => {
    const { fixture, component } = render(400);
    expect(component.overflow()).toBe(false);
    expect(frames.size).toBe(0);
    expect(fixture.nativeElement.querySelector('.copy')).toBeNull();
  });
  it('stops outside the viewport and in a hidden tab, and cleans up', () => {
    const { fixture } = render();
    visibility([{ isIntersecting: false }]);
    expect(frames.size).toBe(0);
    visibility([{ isIntersecting: true }]);
    expect(frames.size).toBe(1);
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(frames.size).toBe(0);
    hidden.mockRestore();
    fixture.destroy();
    expect(frames.size).toBe(0);
  });
});
