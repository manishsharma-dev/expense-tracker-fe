import { inject, Injectable } from '@angular/core';
import { ApiService } from '../api';
import { CommonResponse } from '../../shared/types/common.model';
import {
  DebtAccount,
  DebtAccountPayload,
  DebtDetailResponse,
  DebtHistoryQuery,
  DebtHistoryResponse,
  DebtListResponse,
  DebtTransaction,
  DebtTransactionPayload,
} from '../../shared/types/debt.model';

@Injectable({
  providedIn: 'root',
})
export class DebtApiService {
  private readonly api = inject(ApiService);

  getDebtAccounts() {
    return this.api.get<CommonResponse<DebtListResponse>>('debts');
  }

  createDebtAccount(payload: DebtAccountPayload) {
    return this.api.post<CommonResponse<{ account: DebtAccount }>>('debts', payload);
  }

  getDebtAccount(accountId: string) {
    return this.api.get<CommonResponse<DebtDetailResponse>>(`debts/${accountId}`);
  }

  getDebtHistory(accountId: string, query: DebtHistoryQuery = {}) {
    const params = Object.entries(query).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') acc[key] = String(value);
      return acc;
    }, {});
    return this.api.get<CommonResponse<DebtHistoryResponse>>(`debts/${accountId}/history`, params);
  }

  recordCharge(accountId: string, payload: DebtTransactionPayload) {
    return this.api.post<CommonResponse<{ account: DebtAccount; transaction: DebtTransaction }>>(`debts/${accountId}/charges`, payload);
  }

  recordPayment(accountId: string, payload: DebtTransactionPayload) {
    return this.api.post<CommonResponse<{ account: DebtAccount; transaction: DebtTransaction }>>(`debts/${accountId}/payments`, payload);
  }
}
