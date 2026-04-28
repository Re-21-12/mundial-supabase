// session.resolver.ts
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { AuthFacade } from './auth.facade';

export const sessionResolver: ResolveFn<boolean> = async () => {
  console.log('sessionResolver: Starting session resolution');
  const auth = inject(AuthFacade);

  try {
    console.log('sessionResolver: Auth is ready');
    return true;
  } catch (e) {
    console.error('sessionResolver: Unexpected error', e);
    return true; // nunca bloquees aquí
  }
};
