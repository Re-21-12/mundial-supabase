import { inject, Injectable } from '@angular/core';
import {
  AuthChangeEvent,
  createClient,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Database } from '../../types/database.types';
import { HttpLoadingService } from './http-loading-service';
import { NotificationService } from '../../shared/services/notification-service';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  // private supabase: SupabaseClient<Database>;
  private supabase: SupabaseClient;
  private readonly loadingService = inject(HttpLoadingService);
  private readonly notificationService = inject(NotificationService);

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      global: {
        fetch: async (input, init) => {
          this.loadingService.start();
          try {
            const response = await fetch(input, init);

            if (!response.ok && this.shouldNotify(response.status)) {
              this.notificationService.notify(
                'error',
                'Atención',
                this.getMessageByStatus(response.status),
              );
            }

            return response;
          } catch (error) {
            this.notificationService.notify(
              'error',
              'Atención',
              'No hay conexión a internet o el servidor está caído.',
            );
            throw error;
          } finally {
            this.loadingService.stop();
          }
        },
      },
    });
  }

  private shouldNotify(status: number): boolean {
    return [400, 401, 403, 404, 429, 500].includes(status) || status >= 500;
  }

  private getMessageByStatus(status: number): string {
    const messages: Record<number, string> = {
      400: 'Solicitud incorrecta. Verifica los datos enviados.',
      401: 'Sesión expirada. Por favor, inicia sesión de nuevo.',
      403: 'No tienes permiso para acceder a este recurso.',
      404: 'El servidor no encontró el registro.',
      429: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.',
      500: 'Error interno del servidor. Inténtalo más tarde.',
    };

    return messages[status] ?? 'Ocurrió un error inesperado.';
  }

  get client() {
    return this.supabase;
  }

  getClient() {
    return this.supabase;
  }

  get apiKey(): string {
    return environment.supabaseKey;
  }

  get supabaseUrl(): string {
    return environment.supabaseUrl;
  }
}
