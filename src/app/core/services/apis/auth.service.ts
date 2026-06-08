import { inject, Injectable } from '@angular/core';
import { ApiService } from '../api';
import { LoginResponse, OtpRequest, OtpRequestResponse, OtpVerifyRequest } from '../../shared/types/auth.model';
import { CommonResponse } from '../../shared/types/common.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly _api = inject(ApiService);
  private readonly deviceStorageKey = 'xpense_device_id';

  requestOtp(request: OtpRequest) {
    return this._api.post<CommonResponse<OtpRequestResponse>>('auth/otp/request', request);
  }

  verifyOtp(request: OtpVerifyRequest) {
    return this._api.post<CommonResponse<LoginResponse>>('auth/otp/verify', {
      ...request,
      deviceId: request.deviceId ?? this.getDeviceId(),
    });
  }

  logout() {
    return this._api.post<CommonResponse<null>>('auth/logout', {});
  }

  me() {
    return this._api.get<CommonResponse<{ user: unknown }>>('auth/me');
  }

  private getDeviceId(): string | undefined {
    if (typeof localStorage === 'undefined') {
      return undefined;
    }

    const existingDeviceId = localStorage.getItem(this.deviceStorageKey);
    if (existingDeviceId) {
      return existingDeviceId;
    }

    const deviceId = this.createDeviceId();
    localStorage.setItem(this.deviceStorageKey, deviceId);
    return deviceId;
  }

  private createDeviceId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
