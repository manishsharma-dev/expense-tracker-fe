import { inject, Injectable } from '@angular/core';
import { ApiService } from '../api';
import { CommonResponse } from '../../shared/types/common.model';
import { DashboardResponse } from '../../shared/types/dashboard.model';

@Injectable({
  providedIn: 'root',
})
export class DashboardApiService {
  private readonly api = inject(ApiService);

  getDashboard(month?: string) {
    return this.api.get<CommonResponse<DashboardResponse>>('dashboard', month ? { month } : undefined);
  }
}
