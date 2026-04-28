import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners, APP_INITIALIZER, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { loadingInterceptor } from './core/utils/interceptors/loading-interceptor';
import { MessageService } from 'primeng/api';
import MundialPreset from './theme/mundial-preset';
import { GlobalErrorHandler } from './core/utils/handlers/global-error-handler';

export const appConfig: ApplicationConfig = {
  providers: [
    MessageService,
    provideBrowserGlobalErrorListeners(),
/*     {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      multi: true,
    }, */
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
    // provideHttpClient(withInterceptors([loadingInterceptor, authInterceptor, errorInterceptor])),
    provideHttpClient(withInterceptors([loadingInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
