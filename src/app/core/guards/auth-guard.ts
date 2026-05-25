// src/app/core/guards/auth.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject, PLATFORM_ID, Injector } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { IS_DISCOVERING_ROUTES } from '@angular/ssr';
import { AuthService } from '../services/auth';
import { STORAGE_KEY } from '../shared/constants';
import { REQUEST } from '@angular/core';

export const authGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);
  const authService = inject(AuthService);
  const injector = inject(Injector);

  // ✅ Skip during build-time route extraction
  const isDiscovering = injector.get(IS_DISCOVERING_ROUTES, false, { optional: true });
  if (isDiscovering) return true;

  if (isPlatformBrowser(platformId)) {
    return authService.isLoggedIn()
      ? true
      : router.createUrlTree(['/login']);
  }

  // ✅ Server — read cookie from REQUEST
  const request = injector.get(REQUEST, null, { optional: true });
  const cookieHeader = request?.headers?.get('cookie') ?? '';
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${STORAGE_KEY}=([^;]+)`)
  );
  const hasToken = !!match?.[1];
  console.log('[GUARD SSR] hasToken:', hasToken);

  return hasToken ? true : router.createUrlTree(['/login']);
};