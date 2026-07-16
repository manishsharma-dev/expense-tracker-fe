import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { ApiService } from './api';
import { Config } from './config';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  let config: Config;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ApiService,
        Config,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
    config = TestBed.inject(Config);
    config.setApiBaseUrl('/api/v1');
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sends GET requests with query params', () => {
    service.get('expenses', { page: '1', search: 'rent' }).subscribe();

    const req = httpMock.expectOne('/api/v1/expenses?page=1&search=rent');
    expect(req.request.method).toBe('GET');
    req.flush({ success: true });
  });

  it('sends POST requests with body', () => {
    const body = { name: 'Food' };

    service.post('categories', body).subscribe();

    const req = httpMock.expectOne('/api/v1/categories');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ success: true });
  });

  it('sends PUT, PATCH, and DELETE requests to configured base url', () => {
    service.put('expenses/1', { amount: 100 }).subscribe();
    service.patch('users/me', { name: 'Manish' }).subscribe();
    service.delete('expenses/1').subscribe();

    const expenseRequests = httpMock.match('/api/v1/expenses/1');
    expect(expenseRequests).toHaveLength(2);
    expect(expenseRequests[0].request.method).toBe('PUT');
    expect(expenseRequests[1].request.method).toBe('DELETE');
    expect(httpMock.expectOne('/api/v1/users/me').request.method).toBe('PATCH');
    expenseRequests.forEach((req) => req.flush({ success: true }));
    httpMock.match('/api/v1/users/me').forEach((req) => req.flush({ success: true }));
  });

  it('gets external URLs without applying the API base URL', () => {
    service.getExternal('https://example.com/file.png').subscribe();

    const req = httpMock.expectOne('https://example.com/file.png');
    expect(req.request.method).toBe('GET');
    req.flush({ ok: true });
  });
});
