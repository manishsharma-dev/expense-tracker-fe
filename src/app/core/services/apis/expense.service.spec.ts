import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiService } from '../api';
import { ExpenseApiService } from './expense.service';

describe('ExpenseApiService', () => {
  let service: ExpenseApiService;
  let api: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = {
      get: vi.fn(() => of({ success: true, data: {} })),
      post: vi.fn(() => of({ success: true, data: {} })),
      put: vi.fn(() => of({ success: true, data: {} })),
      delete: vi.fn(() => of({ success: true, data: null })),
    };

    TestBed.configureTestingModule({
      providers: [
        ExpenseApiService,
        { provide: ApiService, useValue: api },
      ],
    });

    service = TestBed.inject(ExpenseApiService);
  });

  it('gets expenses with only meaningful query params', () => {
    service.getExpenses({
      page: 1,
      limit: 10,
      search: 'rent',
      sortBy: '',
      sortOrder: undefined,
      category: null as unknown as string,
      startDate: '2026-07-01',
      endDate: '2026-07-16',
    });

    expect(api.get).toHaveBeenCalledWith('expenses', {
      page: '1',
      limit: '10',
      search: 'rent',
      startDate: '2026-07-01',
      endDate: '2026-07-16',
    });
  });

  it('gets expense references', () => {
    service.getCategories();
    service.getPaymentMethods();
    service.getPaymentProviders();
    service.getCountries();
    service.getUniqueCurrencyCountries();

    expect(api.get).toHaveBeenNthCalledWith(1, 'categories');
    expect(api.get).toHaveBeenNthCalledWith(2, 'payment-methods');
    expect(api.get).toHaveBeenNthCalledWith(3, 'payment-providers');
    expect(api.get).toHaveBeenNthCalledWith(4, 'countries');
    expect(api.get).toHaveBeenNthCalledWith(5, 'countries/unique-currencies');
  });

  it('creates category and subcategory records', () => {
    const category = { name: 'Food', color: 'orange', icon: 'restaurant' };
    const subCategory = { name: 'Lunch', category: 'cat-1', color: 'orange', icon: 'lunch_dining' };

    service.createCategory(category);
    service.createSubCategory(subCategory);

    expect(api.post).toHaveBeenNthCalledWith(1, 'categories', category);
    expect(api.post).toHaveBeenNthCalledWith(2, 'sub-categories', subCategory);
  });

  it('gets subcategories with optional category filtering', () => {
    service.getSubCategories();
    service.getSubCategories('cat-1');

    expect(api.get).toHaveBeenNthCalledWith(1, 'sub-categories', undefined);
    expect(api.get).toHaveBeenNthCalledWith(2, 'sub-categories', { category: 'cat-1' });
  });

  it('gets and deletes merchant rule suggestions', () => {
    service.getMerchantRuleSuggestions('netflix');
    service.deleteMerchantRuleSuggestion('rule-1');

    expect(api.get).toHaveBeenCalledWith('merchant-rules/suggestions', { q: 'netflix' });
    expect(api.delete).toHaveBeenCalledWith('merchant-rules/suggestions/rule-1');
  });

  it('creates, updates, deletes, and reorders payment methods', () => {
    const paymentMethod = {
      name: 'HDFC UPI',
      type: 'upi' as const,
      upiId: 'manish@upi',
      icon: 'account_balance',
      provider: 'provider-1',
    };
    const sequence = [{ id: 'pm-1', sequence: 1 }];

    service.createPaymentMethod(paymentMethod);
    service.updatePaymentMethod('pm-1', paymentMethod);
    service.deletePaymentMethod('pm-1');
    service.updatePaymentMethodSequence(sequence);

    expect(api.post).toHaveBeenCalledWith('payment-methods', paymentMethod);
    expect(api.put).toHaveBeenNthCalledWith(1, 'payment-methods/pm-1', paymentMethod);
    expect(api.delete).toHaveBeenCalledWith('payment-methods/pm-1');
    expect(api.put).toHaveBeenNthCalledWith(2, 'payment-methods/sequence', { items: sequence });
  });

  it('creates, gets, updates, and deletes expenses', () => {
    const formData = new FormData();
    formData.set('description', 'Dinner');

    service.createExpense(formData);
    service.getExpense('expense-1');
    service.updateExpense('expense-1', formData);
    service.deleteExpense('expense-1');

    expect(api.post).toHaveBeenCalledWith('expenses', formData);
    expect(api.get).toHaveBeenCalledWith('expenses/expense-1');
    expect(api.put).toHaveBeenCalledWith('expenses/expense-1', formData);
    expect(api.delete).toHaveBeenCalledWith('expenses/expense-1');
  });

  it('wraps receipt files in FormData before scanning', () => {
    const file = new File(['receipt-content'], 'receipt.png', { type: 'image/png' });

    service.scanReceipt(file);

    expect(api.post).toHaveBeenCalledWith('expenses/receipt/scan', expect.any(FormData));
    const formData = api.post.mock.calls[0][1] as FormData;
    expect(formData.get('receipt')).toBe(file);
  });
});
