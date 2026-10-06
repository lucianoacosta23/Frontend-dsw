import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ReleaseCover } from './release-cover';

describe('ReleaseCover', () => {
  it('provides an accessible fallback for an absent cover', () => {
    const fixture = TestBed.createComponent(ReleaseCover);
    fixture.componentRef.setInput('alt', 'Album');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[role="img"]').getAttribute('aria-label'),
    ).toContain('Album — portada no disponible');
  });

  it('replaces a broken image and retries when the source changes', () => {
    const fixture = TestBed.createComponent(ReleaseCover);
    fixture.componentRef.setInput('src', '/broken-cover.jpg');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('img').dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    fixture.componentRef.setInput('src', '/another-cover.jpg');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe(
      '/another-cover.jpg',
    );
  });
});
