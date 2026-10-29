import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { mockBackendInterceptor } from './core/mock/mock-backend.interceptor';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // شبیه‌ساز بعد از authInterceptor می‌آید تا هدر توکن را ببیند
    provideHttpClient(
      withInterceptors(
        environment.mockBackend ? [authInterceptor, mockBackendInterceptor] : [authInterceptor],
      ),
    ),
  ],
};