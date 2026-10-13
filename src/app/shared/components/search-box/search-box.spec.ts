import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchBox } from './search-box';
import { AuthService } from '../../../core/services/auth.service';
import {
  SearchDiscoveryService,
  type SearchDiscovery,
} from '../../../core/services/search-discovery.service';
import type { SearchEntry } from '../../../models/search-view';

const entry: SearchEntry = {
  key: 'artist:1',
  type: 'artists',
  name: 'Sade',
  subtitle: 'Artista',
  label: 'Artista',
  imageUrl: null,
  target: { source: 'local', url: '/artists/1' },
};
const response: SearchDiscovery = {
  groups: [{ type: 'artists', title: 'Artistas', entries: [entry] }],
  warning: null,
};

describe('Search suggestions', () => {
  const auth = { currentUser: signal<{ id: number } | null>({ id: 1 }) };
  const discovery = { search: vi.fn(), open: vi.fn() };
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    auth.currentUser.set({ id: 1 });
    discovery.search.mockReturnValue(of(response));
    discovery.open.mockReturnValue(of('/artists/1'));
    TestBed.configureTestingModule({
      imports: [SearchBox],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: SearchDiscoveryService, useValue: discovery },
      ],
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function render() {
    const fixture = TestBed.createComponent(SearchBox);
    fixture.detectChanges();
    return fixture;
  }
  it('waits for two characters and a typing pause without importing results', () => {
    const fixture = render();
    fixture.componentInstance.updateQuery('s');
    vi.advanceTimersByTime(300);
    expect(discovery.search).not.toHaveBeenCalled();
    fixture.componentInstance.updateQuery('sa');
    vi.advanceTimersByTime(249);
    expect(discovery.search).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(discovery.search).toHaveBeenCalledWith('sa');
    expect(fixture.componentInstance.suggestions()).toEqual([entry]);
    expect(discovery.open).not.toHaveBeenCalled();
  });
  it('cancels an in-flight request immediately on new input and ignores stale results', () => {
    const pending = new Subject<SearchDiscovery>();
    discovery.search.mockReturnValueOnce(pending);
    const fixture = render();
    fixture.componentInstance.updateQuery('sa');
    vi.advanceTimersByTime(250);
    expect(pending.observed).toBe(true);
    fixture.componentInstance.updateQuery('sade');
    expect(pending.observed).toBe(false);
    expect(fixture.componentInstance.suggestions()).toEqual([]);
    pending.next(response);
    expect(fixture.componentInstance.suggestions()).toEqual([]);
    fixture.destroy();
    vi.advanceTimersByTime(250);
    expect(discovery.search).toHaveBeenCalledTimes(1);
  });
  it('keeps Enter as full search until an option is explicitly selected with an arrow', () => {
    const fixture = render();
    const search = vi.spyOn(fixture.componentInstance.search, 'emit');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance.updateQuery('Sade');
    vi.advanceTimersByTime(250);
    expect(fixture.componentInstance.activeIndex()).toBe(-1);
    fixture.componentInstance.submitAll();
    expect(search).toHaveBeenCalledTimes(1);
    expect(discovery.open).not.toHaveBeenCalled();
    fixture.componentInstance.focus();
    vi.advanceTimersByTime(250);
    fixture.componentInstance.keydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input').getAttribute('aria-activedescendant')).toBe(
      'nav-option-0',
    );
    fixture.componentInstance.keydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(discovery.open).toHaveBeenCalledWith(entry);
    expect(navigate).toHaveBeenCalledWith('/artists/1');
  });
  it('supports selecting an option with the mouse and closing with Escape or blur', () => {
    const fixture = render();
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance.updateQuery('Sade');
    vi.advanceTimersByTime(250);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[role="option"]').click();
    expect(discovery.open).toHaveBeenCalledWith(entry);
    fixture.componentInstance.focus();
    fixture.componentInstance.keydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(fixture.componentInstance.expanded()).toBe(false);
    expect(fixture.componentInstance.query).toBe('Sade');
    fixture.componentInstance.focus();
    fixture.componentInstance.focusOut(new FocusEvent('focusout'));
    expect(fixture.componentInstance.expanded()).toBe(false);
  });
  it('does not query protected APIs as a visitor and preserves their input', () => {
    auth.currentUser.set(null);
    const fixture = render();
    fixture.componentInstance.updateQuery('Sade');
    vi.advanceTimersByTime(300);
    fixture.detectChanges();
    expect(discovery.search).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Iniciá sesión');
    expect(fixture.componentInstance.query).toBe('Sade');
  });
  it('reports suggestion failures and still permits full search', () => {
    discovery.search.mockReturnValue(throwError(() => new Error('offline')));
    const fixture = render();
    fixture.componentInstance.updateQuery('Sade');
    vi.advanceTimersByTime(250);
    expect(fixture.componentInstance.message()).toContain('búsqueda completa');
    expect(fixture.componentInstance.loading()).toBe(false);
    const submit = vi.spyOn(fixture.componentInstance.search, 'emit');
    fixture.componentInstance.submitAll();
    expect(submit).toHaveBeenCalled();
  });
});
