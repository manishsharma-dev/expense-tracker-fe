import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CommonResponse } from '../../shared/types/common.model';
import { LoginResponse, UserProfile } from '../../shared/types/auth.model';
import { ApiService } from '../api';
import { CsrfService } from '../csrf';
import { AuthService } from './auth.service';

describe('Auth API Service', () => {
  let service: AuthService;
  let api: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
  };
  let csrf: {
    setToken: ReturnType<typeof vi.fn>;
    clearToken: ReturnType<typeof vi.fn>;
  };

  const user: UserProfile = {
    _id: 'user-1',
    name: 'Manish',
    email: 'manish@example.com',
  };

  beforeEach(() => {
    const storage = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
        removeItem: vi.fn((key: string) => storage.delete(key)),
        clear: vi.fn(() => storage.clear()),
      },
    });

    api = {
      get: vi.fn(() => of({ success: true, data: {} })),
      post: vi.fn(() => of({ success: true, data: {} })),
      patch: vi.fn(() => of({ success: true, data: {} })),
    };
    csrf = {
      setToken: vi.fn(),
      clearToken: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiService, useValue: api },
        { provide: CsrfService, useValue: csrf },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requests OTP for an identifier', () => {
    const payload = { identifier: 'manish@example.com' };

    service.requestOtp(payload);

    expect(api.post).toHaveBeenCalledWith('auth/otp/request', payload);
  });

  it('verifies OTP with provided device id and stores CSRF token', async () => {
    api.post.mockReturnValue(of({
      success: true,
      data: { csrfToken: 'csrf-1', user },
    } as CommonResponse<LoginResponse>));

    await firstValueFrom(service.verifyOtp({
      identifier: 'manish@example.com',
      otp: '123456',
      deviceId: 'device-1',
    }));

    expect(api.post).toHaveBeenCalledWith('auth/otp/verify', {
      identifier: 'manish@example.com',
      otp: '123456',
      deviceId: 'device-1',
    });
    expect(csrf.setToken).toHaveBeenCalledWith('csrf-1');
  });

  it('reuses device id from local storage when verify payload does not include one', async () => {
    localStorage.setItem('xpense_device_id', 'stored-device');
    api.post.mockReturnValue(of({ success: true, data: {} } as CommonResponse<LoginResponse>));

    await firstValueFrom(service.verifyOtp({ identifier: 'manish@example.com', otp: '123456' }));

    expect(api.post).toHaveBeenCalledWith('auth/otp/verify', {
      identifier: 'manish@example.com',
      otp: '123456',
      deviceId: 'stored-device',
    });
  });

  it('creates and stores a device id when no device id exists', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('generated-device-id' as `${string}-${string}-${string}-${string}-${string}`);
    api.post.mockReturnValue(of({ success: true, data: {} } as CommonResponse<LoginResponse>));

    await firstValueFrom(service.verifyOtp({ identifier: 'manish@example.com', otp: '123456' }));

    expect(localStorage.getItem('xpense_device_id')).toBe('generated-device-id');
    expect(api.post).toHaveBeenCalledWith('auth/otp/verify', {
      identifier: 'manish@example.com',
      otp: '123456',
      deviceId: 'generated-device-id',
    });
  });

  it('clears CSRF token on logout', async () => {
    api.post.mockReturnValue(of({ success: true, data: null } as CommonResponse<null>));

    await firstValueFrom(service.logout());

    expect(api.post).toHaveBeenCalledWith('auth/logout', {});
    expect(csrf.clearToken).toHaveBeenCalledOnce();
  });

  it('gets the current authenticated user', () => {
    service.me();

    expect(api.get).toHaveBeenCalledWith('auth/me');
  });

  it('updates the current user profile', () => {
    const payload = { name: 'Updated Name', phone: '+91 9876543210' };

    service.updateProfile(payload);

    expect(api.patch).toHaveBeenCalledWith('users/me', payload);
  });

  it('snoozes the profile completion reminder', () => {
    service.remindProfileLater();

    expect(api.post).toHaveBeenCalledWith('users/me/profile-reminder/later', {});
  });
});
