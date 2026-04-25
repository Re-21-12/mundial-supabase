import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { errorInterceptor } from './core/utils/interceptors/error-interceptor';
import { loadingInterceptor } from './core/utils/interceptors/loading-interceptor';
import { MessageService } from 'primeng/api';
import { authInterceptor } from './shared/features/auth/interceptor/auth-interceptor';
import MundialPreset from './theme/mundial-preset';
import { GlobalErrorHandler } from './core/utils/handlers/global-error-handler';

export const appConfig: ApplicationConfig = {
  providers: [
    MessageService,
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    providePrimeNG({
      theme: {
        preset: MundialPreset,
        options: {
          darkModeSelector: '.dark',
          cssLayer: {
            name: 'primeng',
            order: 'theme, base, primeng',
          },
        },
      },
    }),
    provideHttpClient(withInterceptors([loadingInterceptor, authInterceptor, errorInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
