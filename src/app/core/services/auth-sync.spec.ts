import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth';
import { AuthSyncService } from './auth-sync';
import { CsrfService } from './csrf';

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage = vi.fn();

  constructor(public readonly name: string) {
    MockBroadcastChannel.instances.push(this);
  }
}

describe('AuthSyncService', () => {
  let service: AuthSyncService;
  let authState: { logout: ReturnType<typeof vi.fn> };
  let csrf: { clearToken: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let storage: Map<string, string>;
  let storageListeners: Array<(event: StorageEvent) => void>;

  beforeEach(() => {
    storage = new Map<string, string>();
    storageListeners = [];
    MockBroadcastChannel.instances = [];

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
        removeItem: vi.fn((key: string) => storage.delete(key)),
        clear: vi.fn(() => storage.clear()),
      },
    });
    Object.defineProperty(window, 'BroadcastChannel', {
      configurable: true,
      value: MockBroadcastChannel,
    });
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
      if (type === 'storage') storageListeners.push(listener as (event: StorageEvent) => void);
    });

    authState = { logout: vi.fn() };
    csrf = { clearToken: vi.fn() };
    router = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthSyncService,
        { provide: AuthService, useValue: authState },
        { provide: CsrfService, useValue: csrf },
        { provide: Router, useValue: router },
        { provide: NgZone, useValue: { run: (fn: () => void) => fn() } },
      ],
    });

    service = TestBed.inject(AuthSyncService);
  });

  it('initializes broadcast and storage listeners only once', () => {
    service.init();
    service.init();

    expect(MockBroadcastChannel.instances).toHaveLength(1);
    expect(MockBroadcastChannel.instances[0].name).toBe('xpense-auth-sync');
    expect(window.addEventListener).toHaveBeenCalledOnce();
    expect(window.addEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
  });

  it('announces logout through broadcast channel and local storage', () => {
    vi.spyOn(Date, 'now').mockReturnValue(12345);
    service.init();

    service.announceLogout();

    expect(MockBroadcastChannel.instances[0].postMessage).toHaveBeenCalledWith({
      type: 'logout',
      timestamp: 12345,
    });
    expect(JSON.parse(storage.get('xpense_auth_event') ?? '{}')).toEqual({
      type: 'logout',
      timestamp: 12345,
    });
  });

  it('handles logout broadcast from another tab', () => {
    service.init();

    MockBroadcastChannel.instances[0].onmessage?.({ data: { type: 'logout', timestamp: 1 } } as MessageEvent);

    expect(authState.logout).toHaveBeenCalledOnce();
    expect(csrf.clearToken).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('handles logout storage events and ignores malformed messages', () => {
    service.init();

    storageListeners[0]({ key: 'xpense_auth_event', newValue: '{bad-json' } as StorageEvent);
    storageListeners[0]({ key: 'other_key', newValue: JSON.stringify({ type: 'logout' }) } as StorageEvent);
    storageListeners[0]({ key: 'xpense_auth_event', newValue: JSON.stringify({ type: 'logout' }) } as StorageEvent);

    expect(authState.logout).toHaveBeenCalledOnce();
    expect(csrf.clearToken).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
