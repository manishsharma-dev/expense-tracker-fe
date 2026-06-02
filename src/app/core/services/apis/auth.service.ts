import { inject, Injectable } from '@angular/core';
import { ApiService } from '../api';
import { LoginResponse, OtpRequest, OtpRequestResponse, OtpVerifyRequest } from '../../shared/types/auth.model';
import { CommonResponse } from '../../shared/types/common.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly _api = inject(ApiService);

  requestOtp(request: OtpRequest) {
    return this._api.post<CommonResponse<OtpRequestResponse>>('auth/otp/request', request);
  }

  verifyOtp(request: OtpVerifyRequest) {
    return this._api.post<CommonResponse<LoginResponse>>('auth/otp/verify', request);
  }
}
