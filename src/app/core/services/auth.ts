// src/app/core/services/auth.service.ts
import { Injectable, inject, PLATFORM_ID, signal, computed, REQUEST,Injector } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { STORAGE_KEY } from '../shared/constants';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly injector = inject(Injector);
  private readonly token = signal<string | null>(this.resolveInitialToken());
  readonly loggedIn = computed(() => !!this.token());

  private resolveInitialToken(): string | null {
    if (this.isBrowser) {
      return localStorage.getItem(STORAGE_KEY);
    }
    try {
      const request = this.injector.get(REQUEST, null, { optional: true });
      const cookieHeader = request?.headers?.get('cookie') ?? '';
      const match = cookieHeader.match(
        new RegExp(`(?:^|;\\s*)${STORAGE_KEY}=([^;]+)`)
      );
      return match?.[1] ?? null;
    } catch {
      return null;
    }
  }

  login(token: string): void {
    this.token.set(token);
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY, token);
      const isSecure = location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${STORAGE_KEY}=${token}; path=/; SameSite=Strict${isSecure}`;
    }
  }

  logout(): void {
    this.token.set(null);
    if (this.isBrowser) {
      localStorage.removeItem(STORAGE_KEY);
      document.cookie = `${STORAGE_KEY}=; path=/; max-age=0`;
    }
  }

  isLoggedIn(): boolean {
    return this.loggedIn();
  }

  getToken(): string | null {
    return this.token();
  }
}