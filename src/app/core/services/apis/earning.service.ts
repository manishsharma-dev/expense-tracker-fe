import { inject, Injectable } from '@angular/core';
import { ApiService } from '../api';
import { CommonResponse } from '../../shared/types/common.model';
import { EarningCategory, EarningResponse } from '../../shared/types/earning.model';

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

  getEarnings() {
    return this.api.get<CommonResponse<EarningResponse>>('earnings');
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
}
