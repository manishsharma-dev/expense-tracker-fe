// src/app/core/interceptors/api.interceptor.ts
import { isPlatformServer } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector, PLATFORM_ID, REQUEST } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { CsrfService } from '../services/csrf';

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const csrfExemptPaths = [
  '/auth/register',
  '/auth/otp/request',
  '/auth/otp/verify',
  '/auth/csrf-token',
];

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const injector = inject(Injector);
  const csrf = inject(CsrfService);
  const headers: Record<string, string> = {
    'ngsw-bypass': 'true',
  };

  if (isPlatformServer(platformId)) {
    const request = injector.get(REQUEST, null, { optional: true });
    const cookieHeader = request?.headers?.get('cookie');
    if (cookieHeader) headers['Cookie'] = cookieHeader;
  }

  const shouldAttachCsrfToken = !isPlatformServer(platformId)
    && unsafeMethods.has(req.method.toUpperCase())
    && !csrfExemptPaths.some((path) => req.url.includes(path));

  if (!shouldAttachCsrfToken) {
    return next(req.clone({
      withCredentials: true,
      setHeaders: headers,
    }));
  }

  return from(csrf.getToken()).pipe(
    switchMap((token) => next(req.clone({
      withCredentials: true,
      setHeaders: {
        ...headers,
        'X-CSRF-Token': token,
      },
    })))
  );
};
