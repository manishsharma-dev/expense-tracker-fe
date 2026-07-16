import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiService } from '../api';
import { EarningApiService } from './earning.service';

describe('EarningApiService', () => {
  let service: EarningApiService;
  let api: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = {
      get: vi.fn(() => of({ success: true, data: {} })),
      post: vi.fn(() => of({ success: true, data: {} })),
    };

    TestBed.configureTestingModule({
      providers: [
        EarningApiService,
        { provide: ApiService, useValue: api },
      ],
    });

    service = TestBed.inject(EarningApiService);
  });

  it('gets earning categories', () => {
    service.getEarningCategories();

    expect(api.get).toHaveBeenCalledWith('earnings/categories');
  });

  it('creates an earning category', () => {
    const category = { name: 'Salary', color: '#2ca45c', icon: 'payments' };

    service.createEarningCategory(category);

    expect(api.post).toHaveBeenCalledWith('earnings/categories', category);
  });

  it('gets earnings with stringified params', () => {
    service.getEarnings({ page: 2, limit: 10 });

    expect(api.get).toHaveBeenCalledWith('earnings', { page: '2', limit: '10' });
  });

  it('filters empty earning params', () => {
    service.getEarnings({ page: undefined, limit: 10 });

    expect(api.get).toHaveBeenCalledWith('earnings', { limit: '10' });
  });

  it('gets earning summary with period params', () => {
    service.getEarningSummary({ period: 'month', page: 1, limit: 6 });

    expect(api.get).toHaveBeenCalledWith('earnings/summary', {
      period: 'month',
      page: '1',
      limit: '6',
    });
  });

  it('creates an earning', () => {
    const payload = {
      amount: 80000,
      date: '2026-07-01',
      category: 'cat-1',
      country: 'country-1',
      description: 'Salary',
      notes: 'July salary',
    };

    service.createEarning(payload);

    expect(api.post).toHaveBeenCalledWith('earnings', payload);
  });
});
