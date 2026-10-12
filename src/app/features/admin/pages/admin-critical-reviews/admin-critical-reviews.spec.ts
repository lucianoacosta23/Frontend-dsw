import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ReviewReportsDialog } from '../../components/review-reports-dialog/review-reports-dialog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '../../../../../environments/environments';
import { AdminCriticalReviews } from './admin-critical-reviews';

describe.each([false, true])('Moderación (reportes menores: %s)', minorReports => {
  let component: AdminCriticalReviews;
  let http: HttpTestingController;
  const openDialog = vi.fn();
  const baseUrl = `${environment.apiBaseUrl}/admin/reports`;
  const listUrl = `${baseUrl}/${minorReports ? 'minor' : 'critical'}`;
  const review = {
    id: 7, author: { id: 1, username: 'autor' }, text: 'Reseña', rating: 4, reportCount: minorReports ? 2 : 3,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { minorReports } } } },
        { provide: MatDialog, useValue: { open: openDialog } },
      ],
    });
    component = TestBed.runInInjectionContext(() => new AdminCriticalReviews());
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
    openDialog.mockClear();
  });

  function loadReview() {
    component.ngOnInit();
    const request = http.expectOne(listUrl);
    expect(request.request.withCredentials).toBe(true);
    request.flush({ message: 'Listado', data: [review] });
  }

  it('abre el modal con la reseña seleccionada sin moderarla', () => {
    component.openReports(review);
    expect(openDialog).toHaveBeenCalledWith(ReviewReportsDialog, expect.objectContaining({ data: review }));
    http.expectNone(`${baseUrl}/7/reviewreport`);
  });

  it('distingue una carga fallida de un listado vacío y permite reintentar', () => {
    component.ngOnInit();
    http.expectOne(listUrl).flush({}, { status: 500, statusText: 'Error' });
    expect(component.loading()).toBe(false);
    expect(component.loadError()).not.toBe('');
    component.loadCriticalReviews();
    http.expectOne(listUrl).flush({ message: 'Listado', data: [] });
    expect(component.loadError()).toBe('');
    expect(component.criticalReviews()).toEqual([]);
  });

  it('evita decisiones duplicadas y retira la reseña solo al confirmar el servidor', () => {
    loadReview();
    component.dismissReports(7);
    component.deleteReview(7);
    expect(component.processingId()).toBe(7);
    expect(component.criticalReviews()).toEqual([review]);
    const request = http.expectOne(`${baseUrl}/7/reviewreport`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ decision: 'DISMISS' });
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-Jukeboxd-Request')).toBe('1');
    request.flush({ message: 'Reportes descartados', data: { reviewId: 7, affectedReports: 3 } });
    expect(component.criticalReviews()).toEqual([]);
    expect(component.processingId()).toBe(null);
    expect(component.successMessage()).toBe('Reportes descartados');
  });

  it('conserva la tarjeta si falla la baja y permite volver a intentarlo', () => {
    loadReview();
    component.deleteReview(7);
    const request = http.expectOne(`${baseUrl}/7/reviewreport`);
    expect(request.request.body).toEqual({ decision: 'REMOVE_REVIEW' });
    request.flush({ message: 'No se pudo guardar' }, { status: 500, statusText: 'Error' });
    expect(component.criticalReviews()).toEqual([review]);
    expect(component.actionError()).toBe('No se pudo guardar');
    expect(component.processingId()).toBe(null);
  });

  it('actualiza el listado cuando otro administrador ya resolvió los reportes', () => {
    loadReview();
    component.deleteReview(7);
    http.expectOne(`${baseUrl}/7/reviewreport`).flush(
      { message: 'Ya fue moderada' }, { status: 409, statusText: 'Conflict' },
    );
    http.expectOne(listUrl).flush({ message: 'Listado', data: [] });
    expect(component.criticalReviews()).toEqual([]);
    expect(component.actionError()).toBe('Ya fue moderada');
    expect(component.processingId()).toBe(null);
  });

  it('no envía la decisión si el administrador cancela', () => {
    loadReview();
    vi.mocked(window.confirm).mockReturnValue(false);
    component.deleteReview(7);
    http.expectNone(`${baseUrl}/7/reviewreport`);
    expect(component.criticalReviews()).toEqual([review]);
  });
});

