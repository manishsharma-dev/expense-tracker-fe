import { inject, Injectable } from '@angular/core';
import { ApiService } from '../api';
import { CommonResponse } from '../../shared/types/common.model';
import {
  Category,
  ExpenseListQuery,
  ExpenseListResponse,
  ExpenseReferenceResponse,
  ExpenseResponse,
  PaymentMethod,
  SubCategory,
} from '../../shared/types/expense.model';

@Injectable({
  providedIn: 'root',
})
export class ExpenseApiService {
  private readonly api = inject(ApiService);

  getExpenses(query: ExpenseListQuery) {
    const params = Object.entries(query).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = String(value);
      }
      return acc;
    }, {});

    return this.api.get<CommonResponse<ExpenseListResponse>>('expenses', params);
  }

  getCategories() {
    return this.api.get<CommonResponse<ExpenseReferenceResponse>>('categories');
  }

  createCategory(category: Pick<Category, 'name' | 'color' | 'icon'>) {
    return this.api.post<CommonResponse<ExpenseReferenceResponse>>('categories', category);
  }

  getSubCategories(categoryId?: string) {
    return this.api.get<CommonResponse<ExpenseReferenceResponse>>(
      'sub-categories',
      categoryId ? { category: categoryId } : undefined
    );
  }

  createSubCategory(subCategory: Pick<SubCategory, 'name' | 'category' | 'color' | 'icon'>) {
    return this.api.post<CommonResponse<ExpenseReferenceResponse>>('sub-categories', subCategory);
  }

  getPaymentMethods() {
    return this.api.get<CommonResponse<ExpenseReferenceResponse>>('payment-methods');
  }

  getPaymentProviders() {
    return this.api.get<CommonResponse<ExpenseReferenceResponse>>('payment-providers');
  }

  getCountries() {
    return this.api.get<CommonResponse<ExpenseReferenceResponse>>('countries');
  }

  getUniqueCurrencyCountries() {
    return this.api.get<CommonResponse<ExpenseReferenceResponse>>('countries/unique-currencies');
  }

  createPaymentMethod(
    paymentMethod: Pick<PaymentMethod, 'name' | 'type' | 'lastFour' | 'upiId' | 'nickname' | 'icon'> & {
      provider?: string;
    }
  ) {
    return this.api.post<CommonResponse<ExpenseReferenceResponse>>('payment-methods', paymentMethod);
  }

  updatePaymentMethod(
    paymentMethodId: string,
    paymentMethod: Pick<PaymentMethod, 'name' | 'type' | 'lastFour' | 'upiId' | 'nickname' | 'icon'> & {
      provider?: string;
    }
  ) {
    return this.api.put<CommonResponse<ExpenseReferenceResponse>>(`payment-methods/${paymentMethodId}`, paymentMethod);
  }

  deletePaymentMethod(paymentMethodId: string) {
    return this.api.delete<CommonResponse<null>>(`payment-methods/${paymentMethodId}`);
  }

  updatePaymentMethodSequence(items: Array<{ id: string; sequence: number }>) {
    return this.api.put<CommonResponse<ExpenseReferenceResponse>>('payment-methods/sequence', { items });
  }

  createExpense(expense: FormData) {
    return this.api.post<CommonResponse<ExpenseResponse>>('expenses', expense);
  }

  getExpense(expenseId: string) {
    return this.api.get<CommonResponse<ExpenseResponse>>(`expenses/${expenseId}`);
  }

  updateExpense(expenseId: string, expense: FormData) {
    return this.api.put<CommonResponse<ExpenseResponse>>(`expenses/${expenseId}`, expense);
  }

  deleteExpense(expenseId: string) {
    return this.api.delete<CommonResponse<null>>(`expenses/${expenseId}`);
  }
}
