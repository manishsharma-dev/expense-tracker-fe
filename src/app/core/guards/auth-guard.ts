// src/app/core/guards/auth.guard.ts
import { inject, Injector } from '@angular/core';
import { IS_DISCOVERING_ROUTES } from '@angular/ssr';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService as AuthApiService } from '../services/apis/auth.service';
import { AuthService as AuthStateService } from '../services/auth';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const injector = inject(Injector);
  const authApiService = inject(AuthApiService);
  const authStateService = inject(AuthStateService);

  const isDiscovering = injector.get(IS_DISCOVERING_ROUTES, false, { optional: true });
  if (isDiscovering) return true;

  return authApiService.me().pipe(
    map((response) => {
      authStateService.setUser(response.data.user);
      return true;
    }),
    catchError(() => {
      authStateService.logout();
      return of(router.createUrlTree(['/auth/login']));
    })
  );
};
