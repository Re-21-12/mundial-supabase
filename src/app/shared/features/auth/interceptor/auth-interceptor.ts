import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthFacade } from '../auth.facade';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authFacade = inject(AuthFacade);

  // getSession() es async, lo convertimos a observable con from()
  return from(authFacade.getSession()).pipe(
    switchMap(({ data }) => {
      if (!data) return next(req);

      const token = data!.session?.access_token;

      if (!token) return next(req); // no hay sesión, pasa sin token

      const authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });

      return next(authReq);
    }),
  );
};
