import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
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
  private readonly router = inject(Router);

  private isSessionDebugEnabled(): boolean {
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

  private logFetchDebug(stage: string, extra: Record<string, unknown> = {}): void {
    if (!this.isSessionDebugEnabled()) {
      return;
    }

    console.log('[AuthDebug][SupabaseFetch]', {
      ts: new Date().toISOString(),
      stage,
      ...extra,
    });
  }

  private getAuthHeaderSuffix(init?: RequestInit): string | null {
    const headers = init?.headers;
    if (!headers) return null;

    let authHeader: string | null = null;

    if (headers instanceof Headers) {
      authHeader = headers.get('Authorization');
    } else if (Array.isArray(headers)) {
      const found = headers.find(([key]) => key.toLowerCase() === 'authorization');
      authHeader = found?.[1] ?? null;
    } else {
      const objectHeaders = headers as Record<string, string>;
      authHeader = objectHeaders['Authorization'] ?? objectHeaders['authorization'] ?? null;
    }

    if (!authHeader) return null;
    return authHeader.slice(-10);
  }

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      global: {
        fetch: async (input, init) => {
          // Internal Supabase requests (auth token refresh, realtime handshakes) must
          // NOT trigger the loading overlay — they run silently in the background and
          // can hang during network hiccups, which would freeze the entire UI.
          const url = typeof input === 'string' ? input : ((input as Request).url ?? '');
          const isInternal =
            url.includes('/auth/v1/') ||
            url.includes('/realtime/v1/') ||
            url.includes('/rest/v1/ERROR_LOG') ||
            url.includes('/rest/v1/ERROR_CATALOG');
          const method = init?.method ?? 'GET';
          const authHeaderSuffix = this.getAuthHeaderSuffix(init);

          this.logFetchDebug('request:start', {
            method,
            url,
            isInternal,
            hasAuthHeader: Boolean(authHeaderSuffix),
            authHeaderSuffix,
          });

          if (!isInternal) this.loadingService.start();
          try {
            const response = await fetch(input, init);

            this.logFetchDebug('request:response', {
              method,
              url,
              isInternal,
              status: response.status,
              ok: response.ok,
            });

            if (!response.ok && !isInternal && this.shouldNotify(response.status)) {
              this.notificationService.notify(
                'error',
                'Atención',
                this.getMessageByStatus(response.status),
              );
              if (response.status === 401) {
                this.logFetchDebug('request:401-redirect', {
                  method,
                  url,
                  currentRoute: this.router.url,
                });
                void this.router.navigate(['/auth']);
              }
            }

            return response;
          } catch (error) {
            this.logFetchDebug('request:error', {
              method,
              url,
              isInternal,
              error: error instanceof Error ? error.message : String(error),
            });
            if (!isInternal) {
              this.notificationService.notify(
                'error',
                'Atención',
                'No hay conexión a internet o el servidor está caído.',
              );
            }
            throw error;
          } finally {
            if (!isInternal) this.loadingService.stop();
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
