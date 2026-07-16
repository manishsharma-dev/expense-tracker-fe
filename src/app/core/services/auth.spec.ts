import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { UserProfile } from '../shared/types/auth.model';
import { AuthService } from './auth';

describe('AuthService', () => {
  let service: AuthService;
  const user: UserProfile = {
    _id: 'user-1',
    name: 'Manish',
    email: 'manish@example.com',
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [AuthService] });
    service = TestBed.inject(AuthService);
  });

  it('starts with no authenticated user', () => {
    expect(service.user()).toBeNull();
    expect(service.loggedIn()).toBe(false);
    expect(service.isLoggedIn()).toBe(false);
  });

  it('sets user on login and setUser', () => {
    service.login(user);

    expect(service.user()).toEqual(user);
    expect(service.loggedIn()).toBe(true);
    expect(service.isLoggedIn()).toBe(true);

    const nextUser = { ...user, _id: 'user-2' };
    service.setUser(nextUser);

    expect(service.user()).toEqual(nextUser);
  });

  it('normalizes undefined users to null', () => {
    service.login(undefined);
    expect(service.user()).toBeNull();

    service.setUser(undefined);
    expect(service.user()).toBeNull();
  });

  it('clears user on logout', () => {
    service.login(user);

    service.logout();

    expect(service.user()).toBeNull();
    expect(service.loggedIn()).toBe(false);
  });
});
