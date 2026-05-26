import { Component, input, output, inject } from '@angular/core';
import { Provider } from '@supabase/supabase-js';
import { NotificationService } from '../../services/notification-service';

export type OAuthProviderOption = {
  id: Provider;
  label: string;
  description: string;
};

export type AuthOverlayMode = 'login' | 'register' | 'change-password' | 'update-password';

@Component({
  selector: 'app-auth-overlay',
  templateUrl: './auth-overlay.html',
  styleUrl: './auth-overlay.css',
})
export class AuthOverlay {
  title = input('Acceso seguro');
  subtitle = input('Usa proveedor SSO/OAuth2 o correo para continuar');
  mode = input<AuthOverlayMode>('login');
  modeTitle = input('Ingreso por correo');
  modeDescription = input('Recibiras un enlace seguro para validar tu sesion.');
  providers = input<OAuthProviderOption[]>([]);

  providerSelected = output<Provider>();
  modeSelected = output<AuthOverlayMode>();
  private notificationService = inject(NotificationService);

  onSelectProvider(provider: Provider) {
    const label = this.providers()?.find((p) => p.id === provider)?.label ?? String(provider);
    this.notificationService.notify('info', 'Proveedor seleccionado', `Continuando con ${label}`);
    this.providerSelected.emit(provider);
  }

  onSelectMode(mode: AuthOverlayMode) {
    const modeMap: Record<AuthOverlayMode, string> = {
      login: 'Iniciar sesión',
      register: 'Registro',
      'change-password': 'Cambio de contraseña',
      'update-password': 'Actualizar contraseña',
    };
    this.notificationService.notify('info', 'Modo seleccionado', modeMap[mode] ?? mode);
    this.modeSelected.emit(mode);
  }
}
