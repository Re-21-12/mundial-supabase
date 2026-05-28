import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Provider } from '@supabase/supabase-js';
import { NotificationService } from '../../services/notification-service';
import { environment } from '../../../../environments/environment';

type TurnstileRenderOptions = {
  sitekey: string;
  theme?: 'auto' | 'light' | 'dark';
  size?: 'normal' | 'compact' | 'flexible';
  appearance?: 'always' | 'execute' | 'interaction-only';
  execution?: 'render' | 'execute';
  language?: string;
  callback?: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
};

type TurnstileApi = {
  render: (container: string | HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string | HTMLElement) => void;
  remove: (widgetId?: string | HTMLElement) => void;
  getResponse: (widgetId?: string | HTMLElement) => string;
};

type WindowWithTurnstile = Window & {
  turnstile?: TurnstileApi;
};

let turnstileScriptPromise: Promise<void> | null = null;

export type OAuthProviderOption = {
  id: Provider;
  label: string;
  description: string;
  badge: string;
};

export type AuthOverlayMode = 'login' | 'register' | 'change-password' | 'update-password';

@Component({
  selector: 'app-auth-overlay',
  templateUrl: './auth-overlay.html',
  styleUrl: './auth-overlay.css',
})
export class AuthOverlay implements AfterViewInit, OnDestroy {
  title = input('Acceso seguro');
  subtitle = input('Usa proveedor SSO/OAuth2 o correo para continuar');
  mode = input<AuthOverlayMode>('login');
  modeTitle = input('Ingreso por correo');
  modeDescription = input('Recibiras un enlace seguro para validar tu sesion.');
  providers = input<OAuthProviderOption[]>([]);
  turnstileSiteKey = input(environment.turnstileSiteKey);

  providerSelected = output<Provider>();
  modeSelected = output<AuthOverlayMode>();
  captchaTokenChanged = output<string | null>();

  @ViewChild('turnstileContainer') private readonly turnstileContainer?: ElementRef<HTMLDivElement>;

  readonly turnstileStatus = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');

  private notificationService = inject(NotificationService);
  private turnstileWidgetId: string | null = null;

  async ngAfterViewInit(): Promise<void> {
    await this.ensureTurnstileRendered();
  }

  ngOnDestroy(): void {
    this.destroyTurnstile();
  }

  async ensureTurnstileRendered(): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    if (!this.turnstileSiteKey()) {
      this.turnstileStatus.set('error');
      return;
    }

    this.turnstileStatus.set('loading');
    try {
      await this.loadTurnstileScript();
      this.renderTurnstile();
    } catch {
      this.turnstileStatus.set('error');
      this.captchaTokenChanged.emit(null);
    }
  }

  resetTurnstile(): void {
    const api = this.getTurnstileApi();
    if (!api || !this.turnstileWidgetId) {
      this.captchaTokenChanged.emit(null);
      this.turnstileStatus.set('idle');
      return;
    }

    api.reset(this.turnstileWidgetId);
    this.captchaTokenChanged.emit(null);
    this.turnstileStatus.set('idle');
  }

  onSelectProvider(provider: Provider) {
    const label = this.providers()?.find((p) => p.id === provider)?.label ?? String(provider);
    this.notificationService.notify('info', 'Proveedor seleccionado', `Continuando con ${label}`);
    this.providerSelected.emit(provider);
  }

  onSelectMode(mode: AuthOverlayMode) {
    this.resetTurnstile();
    const modeMap: Record<AuthOverlayMode, string> = {
      login: 'Iniciar sesión',
      register: 'Registro',
      'change-password': 'Cambio de contraseña',
      'update-password': 'Actualizar contraseña',
    };
    this.notificationService.notify('info', 'Modo seleccionado', modeMap[mode] ?? mode);
    this.modeSelected.emit(mode);
  }

  private async loadTurnstileScript(): Promise<void> {
    if (turnstileScriptPromise) {
      return turnstileScriptPromise;
    }

    turnstileScriptPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[data-turnstile-script="true"]',
      );
      if (existingScript) {
        if (this.getTurnstileApi()) {
          resolve();
          return;
        }

        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener(
          'error',
          () => reject(new Error('Turnstile script failed to load')),
          {
            once: true,
          },
        );
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset['turnstileScript'] = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Turnstile script failed to load'));
      document.head.appendChild(script);
    });

    return turnstileScriptPromise;
  }

  private renderTurnstile(): void {
    const container = this.turnstileContainer?.nativeElement;
    const api = this.getTurnstileApi();

    if (!container || !api) {
      this.turnstileStatus.set('error');
      return;
    }

    this.destroyTurnstile();
    this.turnstileWidgetId = api.render(container, {
      sitekey: this.turnstileSiteKey(),
      theme: 'dark',
      size: 'normal',
      appearance: 'always',
      language: 'es',
      callback: (token: string) => {
        this.turnstileStatus.set('ready');
        this.captchaTokenChanged.emit(token);
      },
      'expired-callback': () => {
        this.turnstileStatus.set('idle');
        this.captchaTokenChanged.emit(null);
      },
      'error-callback': () => {
        this.turnstileStatus.set('error');
        this.captchaTokenChanged.emit(null);
      },
    });
    this.turnstileStatus.set('ready');
  }

  private destroyTurnstile(): void {
    const api = this.getTurnstileApi();
    if (api && this.turnstileWidgetId) {
      api.remove(this.turnstileWidgetId);
    }

    this.turnstileWidgetId = null;
  }

  private getTurnstileApi(): TurnstileApi | null {
    return (window as WindowWithTurnstile).turnstile ?? null;
  }
}
