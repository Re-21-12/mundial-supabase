import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { HttpLoadingService } from '../../services/http-loading-service';

export const SKIP_LOADING = new HttpContextToken<boolean>(() => false);

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(HttpLoadingService);

  if (req.context.get(SKIP_LOADING)) {
    return next(req);
  }

  loadingService.start();

  return next(req).pipe(finalize(() => loadingService.stop()));
};
