import {
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, of, Subject, switchMap, timer } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { SearchDiscoveryService } from '../../../core/services/search-discovery.service';
import { topSuggestions, type SearchEntry } from '../../../models/search-view';
import { ReleaseCover } from '../../../features/catalog/components/release-cover/release-cover';

@Component({
  selector: 'app-search-box',
  imports: [FormsModule, ReleaseCover],
  templateUrl: './search-box.html',
  styleUrl: './search-box.scss',
})
export class SearchBox {
  @Input() query = '';
  @Output() queryChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<void>();
  readonly auth = inject(AuthService);
  private readonly discovery = inject(SearchDiscoveryService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changes = new Subject<string>();
  readonly suggestions = signal<SearchEntry[]>([]);
  readonly expanded = signal(false);
  readonly loading = signal(false);
  readonly opening = signal(false);
  readonly message = signal('');
  readonly activeIndex = signal(-1);
  readonly pending = signal(false);

  constructor() {
    this.changes
      .pipe(
        // Cancela inmediatamente la consulta anterior, incluso durante la espera.
        switchMap((query) => {
          this.suggestions.set([]);
          this.activeIndex.set(-1);
          this.message.set('');
          this.pending.set(false);
          if (!this.auth.currentUser() || query.length < 2 || query.length > 255) return of(null);
          this.pending.set(true);
          return timer(250).pipe(
            switchMap(() => {
              this.loading.set(true);
              return this.discovery.search(query).pipe(
                catchError(() => {
                  this.message.set(
                    'No pudimos cargar las sugerencias. Podés intentar la búsqueda completa.',
                  );
                  return of(null);
                }),
                finalize(() => {
                  this.loading.set(false);
                  this.pending.set(false);
                }),
              );
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        if (!response) return;
        this.suggestions.set(topSuggestions(response.groups, this.query.trim()));
        if (response.warning) this.message.set(response.warning);
      });
  }

  updateQuery(value: string): void {
    this.query = value;
    this.queryChange.emit(value);
    this.expanded.set(value.trim().length >= 2);
    this.changes.next(value.trim());
  }

  focus(): void {
    if (this.query.trim().length < 2) return;
    this.expanded.set(true);
    this.changes.next(this.query.trim());
  }

  close(): void {
    this.expanded.set(false);
    this.changes.next('');
  }

  @HostListener('document:pointerdown', ['$event'])
  outsideClick(event: PointerEvent): void {
    if (event.target instanceof Node && !this.host.nativeElement.contains(event.target))
      this.close();
  }

  focusOut(event: FocusEvent): void {
    if (
      !(event.relatedTarget instanceof Node) ||
      !this.host.nativeElement.contains(event.relatedTarget)
    )
      this.close();
  }

  keydown(event: KeyboardEvent): void {
    if (event.isComposing) {
      if (event.key === 'Enter') event.preventDefault();
      return;
    }
    const count = this.suggestions().length;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    } else if (count && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      this.expanded.set(true);
      this.activeIndex.update((index) =>
        event.key === 'ArrowDown'
          ? (index + 1) % count
          : index < 0
            ? count - 1
            : (index - 1 + count) % count,
      );
    } else if (event.key === 'Enter' && this.expanded() && this.activeIndex() >= 0) {
      event.preventDefault();
      this.openResult(this.suggestions()[this.activeIndex()]);
    }
  }

  submitAll(): void {
    if (!this.query.trim() || this.opening()) return;
    this.close();
    this.search.emit();
  }

  openResult(entry: SearchEntry): void {
    if (this.opening()) return;
    this.close();
    this.opening.set(true);
    this.discovery
      .open(entry)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.opening.set(false)),
      )
      .subscribe({
        next: (url) => {
          void this.router.navigateByUrl(url);
        },
        error: () => {
          this.expanded.set(true);
          this.message.set('No pudimos abrir ese resultado. Podés intentar la búsqueda completa.');
        },
      });
  }
}
