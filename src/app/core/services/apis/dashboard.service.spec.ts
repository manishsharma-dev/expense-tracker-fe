import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiService } from '../api';
import { DashboardApiService } from './dashboard.service';

describe('DashboardApiService', () => {
  let service: DashboardApiService;
  let api: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = {
      get: vi.fn(() => of({ success: true, data: {} })),
    };

    TestBed.configureTestingModule({
      providers: [
        DashboardApiService,
        { provide: ApiService, useValue: api },
      ],
    });

    service = TestBed.inject(DashboardApiService);
  });

  it('gets dashboard without params when month is not provided', () => {
    service.getDashboard();

    expect(api.get).toHaveBeenCalledWith('dashboard', undefined);
  });

  it('gets dashboard for a selected month', () => {
    service.getDashboard('2026-07');

    expect(api.get).toHaveBeenCalledWith('dashboard', { month: '2026-07' });
  });
});
