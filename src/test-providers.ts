import { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

const providers: Array<Provider | EnvironmentProviders> = [
  provideHttpClient(),
  provideHttpClientTesting(),
  provideNoopAnimations(),
  provideRouter([]),
];

export default providers;
