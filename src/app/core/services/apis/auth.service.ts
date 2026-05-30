import { inject, Injectable } from '@angular/core';
import { ApiService } from '../api';
import { LoginRequest, LoginResponse } from '../../shared/types/auth.model';
import { CommonResponse } from '../../shared/types/common.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly _api = inject(ApiService);

  login(loginRequest: LoginRequest) {
    return this._api.post<CommonResponse<LoginResponse>>('auth/login', loginRequest);
  }
}
