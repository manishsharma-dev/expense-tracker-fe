import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { Config } from './config';

describe('Config', () => {
  let service: Config;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [Config] });
    service = TestBed.inject(Config);
  });

  it('starts with an empty API base URL', () => {
    expect(service.apiBaseUrl()).toBe('');
  });

  it('stores the runtime API base URL', () => {
    service.setApiBaseUrl('/api/v1');

    expect(service.apiBaseUrl()).toBe('/api/v1');
  });
});
