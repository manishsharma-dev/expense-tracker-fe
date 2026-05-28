// src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { apiInterceptor } from './core/interceptors/api-interceptor';
import { HttpClient } from '@angular/common/http';
import { Config } from './core/services/config';

function loadConfig(http: HttpClient, config: Config) {
  return () =>
    http.get<{ apiBaseUrl: string }>('/api/config')
      .toPromise()
      .then(response => {
        if (response) config.setApiBaseUrl(response.apiBaseUrl);
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
    {
      provide: APP_INITIALIZER,
      useFactory: loadConfig,
      deps: [HttpClient, Config],
      multi: true,
    },
  ],
};