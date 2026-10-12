import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../../environments/environments';
import { ReviewReportsDialog } from './review-reports-dialog';

describe('Reportes de una reseña', () => {
  let component: ReviewReportsDialog;
  let http: HttpTestingController;
  const url = `${environment.apiBaseUrl}/admin/reports/7/reviewreport`;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: MAT_DIALOG_DATA, useValue: { id: 7, author: { id: 1, username: 'autor' }, rating: 4, text: 'Reseña', reportCount: 2 } },
    ] });
    component = TestBed.runInInjectionContext(() => new ReviewReportsDialog());
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('carga únicamente los reportes de la reseña seleccionada con la sesión', () => {
    component.ngOnInit();
    expect(component.loading()).toBe(true);
    const request = http.expectOne(url);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    const reports = [{ id: 12, reason: 'SPAM', details: null, status: 'PENDING', createdAt: '2026-10-09T12:00:00Z', reporter: { id: 2, username: 'reportante' } }];
    request.flush({ message: 'Reportes', data: reports });
    expect(component.reports()).toEqual(reports);
    expect(component.loading()).toBe(false);
  });

  it('muestra el error y permite reintentar con un listado vacío', () => {
    component.ngOnInit();
    http.expectOne(url).flush({}, { status: 500, statusText: 'Error' });
    expect(component.error()).not.toBe('');
    expect(component.loading()).toBe(false);
    component.loadReports();
    http.expectOne(url).flush({ message: 'Reportes', data: [] });
    expect(component.error()).toBe('');
    expect(component.reports()).toEqual([]);
  });
});
