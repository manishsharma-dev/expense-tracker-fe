// src/app/app.config.ts
import { ApplicationConfig, inject, isDevMode, provideAppInitializer } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { routes } from './app.routes';
import { apiInterceptor } from './core/interceptors/api-interceptor';
import { HttpClient } from '@angular/common/http';
import { Config } from './core/services/config';
import { firstValueFrom } from 'rxjs';
import { AuthSyncService } from './core/services/auth-sync';

function loadConfig(http: HttpClient, config: Config) {
  return firstValueFrom(http.get<{ apiBaseUrl: string }>('/api/config'))
    .then((response) => {
      config.setApiBaseUrl(response.apiBaseUrl);
    })
    .catch((error: unknown) => {
      console.error('Failed to load config', error);
      config.setApiBaseUrl('http://localhost:3000/api/v1');
    });
}

function getDateLocale(): string {
  if (typeof navigator !== 'undefined') {
    return navigator.languages?.[0] || navigator.language || 'en-IN';
  }

  return 'en-IN';
}

export const appConfig: ApplicationConfig = {
  providers: [
    //provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withFetch(),
      withInterceptors([apiInterceptor]),
    ),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    {
      provide: MAT_DATE_LOCALE,
      useFactory: getDateLocale,
    },
    provideNativeDateAdapter(),
    provideAppInitializer(() => loadConfig(inject(HttpClient), inject(Config))),
    provideAppInitializer(() => inject(AuthSyncService).init()),
  ],
};
