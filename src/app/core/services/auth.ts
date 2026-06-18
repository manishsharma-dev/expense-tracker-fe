// src/app/core/services/auth.service.ts
import { computed, Injectable, signal } from '@angular/core';
import { UserProfile } from '../shared/types/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUser = signal<UserProfile | null>(null);
  readonly user = this.currentUser.asReadonly();
  readonly loggedIn = computed(() => !!this.currentUser());

  login(user: UserProfile | undefined): void {
    this.currentUser.set(user ?? null);
  }

  setUser(user: UserProfile | undefined): void {
    this.currentUser.set(user ?? null);
  }

  logout(): void {
    this.currentUser.set(null);
  }

  isLoggedIn(): boolean {
    return this.loggedIn();
  }
}
