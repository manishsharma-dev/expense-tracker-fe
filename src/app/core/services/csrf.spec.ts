import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Config } from './config';
import { CsrfService } from './csrf';

describe('CsrfService', () => {
  let service: CsrfService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        Config,
        CsrfService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    TestBed.inject(Config).setApiBaseUrl('/api/v1');
    service = TestBed.inject(CsrfService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('returns a manually set token without calling the API', async () => {
    service.setToken('manual-token');

    await expect(service.getToken()).resolves.toBe('manual-token');
  });

  it('clears a manually set token', async () => {
    service.setToken('manual-token');
    service.clearToken();

    const tokenPromise = service.getToken();
    const req = httpMock.expectOne('/api/v1/auth/csrf-token');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ success: true, data: { csrfToken: 'fresh-token' } });

    await expect(tokenPromise).resolves.toBe('fresh-token');
  });

  it('fetches and caches a CSRF token', async () => {
    const tokenPromise = service.getToken();

    const req = httpMock.expectOne('/api/v1/auth/csrf-token');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ success: true, data: { csrfToken: 'server-token' } });

    await expect(tokenPromise).resolves.toBe('server-token');
    await expect(service.getToken()).resolves.toBe('server-token');
  });

  it('shares one pending token request across concurrent callers', async () => {
    const first = service.getToken();
    const second = service.getToken();

    const req = httpMock.expectOne('/api/v1/auth/csrf-token');
    req.flush({ success: true, data: { csrfToken: 'shared-token' } });

    await expect(first).resolves.toBe('shared-token');
    await expect(second).resolves.toBe('shared-token');
  });
});
