import { Component, inject, OnInit, signal } from '@angular/core';
import { formFields } from '../dynamic-form/utils/forms';
import { DynamicForm } from '../dynamic-form/dynamic-form';
import { ActivatedRoute } from '@angular/router';
import {
  AuthOverlay,
  AuthOverlayMode,
  OAuthProviderOption,
} from '../../layouts/auth-overlay/auth-overlay';
import { AuthFacade } from './auth.facade';
import { Provider } from '@supabase/supabase-js';

@Component({
  selector: 'app-auth',
  imports: [DynamicForm, AuthOverlay],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class Auth implements OnInit {
  private readonly authFacade = inject(AuthFacade);
  private readonly activatedRoute = inject(ActivatedRoute);

  id = signal<string | null>(null);
  signInMode = signal<string | null>(null);
  mode = signal<AuthOverlayMode>('login');
  registrationSuccess = signal(false);
  registrationError = signal<string | null>(null);

  ngOnInit() {
    this.setId();
    this.getModeSignIn();
    this.syncModeFromQueryParams();
  }

  private syncModeFromQueryParams() {
    const mode = this.activatedRoute.snapshot.queryParamMap.get('mode');
    const validModes: AuthOverlayMode[] = [
      'login',
      'register',
      'change-password',
      'update-password',
    ];

    if (mode && validModes.includes(mode as AuthOverlayMode)) {
      this.mode.set(mode as AuthOverlayMode);
    }
  }

  setId() {
    const id = this.activatedRoute.snapshot.params['id'];
    this.id.set(id);
  }
  getModeSignIn() {
    if (!!this.id()) this.signInMode.set('otp');
    else this.signInMode.set('password');
  }
  /*  URL Configuration page */
  submitData = async ($event: string) => {
    const parsedData = JSON.parse($event);
    const email = parsedData.email as string | undefined;
    const password = parsedData.password as string | undefined;
    const newPassword = parsedData.newPassword as string | undefined;

    switch (this.mode()) {
      case 'login':
        if (!email) {
          return;
        }
        if (password) {
          this.authFacade.signInWithPassword(email, password);
          return;
        }
        this.authFacade.signInWithEmail(email);
        return;
      case 'register': {
        const name = parsedData.name as string | undefined;
        const confirmPassword = parsedData.confirmPassword as string | undefined;
        if (!email || !password || !name) return;
        if (password !== confirmPassword) {
          this.registrationError.set('Las contraseñas no coinciden.');
          return;
        }
        this.registrationError.set(null);
        const { error } = await this.authFacade.signUpWithPassword(email, password, name);
        if (error) {
          this.registrationError.set((error as any)?.message ?? 'Error al registrar. Intenta de nuevo.');
        } else {
          this.registrationSuccess.set(true);
        }
        return;
      }
      case 'change-password':
        if (!email) {
          return;
        }
        this.authFacade.requestPasswordReset(email);
        return;
      case 'update-password':
        if (!newPassword) {
          return;
        }
        this.authFacade.setNewPassword(newPassword);
        return;
    }
  };

  onModeSelected(mode: AuthOverlayMode) {
    this.mode.set(mode);
  }

  get modeTitle(): string {
    const titles: Record<AuthOverlayMode, string> = {
      login: 'Inicia sesion',
      register: 'Registra tu cuenta',
      'change-password': 'Recupera tu password',
      'update-password': 'Define una nueva password',
    };

    return titles[this.mode()];
  }

  get modeDescription(): string {
    const descriptions: Record<AuthOverlayMode, string> = {
      login: 'Ingresa con tu correo y contraseña o usa SSO.',
      register: 'Crea tu cuenta nueva con correo y contraseña.',
      'change-password': 'Te enviaremos un enlace para cambiar la contraseña.',
      'update-password': 'Ingresa tu nueva contraseña para actualizar tu acceso.',
    };

    return descriptions[this.mode()];
  }

  onOAuthProviderSelected(provider: Provider) {
    this.authFacade.signInWithOAuth(provider);
  }
  /* Aqui le manda los providers */
  oauthProviders: OAuthProviderOption[] = [
    {
      id: 'google',
      label: 'Google',
      description: 'SSO empresarial y cuentas personales',
    },
    {
      id: 'github',
      label: 'GitHub',
      description: 'Ideal para equipos tecnicos',
    },
    /*     {
      id: 'azure',
      label: 'Microsoft Entra ID',
      description: 'OAuth2 corporativo para organizaciones',
    }, */
  ];

  get fields() {
    const map: Record<
      AuthOverlayMode,
      'loginForm' | 'registerForm' | 'changePasswordForm' | 'updatePasswordForm'
    > = {
      login: 'loginForm',
      register: 'registerForm',
      'change-password': 'changePasswordForm',
      'update-password': 'updatePasswordForm',
    };

    return formFields[map[this.mode()]].fields;
  }
}
