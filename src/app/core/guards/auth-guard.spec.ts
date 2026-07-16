import { TestBed } from '@angular/core/testing';
import { IS_DISCOVERING_ROUTES } from '@angular/ssr';
import { CanActivateFn, Router, UrlTree, provideRouter } from '@angular/router';
import { Observable, firstValueFrom, isObservable, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CommonResponse } from '../shared/types/common.model';
import { UserProfile } from '../shared/types/auth.model';
import { AuthService as AuthApiService } from '../services/apis/auth.service';
import { AuthService as AuthStateService } from '../services/auth';
import { authGuard } from './auth-guard';

const user: UserProfile = {
  _id: 'user-1',
  name: 'Manish Sharma',
  email: 'manish@example.com',
  profileComplete: true,
};

type GuardResult = boolean | UrlTree;

const executeGuard: CanActivateFn = (...guardParameters) =>
  TestBed.runInInjectionContext(() => authGuard(...guardParameters));

const resolveGuardResult = async (): Promise<GuardResult> => {
  const result = executeGuard({} as never, {} as never);
  return isObservable(result)
    ? firstValueFrom(result as Observable<GuardResult>)
    : result as GuardResult;
};

const setup = ({
  isDiscoveringRoutes,
  meResponse = of({ success: true, data: { user } } as CommonResponse<{ user: UserProfile }>),
}: { isDiscoveringRoutes?: boolean; meResponse?: Observable<CommonResponse<{ user: UserProfile }>> } = {}) => {
  const authApi = {
    me: vi.fn(() => meResponse),
  };
  const authState = {
    setUser: vi.fn(),
    logout: vi.fn(),
  };
  const discoveryProvider = typeof isDiscoveringRoutes === 'boolean'
    ? [{ provide: IS_DISCOVERING_ROUTES, useValue: isDiscoveringRoutes }]
    : [];

  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthApiService, useValue: authApi },
      { provide: AuthStateService, useValue: authState },
      ...discoveryProvider,
    ],
  });

  return {
    authApi,
    authState,
    router: TestBed.inject(Router),
  };
};

describe('authGuard', () => {
  it('allows route discovery without calling the auth API', async () => {
    const { authApi, authState } = setup({ isDiscoveringRoutes: true });

    const result = await resolveGuardResult();

    expect(result).toBe(true);
    expect(authApi.me).not.toHaveBeenCalled();
    expect(authState.setUser).not.toHaveBeenCalled();
    expect(authState.logout).not.toHaveBeenCalled();
  });

  it('allows navigation when /auth/me returns a user', async () => {
    const { authApi, authState } = setup();

    const result = await resolveGuardResult();

    expect(result).toBe(true);
    expect(authApi.me).toHaveBeenCalledTimes(1);
    expect(authState.setUser).toHaveBeenCalledOnce();
    expect(authState.setUser).toHaveBeenCalledWith(user);
    expect(authState.logout).not.toHaveBeenCalled();
  });

  it('stores null when /auth/me succeeds without a user payload', async () => {
    const { authState } = setup({
      meResponse: of({ success: true, data: {} } as CommonResponse<{ user: UserProfile }>),
    });

    const result = await resolveGuardResult();

    expect(result).toBe(true);
    expect(authState.setUser).toHaveBeenCalledWith(undefined);
    expect(authState.logout).not.toHaveBeenCalled();
  });

  it('logs out and redirects to login when /auth/me fails', async () => {
    const { authApi, authState, router } = setup({
      meResponse: throwError(() => new Error('No token provided')),
    });

    const result = await resolveGuardResult();

    expect(authApi.me).toHaveBeenCalledTimes(1);
    expect(authState.setUser).not.toHaveBeenCalled();
    expect(authState.logout).toHaveBeenCalledOnce();
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/auth/login');
  });
});
