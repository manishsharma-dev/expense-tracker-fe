import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CommonResponse } from '../shared/types/common.model';
import { Config } from './config';

type CsrfResponse = {
  csrfToken: string;
};

@Injectable({
  providedIn: 'root',
})
export class CsrfService {
  private readonly config = inject(Config);
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly token = signal('');
  private pendingToken?: Promise<string>;

  setToken(token?: string): void {
    this.token.set(token ?? '');
    this.pendingToken = undefined;
  }

  clearToken(): void {
    this.setToken('');
  }

  getToken(): Promise<string> {
    const existingToken = this.token();
    if (existingToken) return Promise.resolve(existingToken);
    if (this.pendingToken) return this.pendingToken;

    this.pendingToken = firstValueFrom(
      this.http.get<CommonResponse<CsrfResponse>>(`${this.config.apiBaseUrl()}/auth/csrf-token`, {
        withCredentials: true,
      })
    ).then((response) => {
      const csrfToken = response.data?.csrfToken ?? '';
      this.setToken(csrfToken);
      return csrfToken;
    }).finally(() => {
      this.pendingToken = undefined;
    });

    return this.pendingToken;
  }
}
