import { Component, input, output } from '@angular/core';
import { Provider } from '@supabase/supabase-js';

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

  onSelectProvider(provider: Provider) {
    this.providerSelected.emit(provider);
  }

  onSelectMode(mode: AuthOverlayMode) {
    this.modeSelected.emit(mode);
  }
}
