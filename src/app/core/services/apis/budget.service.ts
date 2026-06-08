import { inject, Injectable } from '@angular/core';
import { ApiService } from '../api';
import { CommonResponse } from '../../shared/types/common.model';
import { BudgetPayload, BudgetResponse } from '../../shared/types/budget.model';

@Injectable({
  providedIn: 'root',
})
export class BudgetApiService {
  private readonly api = inject(ApiService);

  getBudget(month: string) {
    return this.api.get<CommonResponse<BudgetResponse>>('budgets', { month });
  }

  saveBudget(payload: BudgetPayload) {
    return this.api.put<CommonResponse<BudgetResponse>>('budgets', payload);
  }
}
