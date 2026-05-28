import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Config {
  private readonly _apiBaseUrl = signal<string>('');

  setApiBaseUrl(url: string): void {
    this._apiBaseUrl.set(url);
  }
  apiBaseUrl(): string {
    return this._apiBaseUrl();
  }
}
