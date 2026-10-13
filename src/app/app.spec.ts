import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';
import { AuthService } from './core/services/auth.service';

@Component({ template: '<main>Página de prueba</main>' })
class TestPage {}

describe('App shared footer', () => {
  const currentUser = signal<{ id: number } | null>(null);
  beforeEach(() => {
    currentUser.set(null);
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([{ path: 'first', component: TestPage }, { path: 'second', component: TestPage }]),
        { provide: AuthService, useValue: { currentUser } },
      ],
    });
  });

  it('creates the application', () => {
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });

  it('keeps a single footer with the same logo across route changes', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/first');
    await fixture.whenStable();
    const footer = fixture.nativeElement.querySelector('app-footer');
    expect(footer.querySelector('img').getAttribute('src')).toBe('/jukeboxd-logo.svg');
    await router.navigateByUrl('/second');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('app-footer')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('app-footer')).toBe(footer);
  });

  it('keeps the brand destination consistent with the session', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.footer-brand').getAttribute('href')).toBe('/');
    currentUser.set({ id: 1 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.footer-brand').getAttribute('href')).toBe('/dashboard');
  });
});
