// src/app/app.config.ts
import { ApplicationConfig, inject, isDevMode, provideAppInitializer } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { apiInterceptor } from './core/interceptors/api-interceptor';
import { HttpClient } from '@angular/common/http';
import { Config } from './core/services/config';
import { firstValueFrom } from 'rxjs';

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
    provideAppInitializer(() => loadConfig(inject(HttpClient), inject(Config))),
  ],
};
