// src/app/core/interceptors/api.interceptor.ts
import { isPlatformServer } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector, PLATFORM_ID, REQUEST } from '@angular/core';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const injector = inject(Injector);
  const headers: Record<string, string> = {};

  if (isPlatformServer(platformId)) {
    const request = injector.get(REQUEST, null, { optional: true });
    const cookieHeader = request?.headers?.get('cookie');
    if (cookieHeader) headers['Cookie'] = cookieHeader;
  }

  return next(req.clone({
    withCredentials: true,
    setHeaders: headers,
  }));
};
