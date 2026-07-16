import { HttpEvent, HttpHandlerFn, HttpParams, HttpRequest, HttpResponse } from '@angular/common/http';
import { PLATFORM_ID, REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CsrfService } from '../services/csrf';
import { apiInterceptor } from './api-interceptor';

type CapturedNext = {
  handler: HttpHandlerFn;
  requests: HttpRequest<unknown>[];
};

const createNext = (): CapturedNext => {
  const requests: HttpRequest<unknown>[] = [];
  return {
    requests,
    handler: (request) => {
      requests.push(request);
      return of(new HttpResponse({ status: 200, body: { success: true } })) as Observable<HttpEvent<unknown>>;
    },
  };
};

const executeInterceptor = async (request: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const response = TestBed.runInInjectionContext(() => apiInterceptor(request, next));
  await firstValueFrom(response);
};

const setup = ({
  platformId = 'browser',
  csrfToken = 'csrf-token-123',
  cookie,
}: {
  platformId?: 'browser' | 'server';
  csrfToken?: string;
  cookie?: string;
} = {}) => {
  const csrf = {
    getToken: vi.fn().mockResolvedValue(csrfToken),
  };
  const serverRequest = cookie
    ? { headers: { get: vi.fn((header: string) => header.toLowerCase() === 'cookie' ? cookie : null) } }
    : null;

  TestBed.configureTestingModule({
    providers: [
      { provide: PLATFORM_ID, useValue: platformId },
      { provide: CsrfService, useValue: csrf },
      { provide: REQUEST, useValue: serverRequest },
    ],
  });

  return { csrf, serverRequest };
};

describe('apiInterceptor', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('adds service worker bypass, credentials, and no CSRF token for safe browser requests', async () => {
    const { csrf } = setup();
    const next = createNext();

    await executeInterceptor(new HttpRequest('GET', '/api/v1/expenses'), next.handler);

    expect(next.requests).toHaveLength(1);
    expect(next.requests[0].withCredentials).toBe(true);
    expect(next.requests[0].headers.get('ngsw-bypass')).toBe('true');
    expect(next.requests[0].headers.has('X-CSRF-Token')).toBe(false);
    expect(next.requests[0].params.get('ngsw-bypass')).toBe('true');
    expect(csrf.getToken).not.toHaveBeenCalled();
  });

  it('preserves an existing ngsw-bypass query param', async () => {
    setup();
    const next = createNext();
    const request = new HttpRequest('GET', '/api/v1/expenses', {
      params: new HttpParams().set('ngsw-bypass', 'manual'),
    });

    await executeInterceptor(request, next.handler);

    expect(next.requests[0].params.get('ngsw-bypass')).toBe('manual');
    expect(next.requests[0].urlWithParams).toContain('ngsw-bypass=manual');
  });

  it('attaches a CSRF token for unsafe browser requests', async () => {
    const { csrf } = setup({ csrfToken: 'fresh-csrf-token' });
    const next = createNext();

    await executeInterceptor(new HttpRequest('POST', '/api/v1/expenses', { amount: 100 }), next.handler);

    expect(csrf.getToken).toHaveBeenCalledOnce();
    expect(next.requests[0].withCredentials).toBe(true);
    expect(next.requests[0].headers.get('X-CSRF-Token')).toBe('fresh-csrf-token');
    expect(next.requests[0].headers.get('ngsw-bypass')).toBe('true');
  });

  it('treats unsafe methods case-insensitively when deciding CSRF behavior', async () => {
    const { csrf } = setup({ csrfToken: 'case-token' });
    const next = createNext();

    await executeInterceptor(new HttpRequest('patch', '/api/v1/users/me', { name: 'Manish' }), next.handler);

    expect(csrf.getToken).toHaveBeenCalledOnce();
    expect(next.requests[0].headers.get('X-CSRF-Token')).toBe('case-token');
  });

  it('does not attach CSRF for exempt auth endpoints', async () => {
    const { csrf } = setup();
    const next = createNext();

    await executeInterceptor(new HttpRequest('POST', '/api/v1/auth/otp/request', { identifier: 'test@example.com' }), next.handler);

    expect(csrf.getToken).not.toHaveBeenCalled();
    expect(next.requests[0].headers.has('X-CSRF-Token')).toBe(false);
    expect(next.requests[0].withCredentials).toBe(true);
  });

  it('forwards cookies during SSR and does not request CSRF tokens on the server', async () => {
    const { csrf, serverRequest } = setup({
      platformId: 'server',
      cookie: 'access_token=abc; csrf_token=def',
    });
    const next = createNext();

    await executeInterceptor(new HttpRequest('POST', '/api/v1/expenses', { amount: 100 }), next.handler);

    expect(serverRequest?.headers.get).toHaveBeenCalledWith('cookie');
    expect(csrf.getToken).not.toHaveBeenCalled();
    expect(next.requests[0].headers.get('Cookie')).toBe('access_token=abc; csrf_token=def');
    expect(next.requests[0].headers.has('X-CSRF-Token')).toBe(false);
    expect(next.requests[0].withCredentials).toBe(true);
  });
});
