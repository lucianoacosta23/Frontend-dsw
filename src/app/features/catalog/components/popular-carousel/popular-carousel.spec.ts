import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
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
      Array.from({ length: 10 }, (_, i) => ({
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
    component.hover(true);
    rail.scrollLeft = 1200 + gap - 0.4;
    component.hover(false);
    step(300);
    step(350);
    expect(rail.scrollLeft).toBeCloseTo(0.5);
  });
  it.each([false, true])('provides two equivalent, accessible lists with directNavigation=%s', (directNavigation) => {
    const { fixture } = render();
    fixture.componentRef.setInput('directNavigation', directNavigation);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const groups = element.querySelectorAll<HTMLElement>('.group');
    expect(groups).toHaveLength(2);
    const cards = [...groups].map(group => {
      expect(group.getAttribute('role')).toBe('list');
      expect(group.getAttribute('aria-hidden')).not.toBe('true');
      expect(group.hasAttribute('inert')).toBe(false);
      expect(group.querySelectorAll('[role="listitem"]')).toHaveLength(10);
      const links = group.querySelectorAll<HTMLAnchorElement>('a.card');
      expect(links).toHaveLength(10);
      return [...links].map(link => ({
        href: link.getAttribute('href'),
        label: link.getAttribute('aria-label'),
        text: link.textContent,
        rank: link.querySelector('.rank')?.textContent,
      }));
    });
    expect(cards[1]).toEqual(cards[0]);
    expect(cards[0][0].href).toBe(directNavigation ? '/releases/1' : '/login?returnUrl=%2Freleases%2F1');
    expect(cards[0][9].rank).toContain('#10');
    expect(element.querySelectorAll('.cover-frame.interactive')).toHaveLength(20);
    expect(element.querySelectorAll('a a, a button, button')).toHaveLength(0);
  });
  it.each([false, true])('navigates from either set with directNavigation=%s', (directNavigation) => {
    const { fixture } = render();
    fixture.componentRef.setInput('directNavigation', directNavigation);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const element: HTMLElement = fixture.nativeElement;
    for (const group of element.querySelectorAll('.group')) {
      const link = group.querySelector<HTMLAnchorElement>('a.card');
      expect(link).not.toBeNull();
      link?.click();
    }
    expect(navigate).toHaveBeenCalledTimes(2);
    for (const [target] of navigate.mock.calls) {
      const url = typeof target === 'string' ? target : router.serializeUrl(target);
      expect(url).toBe(directNavigation ? '/releases/1' : '/login?returnUrl=%2Freleases%2F1');
    }
  });
  it('pauses on hover and keyboard focus, then resumes', () => {
    const { component, rail, fixture } = render();
    component.hover(true);
    expect(frames.size).toBe(0);
    component.hover(false);
    expect(frames.size).toBe(1);
    component.focus();
    expect(frames.size).toBe(0);
    const copyLink = fixture.nativeElement.querySelector('.copy a.card');
    expect(copyLink).not.toBeNull();
    fixture.nativeElement
      .querySelector('.carousel')
      .dispatchEvent(new FocusEvent('focusout', { relatedTarget: copyLink, bubbles: true }));
    fixture.detectChanges();
    expect(frames.size).toBe(0);
    fixture.nativeElement
      .querySelector('.carousel')
      .dispatchEvent(new FocusEvent('focusout', { relatedTarget: null, bubbles: true }));
    fixture.detectChanges();
    expect(frames.size).toBe(1);
  });
  it('disables automatic motion when reduced motion is requested', () => {
    const { component, rail, fixture } = render();
    motion({ matches: true });
    fixture.detectChanges();
    expect(component.reduced()).toBe(true);
    expect(frames.size).toBe(0);
    component.hover(true);
    component.hover(false);
    expect(frames.size).toBe(0);
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
