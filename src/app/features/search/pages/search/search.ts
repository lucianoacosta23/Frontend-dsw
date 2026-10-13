import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, type Subscription } from 'rxjs';
import { SearchDiscoveryService } from '../../../../core/services/search-discovery.service';
import type { SearchType } from '../../../../models/search';
import {
  searchCategories,
  type SearchEntry,
  type SearchGroup,
} from '../../../../models/search-view';
import { Navbar } from '../../../../shared/components/navbar/navbar';
import { SearchResult } from '../../components/search-result/search-result';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [Navbar, SearchResult],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class Search implements OnInit {
  private readonly discovery = inject(SearchDiscoveryService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;

  query = '';
  readonly filters = searchCategories;
  readonly selectedTypes = signal<SearchType[]>([]);
  readonly groups = signal<SearchGroup[]>([]);
  readonly visibleGroups = computed(() => this.groups().filter((group) => group.entries.length));
  readonly totalResults = computed(() =>
    this.groups().reduce((total, group) => total + group.entries.length, 0),
  );
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly warning = signal<string | null>(null);
  readonly hasSearched = signal(false);
  readonly openingKey = signal<string | null>(null);
  readonly openError = signal('');

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.query = params.get('q') ?? '';
      if (params.has('q')) this.search();
      else {
        this.request?.unsubscribe();
        this.groups.set([]);
        this.hasSearched.set(false);
        this.errorMessage.set('');
        this.warning.set(null);
      }
    });
  }

  isSelected(type: SearchType): boolean {
    return this.selectedTypes().includes(type);
  }

  toggleFilter(type: SearchType): void {
    this.selectedTypes.update((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    );
    if (this.hasSearched()) this.search();
  }

  selectAll(): void {
    this.selectedTypes.set([]);
    if (this.hasSearched()) this.search();
  }

  search(): void {
    this.request?.unsubscribe();
    this.groups.set([]);
    this.errorMessage.set('');
    this.warning.set(null);
    this.openError.set('');
    this.loading.set(false);
    const query = this.query.trim();
    if (!query || query.length > 255) {
      this.hasSearched.set(false);
      this.errorMessage.set('Escribí entre 1 y 255 caracteres para buscar.');
      return;
    }
    this.loading.set(true);
    this.hasSearched.set(true);
    this.request = this.discovery
      .search(query, this.selectedTypes())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.groups.set(response.groups);
          this.warning.set(response.warning);
        },
        error: (error: unknown) =>
          this.errorMessage.set(
            error instanceof HttpErrorResponse && error.status === 401
              ? 'Tu sesión venció. Iniciá sesión nuevamente.'
              : 'No pudimos completar la búsqueda. Intentá nuevamente.',
          ),
      });
  }

  openResult(entry: SearchEntry): void {
    if (this.openingKey() !== null) return;
    this.openError.set('');
    this.openingKey.set(entry.key);
    this.discovery
      .open(entry)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.openingKey.set(null)),
      )
      .subscribe({
        next: (url) => {
          void this.router.navigateByUrl(url);
        },
        error: (error: unknown) => {
          const body: unknown = error instanceof HttpErrorResponse ? error.error : null;
          this.openError.set(
            body &&
              typeof body === 'object' &&
              'message' in body &&
              typeof body.message === 'string'
              ? body.message
              : 'No pudimos abrir este resultado. Intentá nuevamente.',
          );
        },
      });
  }
}
