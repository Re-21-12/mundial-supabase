import { Component, ViewChild, inject, OnInit, signal } from '@angular/core';
import { formFields } from '../dynamic-form/utils/forms';
import { DynamicForm } from '../dynamic-form/dynamic-form';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AuthOverlay,
  AuthOverlayMode,
  OAuthProviderOption,
} from '../../layouts/auth-overlay/auth-overlay';
import { AuthFacade } from './auth.facade';
import { getPasswordUpdateErrorMessage } from './auth-error.util';
import { Provider } from '@supabase/supabase-js';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-auth',
  imports: [DynamicForm, AuthOverlay],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class Auth implements OnInit {
  private readonly authFacade = inject(AuthFacade);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  @ViewChild(AuthOverlay) private readonly authOverlay?: AuthOverlay;

  id = signal<string | null>(null);
  signInMode = signal<string | null>(null);
  mode = signal<AuthOverlayMode>('register');
  registrationSuccess = signal(false);
  registrationError = signal<string | null>(null);
  authError = signal<string | null>(null);
  confirmationLinkExpired = signal(false);
  resendEmail = signal<string | null>(null);
  resendInProgress = signal(false);
  resendSuccess = signal(false);
  captchaToken = signal<string | null>(null);
  changePasswordSuccess = signal(false);
  passwordUpdatedBanner = signal(false);
  readonly turnstileSiteKey = environment.turnstileSiteKey;

  ngOnInit() {
    this.setId();
    this.getModeSignIn();
    this.syncModeFromQueryParams();
    this.checkCallbackError();
    this._saveReturnUrl();
    this._checkPasswordUpdatedState();
  }

  private _checkPasswordUpdatedState() {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state ?? history.state;
    if (state?.['passwordUpdated']) {
      this.passwordUpdatedBanner.set(true);
    }
  }

  private _saveReturnUrl() {
    const returnUrl = this.activatedRoute.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl && returnUrl.startsWith('/')) {
      sessionStorage.setItem('pending_return_url', returnUrl);
    }
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

  private checkCallbackError() {
    const error = this.activatedRoute.snapshot.queryParamMap.get('error');
    const description = this.activatedRoute.snapshot.queryParamMap.get('error_description') ?? '';
    if (error === 'access_denied' && description.toLowerCase().includes('invalid or has expired')) {
      this.confirmationLinkExpired.set(true);
      const savedEmail = sessionStorage.getItem('pending_confirmation_email');
      if (savedEmail) this.resendEmail.set(savedEmail);
    }
  }

  async resendConfirmationEmail() {
    const email = this.resendEmail();
    if (!email) return;
    const captchaToken = this.captchaToken();
    this.resendInProgress.set(true);
    const { error } = await this.authFacade.resendConfirmation(email, captchaToken ?? undefined);
    this.resendInProgress.set(false);
    if (!error) {
      this.resendSuccess.set(true);
      sessionStorage.removeItem('pending_confirmation_email');
      this.resetCaptcha();
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

    // Primary: use the token stored by the callback signal.
    // Fallback: read directly from the widget in case the callback fired outside
    // Angular's context or raced with component initialization.
    let captchaToken = this.captchaToken();
    if (!captchaToken) {
      const widgetToken = this.authOverlay?.getCurrentToken() ?? null;
      if (widgetToken) {
        this.captchaToken.set(widgetToken);
        captchaToken = widgetToken;
      }
    }

    this.authError.set(null);

    if (!captchaToken) {
      this.authError.set('Completa la verificacion de seguridad para continuar.');
      return;
    }

    switch (this.mode()) {
      case 'login':
        if (!email) {
          return;
        }
        if (password) {
          const { error } = await this.authFacade.signInWithPassword(email, password, captchaToken);
          if (error) {
            this.authError.set((error as any)?.message ?? 'No se pudo iniciar sesión.');
          }
          this.resetCaptcha();
          return;
        }
        {
          const { error } = await this.authFacade.signInWithEmail(email, captchaToken);
          if (error) {
            this.authError.set((error as any)?.message ?? 'No se pudo enviar el enlace de acceso.');
          }
          this.resetCaptcha();
        }
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
        const { data, error } = await this.authFacade.signUpWithPassword(
          email,
          password,
          name,
          captchaToken,
        );
        if (error) {
          this.registrationError.set(
            (error as any)?.message ?? 'Error al registrar. Intenta de nuevo.',
          );
        } else if (!data?.user?.identities?.length) {
          // Supabase returns 200 with empty identities when the email is already registered
          // (user_repeated_signup) — no confirmation email is sent in this case.
          this.registrationError.set(
            'Este correo ya está registrado. Inicia sesión o recupera tu contraseña.',
          );
        } else {
          // Save email so we can resend confirmation if the link expires or gets scanned
          sessionStorage.setItem('pending_confirmation_email', email);
          this.registrationSuccess.set(true);
        }
        this.resetCaptcha();
        return;
      }
      case 'change-password':
        if (!email) {
          return;
        }
        {
          await this.authFacade.requestPasswordReset(email, captchaToken);
          this.changePasswordSuccess.set(true);
          this.resetCaptcha();
        }
        return;
      case 'update-password':
        if (!newPassword) {
          return;
        }
        {
          const { error } = await this.authFacade.setNewPassword(newPassword);

          if (error) {
            this.authError.set(
              getPasswordUpdateErrorMessage(
                error,
                'No se pudo actualizar la password. Intenta nuevamente.',
              ),
            );
            this.resetCaptcha();
            return;
          }

          await this.authFacade.signOut();
          this.passwordUpdatedBanner.set(true);
          this.mode.set('login');
        }
        this.resetCaptcha();
        return;
    }
  };

  onModeSelected(mode: AuthOverlayMode) {
    this.mode.set(mode);
    this.changePasswordSuccess.set(false);
    this.passwordUpdatedBanner.set(false);
  }

  get modeTitle(): string {
    const titles: Record<AuthOverlayMode, string> = {
      login: 'Inicia sesión',
      register: 'Crea tu cuenta',
      'change-password': 'Olvidé mi contraseña',
      'update-password': 'Nueva contraseña',
    };

    return titles[this.mode()];
  }

  get modeDescription(): string {
    const descriptions: Record<AuthOverlayMode, string> = {
      login: 'Ingresa con tu correo y contraseña o usa SSO.',
      register: 'Completa el formulario para unirte a la plataforma.',
      'change-password': 'Te enviaremos un enlace para recuperar el acceso a tu cuenta.',
      'update-password': 'Ingresa tu nueva contraseña para actualizar tu acceso.',
    };

    return descriptions[this.mode()];
  }

  async onOAuthProviderSelected(provider: Provider) {
    let captchaToken = this.captchaToken();
    if (!captchaToken) {
      const widgetToken = this.authOverlay?.getCurrentToken() ?? null;
      if (widgetToken) {
        this.captchaToken.set(widgetToken);
        captchaToken = widgetToken;
      }
    }

    if (!captchaToken) {
      this.authError.set('Completa la verificacion de seguridad para continuar.');
      return;
    }

    const { error } = await this.authFacade.signInWithOAuth(provider, captchaToken);
    if (error) {
      this.authError.set(
        (error as any)?.message ?? 'No se pudo continuar con el proveedor seleccionado.',
      );
    }

    this.resetCaptcha();
  }

  onCaptchaTokenChanged(token: string | null) {
    this.captchaToken.set(token);
  }

  private resetCaptcha() {
    this.captchaToken.set(null);
    this.authOverlay?.resetTurnstile();
  }
  /* Aqui le manda los providers */
  oauthProviders: OAuthProviderOption[] = [
    {
      id: 'google',
      label: 'Google',
      description: 'SSO empresarial y cuentas personales',
      badge: 'G',
    },
    {
      id: 'github',
      label: 'GitHub',
      description: 'Ideal para equipos tecnicos',
      badge: 'GH',
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
