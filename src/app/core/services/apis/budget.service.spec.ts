import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiService } from '../api';
import { BudgetApiService } from './budget.service';

describe('BudgetApiService', () => {
  let service: BudgetApiService;
  let api: { get: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = {
      get: vi.fn(() => of({ success: true, data: {} })),
      put: vi.fn(() => of({ success: true, data: {} })),
    };

    TestBed.configureTestingModule({
      providers: [
        BudgetApiService,
        { provide: ApiService, useValue: api },
      ],
    });

    service = TestBed.inject(BudgetApiService);
  });

  it('gets budget for a month', () => {
    service.getBudget('2026-07');

    expect(api.get).toHaveBeenCalledWith('budgets', { month: '2026-07' });
  });

  it('saves budget payload', () => {
    const payload = {
      month: '2026-07',
      totalAmount: 10000,
      allocations: [{ category: 'cat-1', amount: 2000 }],
    };

    service.saveBudget(payload);

    expect(api.put).toHaveBeenCalledWith('budgets', payload);
  });
});
