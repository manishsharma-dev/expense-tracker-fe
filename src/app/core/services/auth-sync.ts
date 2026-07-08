import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CsrfService } from './csrf';
import { AuthService } from './auth';

type AuthSyncMessage = {
  type: 'logout';
  timestamp: number;
};

@Injectable({ providedIn: 'root' })
export class AuthSyncService {
  private readonly authState = inject(AuthService);
  private readonly csrf = inject(CsrfService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly channelName = 'xpense-auth-sync';
  private readonly storageKey = 'xpense_auth_event';
  private channel?: BroadcastChannel;
  private initialized = false;

  init(): void {
    if (this.initialized || !this.isBrowser()) return;

    this.initialized = true;
    this.initBroadcastChannel();
    window.addEventListener('storage', this.handleStorageEvent);
  }

  announceLogout(): void {
    if (!this.isBrowser()) return;

    const message: AuthSyncMessage = {
      type: 'logout',
      timestamp: Date.now(),
    };

    this.channel?.postMessage(message);
    localStorage.setItem(this.storageKey, JSON.stringify(message));
  }

  private initBroadcastChannel(): void {
    if (!('BroadcastChannel' in window)) return;

    this.channel = new BroadcastChannel(this.channelName);
    this.channel.onmessage = (event: MessageEvent<AuthSyncMessage>) => {
      if (event.data?.type === 'logout') {
        this.handleExternalLogout();
      }
    };
  }

  private readonly handleStorageEvent = (event: StorageEvent): void => {
    if (event.key !== this.storageKey || !event.newValue) return;

    try {
      const message = JSON.parse(event.newValue) as Partial<AuthSyncMessage>;
      if (message.type === 'logout') {
        this.handleExternalLogout();
      }
    } catch {
      // Ignore malformed cross-tab messages.
    }
  };

  private handleExternalLogout(): void {
    this.zone.run(() => {
      this.authState.logout();
      this.csrf.clearToken();
      this.router.navigate(['/auth/login']);
    });
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }
}
