import { inject, Injectable } from '@angular/core';
import { ApiService } from '../api';
import { CommonResponse } from '../../shared/types/common.model';
import { EarningCategory, EarningPeriod, EarningResponse } from '../../shared/types/earning.model';

@Injectable({
  providedIn: 'root',
})
export class EarningApiService {
  private readonly api = inject(ApiService);

  getEarningCategories() {
    return this.api.get<CommonResponse<EarningResponse>>('earnings/categories');
  }

  createEarningCategory(category: Pick<EarningCategory, 'name' | 'color' | 'icon'>) {
    return this.api.post<CommonResponse<EarningResponse>>('earnings/categories', category);
  }

  getEarnings(params: { page?: number; limit?: number } = {}) {
    return this.api.get<CommonResponse<EarningResponse>>('earnings', this.toParams(params));
  }

  getEarningSummary(params: { period?: EarningPeriod; page?: number; limit?: number } = {}) {
    return this.api.get<CommonResponse<EarningResponse>>('earnings/summary', this.toParams(params));
  }

  createEarning(payload: {
    amount: number;
    date: string;
    category: string;
    country: string;
    description: string;
    notes?: string;
  }) {
    return this.api.post<CommonResponse<EarningResponse>>('earnings', payload);
  }

  private toParams(params: Record<string, string | number | undefined>) {
    return Object.fromEntries(
      Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== '')
        .map(([key, value]) => [key, String(value)])
    );
  }
}
