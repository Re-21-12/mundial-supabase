import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../../../shared/services/notification-service';
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const notifier = inject(NotificationService);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const config = errorMessages[error.status];

      if (!config) {
        router.navigate(['/server-error']);
        return throwError(() => error);
      }

      const [message, route, type] = config;

      switch (type) {
        case 'Page':
          router.navigate([route]);
          break;
        case 'Toast':
          notifier.notify('error', 'Atención', message);
          break;
        case 'Dialog':
          // Aquí podrías llamar a un DialogService si lo implementas luego
          console.warn('Lógica de Diálogo pendiente para:', message);
          break;
      }
      console.error('Error Interceptor:', error);
      return throwError(() => error);
    }),
  );
};
export type deployType = 'Toast' | 'Dialog' | 'Page';
export type ErrorResponse = Record<number, [string, string, deployType]>;

export const errorMessages: ErrorResponse = {
  400: ['Solicitud incorrecta. Verifica los datos enviados.', '/bad-request', 'Page'],
  401: ['Sesión expirada. Por favor, inicia sesión de nuevo.', '/unauthorized', 'Page'],
  403: ['No tienes permiso para acceder a este recurso.', '/forbidden', 'Page'],
  404: ['El servidor no encontró el registro.', '/not-found', 'Dialog'],
  429: ['Demasiadas solicitudes. Inténtalo de nuevo más tarde.', '/too-many-requests', 'Toast'],
  500: ['Error interno del servidor. Inténtalo más tarde.', '/server-error', 'Page'],
  0: ['No hay conexión a internet o el servidor está caído.', '/server-error', 'Page'],
};
