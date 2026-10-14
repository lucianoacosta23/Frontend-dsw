import { DatePipe, DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, Injector, OnInit, afterNextRender, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { Subscription, finalize } from 'rxjs';
import { AdminUsersService } from '../../../../core/services/admin-users.service.js';
import { AuthService } from '../../../../core/services/auth.service.js';
import type { AccountAction, AccountStatus, AdminUser, AdminUserDetail, SanctionEntry, UserActionRequest } from '../../../../models/admin-users.js';
import { Navbar } from '../../../../shared/components/navbar/navbar.js';
import { ReviewReportsDialog } from '../../components/review-reports-dialog/review-reports-dialog.js';

@Component({
  selector: 'app-admin-users', standalone: true,
  imports: [Navbar, RouterLink, DatePipe],
  templateUrl: './admin-users.html', styleUrl: './admin-users.scss',
})
export class AdminUsers implements OnInit {
  private readonly service = inject(AdminUsersService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  readonly auth = inject(AuthService);
  private listRequest?: Subscription;
  private detailRequest?: Subscription;
  private historyRequest?: Subscription;
  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly query = signal('');
  readonly page = signal(1);
  readonly pages = signal(0);
  readonly total = signal(0);
  readonly detail = signal<AdminUserDetail | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal('');
  readonly selectedId = signal<number | null>(null);
  readonly selectedName = signal('');
  readonly history = signal<SanctionEntry[]>([]);
  readonly historyLoading = signal(false);
  readonly historyError = signal('');
  readonly historyPage = signal(0);
  readonly historyPages = signal(0);
  readonly action = signal<AccountAction | null>(null);
  readonly reason = signal('');
  readonly submitting = signal(false);
  readonly actionError = signal('');
  readonly success = signal('');
  readonly timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  ngOnInit(): void { this.load(1); }

  load(page = this.page()): void {
    if (this.submitting()) return;
    this.listRequest?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.users.set([]);
    this.listRequest = this.service.list(this.query(), page)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({ next: response => {
        this.users.set(response.data); this.page.set(response.pagination.page);
        this.pages.set(response.pagination.totalPages); this.total.set(response.pagination.total);
      }, error: (error: unknown) => this.error.set(this.message(error, 'No pudimos cargar los usuarios.')) });
  }
  search(value: string): void { this.query.set(value.trim()); this.load(1); }
  clearSearch(): void { this.query.set(''); this.load(1); }

  openUser(user: Pick<AdminUser, 'id' | 'username'>): void {
    if (this.submitting()) return;
    this.detailRequest?.unsubscribe(); this.historyRequest?.unsubscribe();
    this.selectedId.set(user.id); this.selectedName.set(user.username);
    this.detail.set(null); this.detailError.set(''); this.action.set(null);
    this.actionError.set(''); this.success.set('');
    this.history.set([]); this.historyPage.set(0); this.historyPages.set(0);
    this.detailLoading.set(true);
    afterNextRender(() => {
      const panel = this.document.getElementById('account-detail');
      panel?.scrollIntoView({ block: 'start' });
      panel?.focus({ preventScroll: true });
    }, { injector: this.injector });
    this.detailRequest = this.service.detail(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.detailLoading.set(false)))
      .subscribe({ next: response => { this.detail.set(response.data); this.loadHistory(1); },
        error: (error: unknown) => this.detailError.set(this.message(error, 'No pudimos cargar el detalle.')) });
  }
  retryDetail(): void {
    const id = this.selectedId();
    if (id !== null) this.openUser({ id, username: this.selectedName() });
  }
  closeDetail(): void {
    if (this.submitting()) return;
    this.detailRequest?.unsubscribe(); this.historyRequest?.unsubscribe();
    this.selectedId.set(null); this.detail.set(null); this.action.set(null);
  }
  loadHistory(page: number): void {
    const id = this.selectedId();
    if (id === null || this.historyLoading()) return;
    this.historyLoading.set(true); this.historyError.set('');
    this.historyRequest = this.service.history(id, page)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.historyLoading.set(false)))
      .subscribe({ next: response => {
        this.history.update(current => page === 1 ? response.data : [...current, ...response.data.filter(entry => !current.some(item => item.id === entry.id))]);
        this.historyPage.set(response.pagination.page); this.historyPages.set(response.pagination.totalPages);
      }, error: (error: unknown) => this.historyError.set(this.message(error, 'No pudimos cargar el historial.')) });
  }
  openReports(user: AdminUser): void {
    this.dialog.open(ReviewReportsDialog, {
      data: { kind: 'user', userId: user.id, username: user.username },
      width: '760px', maxWidth: '95vw', maxHeight: '90vh', ariaLabel: `Reportes de las reseñas de ${user.username}`,
    });
  }
  choose(action: AccountAction): void {
    if (this.submitting()) return;
    this.action.set(action);
    this.reason.set('');
    this.actionError.set('');
    this.success.set('');
  }
  cancelAction(): void { if (!this.submitting()) this.action.set(null); }
  submitAction(): void {
    const user = this.detail(); const action = this.action();
    if (!user || !action || this.submitting()) return;
    const reason = this.reason().trim();
    if (!reason || Array.from(reason).length > 500 || reason.includes('\0')) {
      this.actionError.set('Ingresá un motivo de entre 1 y 500 caracteres.'); return;
    }

    const input: UserActionRequest = { action, reason };

    this.submitting.set(true);
    this.actionError.set('');
    this.success.set('');
    this.service.apply(user.id, input)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.submitting.set(false)))
      .subscribe({ next: response => {
        this.detail.set(response.data); this.action.set(null); this.success.set(response.message);
        this.historyRequest?.unsubscribe(); this.loadHistory(1);
        this.submitting.set(false); this.load(1);
      }, error: (error: unknown) => {
        this.actionError.set(this.message(error, 'No se pudo aplicar la acción.'));
      } });
  }
  statusLabel(status: AccountStatus): string {
    return { ENABLED: 'Habilitado', SUSPENDED: 'Suspendido', BANNED: 'Baneado' }[status];
  }
  actionLabel(action: AccountAction): string {
    return { SUSPEND: 'Suspender', BAN: 'Banear', REACTIVATE: 'Reactivar' }[action];
  }
  private message(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'No pudimos conectar con el backend.';
      if (error.status === 401) return 'Tu sesión venció. Volvé a iniciar sesión.';
      if (error.status === 403) return 'No tenés permiso para gestionar usuarios.';
      if (error.status === 404 || error.status === 501) return `${fallback} El usuario o el endpoint solicitado no está disponible.`;
      if (typeof error.error?.message === 'string') return error.error.message;
    }
    return fallback;
  }
}
