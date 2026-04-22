import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { errorInterceptor } from './core/utils/interceptors/error-interceptor';
import { loadingInterceptor } from './core/utils/interceptors/loading-interceptor';
import { MessageService } from 'primeng/api';
import { authInterceptor } from './shared/features/auth/interceptor/auth-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    MessageService,
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.dark',
        },
      },
    }),
    provideHttpClient(withInterceptors([loadingInterceptor, authInterceptor, errorInterceptor])),
  ],
};
