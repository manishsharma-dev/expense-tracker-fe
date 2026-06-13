import { inject, Injectable } from '@angular/core';
import { ApiService } from '../api';
import { CommonResponse } from '../../shared/types/common.model';
import {
  DebtAccount,
  DebtAccountPayload,
  DebtDetailResponse,
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

  recordCharge(accountId: string, payload: DebtTransactionPayload) {
    return this.api.post<CommonResponse<{ account: DebtAccount; transaction: DebtTransaction }>>(`debts/${accountId}/charges`, payload);
  }

  recordPayment(accountId: string, payload: DebtTransactionPayload) {
    return this.api.post<CommonResponse<{ account: DebtAccount; transaction: DebtTransaction }>>(`debts/${accountId}/payments`, payload);
  }
}
