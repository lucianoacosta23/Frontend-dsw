import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Navbar } from './navbar';
import { AuthService } from '../../../core/services/auth.service';
import { SearchDiscoveryService } from '../../../core/services/search-discovery.service';

describe('Navbar search', () => {
  const currentUser = signal<{ id: number; username: string; category: string } | null>(null);

  beforeEach(() => {
    currentUser.set(null);
    TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser, logout: () => of({}) } },
        {
          provide: SearchDiscoveryService,
          useValue: { search: () => of({ groups: [], warning: null }) },
        },
      ],
    });
  });

  it('lets visitors type without navigating and preserves the submitted query through login', async () => {
    const fixture = TestBed.createComponent(Navbar);
    await fixture.whenStable();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="search"]');
    input.value = 'MF DOOM & friends';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(navigate).not.toHaveBeenCalled();
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/search?q=MF%20DOOM%20%26%20friends' },
    });
  });

  it('opens the search with a trimmed query for a signed-in user', () => {
    currentUser.set({ id: 1, username: 'listener', category: 'USER' });
    const fixture = TestBed.createComponent(Navbar);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance.query = '  Sade  ';
    fixture.componentInstance.submitSearch();
    const destination = navigate.mock.calls[0][0];
    expect(typeof destination === 'string' ? destination : router.serializeUrl(destination)).toBe(
      '/search?q=Sade',
    );
  });

  it('does not submit an empty or excessively long query', () => {
    const fixture = TestBed.createComponent(Navbar);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate');
    fixture.componentInstance.query = '   ';
    fixture.componentInstance.submitSearch();
    fixture.componentInstance.query = 'a'.repeat(256);
    fixture.componentInstance.submitSearch();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows the shared home identity and keeps account permissions', async () => {
    currentUser.set({ id: 1, username: 'admin', category: 'ADMIN' });
    const fixture = TestBed.createComponent(Navbar);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe(
      '/jukeboxd-logo.svg',
    );
    expect(fixture.nativeElement.querySelector('a[href="/admin"]')).not.toBeNull();
    currentUser.set({ id: 2, username: 'listener', category: 'USER' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[href="/admin"]')).toBeNull();
  });

  it('closes on outside clicks and Escape, but keeps the menu open when its background is clicked', async () => {
    currentUser.set({ id: 1, username: 'listener', category: 'USER' });
    const fixture = TestBed.createComponent(Navbar);
    await fixture.whenStable();
    const menu: HTMLDetailsElement = fixture.nativeElement.querySelector('details');
    menu.open = true;
    menu.querySelector('.dropdown')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(menu.open).toBe(true);
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(menu.open).toBe(false);
    menu.open = true;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(menu.open).toBe(false);
    expect(document.activeElement).toBe(menu.querySelector('summary'));
  });

  it('closes when a menu action is selected or keyboard focus leaves the menu', async () => {
    currentUser.set({ id: 1, username: 'listener', category: 'USER' });
    const fixture = TestBed.createComponent(Navbar);
    await fixture.whenStable();
    const menu: HTMLDetailsElement = fixture.nativeElement.querySelector('details');
    menu.open = true;
    const action = menu.querySelector('button')!;
    fixture.componentInstance.onDocumentClick({ target: action } as unknown as MouseEvent);
    expect(menu.open).toBe(false);
    menu.open = true;
    fixture.nativeElement.querySelector('input').focus();
    expect(menu.open).toBe(false);
  });
});
