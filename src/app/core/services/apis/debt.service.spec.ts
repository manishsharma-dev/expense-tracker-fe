import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiService } from '../api';
import { DebtApiService } from './debt.service';

describe('DebtApiService', () => {
  let service: DebtApiService;
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
        DebtApiService,
        { provide: ApiService, useValue: api },
      ],
    });

    service = TestBed.inject(DebtApiService);
  });

  it('gets all debt accounts', () => {
    service.getDebtAccounts();

    expect(api.get).toHaveBeenCalledWith('debts');
  });

  it('creates a debt account', () => {
    const payload = {
      name: 'HDFC Credit Card',
      type: 'credit_card' as const,
      openingBalance: 5000,
      country: 'country-1',
    };

    service.createDebtAccount(payload);

    expect(api.post).toHaveBeenCalledWith('debts', payload);
  });

  it('gets one debt account', () => {
    service.getDebtAccount('debt-1');

    expect(api.get).toHaveBeenCalledWith('debts/debt-1');
  });

  it('gets debt history with only meaningful params', () => {
    service.getDebtHistory('debt-1', {
      page: 2,
      limit: 20,
      startDate: '2026-07-01',
      endDate: '',
    });

    expect(api.get).toHaveBeenCalledWith('debts/debt-1/history', {
      page: '2',
      limit: '20',
      startDate: '2026-07-01',
    });
  });

  it('records a charge', () => {
    const payload = { amount: 300, date: '2026-07-16', description: 'Dinner' };

    service.recordCharge('debt-1', payload);

    expect(api.post).toHaveBeenCalledWith('debts/debt-1/charges', payload);
  });

  it('records a payment', () => {
    const payload = { amount: 1000, date: '2026-07-16', description: 'Bill payment' };

    service.recordPayment('debt-1', payload);

    expect(api.post).toHaveBeenCalledWith('debts/debt-1/payments', payload);
  });
});
