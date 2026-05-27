import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthFacade } from '../auth.facade';

function isSessionDebugEnabled(): boolean {
  try {
    if (typeof window === 'undefined') {
      return false;
    }

    const flag = window.localStorage.getItem('debug:session');
    if (flag === '1') return true;
    if (flag === '0') return false;

    return true;
  } catch {
    return true;
  }
}

function logInterceptorDebug(stage: string, extra: Record<string, unknown> = {}): void {
  if (!isSessionDebugEnabled()) {
    return;
  }

  console.log('[AuthDebug][Interceptor]', {
    ts: new Date().toISOString(),
    stage,
    ...extra,
  });
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authFacade = inject(AuthFacade);

  // getSession() es async, lo convertimos a observable con from()
  return from(authFacade.getSession()).pipe(
    switchMap(({ data }) => {
      if (!data) {
        logInterceptorDebug('sessionMissing', {
          method: req.method,
          url: req.url,
        });
        return next(req);
      }

      const token = data!.session?.access_token;
      const expiresAt = data!.session?.expires_at ?? null;

      if (!token) {
        logInterceptorDebug('tokenMissing', {
          method: req.method,
          url: req.url,
          expiresAt,
          hasSession: Boolean(data?.session),
        });
        return next(req);
      }

      const authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });

      logInterceptorDebug('tokenAttached', {
        method: req.method,
        url: req.url,
        expiresAt,
        tokenSuffix: token.slice(-10),
      });

      return next(authReq);
    }),
  );
};
