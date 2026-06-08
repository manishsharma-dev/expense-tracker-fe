// src/app/core/services/auth.service.ts
import { computed, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUser = signal<unknown | null>(null);
  readonly user = this.currentUser.asReadonly();
  readonly loggedIn = computed(() => !!this.currentUser());

  login(user: unknown): void {
    this.currentUser.set(user ?? {});
  }

  setUser(user: unknown): void {
    this.currentUser.set(user ?? {});
  }

  logout(): void {
    this.currentUser.set(null);
  }

  isLoggedIn(): boolean {
    return this.loggedIn();
  }
}
