import { inject, Injectable } from '@angular/core';
import {
  AuthChangeEvent,
  Provider,
  createClient,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Profile } from '../interfaces/profile-interface';
import { Database } from '../../types/database.types';
import { SupabaseService } from './supabase-service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class SupabaseAuthService {
  supabaseService = inject(SupabaseService);
  router = inject(Router);
  private authSubscription: Subscription | any;
  //#region profiles
  profile(user: User) {
    return this.supabaseService.client.from('USER').select(`id, email `).eq('id', user.id).single();
  }
  updateProfile(user: User) {
    const update = {
      ...user,
      updated_at: new Date().toString(),
    };
    return this.supabaseService.client.from('USER').upsert(update);
  }
  //#endregion

  //#region auth

  authChanges(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return this.supabaseService.client.auth.onAuthStateChange(callback);
  }

  async singInAnonymously() {
    const { data, error } = await this.supabaseService.client.auth.signInAnonymously({
      options: {
        captchaToken: 'github',
      },
    });
  }

  async signInWithEmail(email: string) {
    const { data, error } = await this.supabaseService.client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: environment.redirect_email },
    });
    if (error) {
      console.error('Error sending OTP:', error);
    } else {
      console.log('OTP sent successfully:', data);
    }
  }

  async signInWithPassword(email: string = '', password: string = '') {
    const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
      email: email,
      password: password,
    });
    if (error) {
      console.error('Error sending OTP:', error);
    } else {
      console.log('OTP sent successfully:', data);
    }
  }

  async signUpWithPassword(email: string, password: string) {
    const { data, error } = await this.supabaseService.client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: environment.redirect_email },
    });

    if (error) {
      console.error('Error sign up:', error);
    }

    return { data, error };
  }

  async requestPasswordReset(email: string) {
    const { data, error } = await this.supabaseService.client.auth.resetPasswordForEmail(email, {
      redirectTo: environment.redirect_email,
    });

    if (error) {
      console.error('Error password reset:', error);
    }

    return { data, error };
  }

  async signInWithPhone() {
    const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
      phone: '',
      password: '',
    });
    if (error) {
      console.error('Error sending OTP:', error);
    } else {
      console.log('OTP sent successfully:', data);
    }
  }

  async signInWithOAuth(provider: Provider) {
    const { data, error } = await this.supabaseService.client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: environment.redirect_email,
      },
    });

    if (error) {
      console.error('Error OAuth sign in:', error);
    }

    return { data, error };
  }

  stateAuthChanges() {
    const {
      data: { subscription },
    } = this.supabaseService.client.auth.onAuthStateChange((event, session) => {
      console.log(`🔔 Evento de Auth: ${event}`, session);

      switch (event) {
        case 'INITIAL_SESSION':
          // Útil para saber si el usuario ya estaba logueado al cargar la app
          break;
        case 'SIGNED_IN':
          console.log('Usuario autenticado:', session?.user);
          this.router.navigate(['/home']);
          break;
        case 'SIGNED_OUT':
          console.log('Sesión cerrada correctamente');
          // Si necesitas limpiar algo específico que NO sea de Supabase:
          // localStorage.removeItem('mi_variable_personalizada');
          break;
        case 'PASSWORD_RECOVERY':
          // Aquí podrías abrir un modal para cambiar la contraseña
          break;
        case 'TOKEN_REFRESHED':
          // Silencioso, pero útil para saber que la sesión se extendió
          break;
        case 'USER_UPDATED':
          // Cuando el usuario cambia su email o meta-data
          break;
      }
    });

    this.authSubscription = subscription;
  }

  async signOut() {
    return this.supabaseService.client.auth.signOut();
  }
  getSession() {
    return this.supabaseService.client.auth.getSession();
  }
  //#endregion

  //#region utils
  async downLoadImage(path: string) {
    return this.supabaseService.client.storage.from('avatars').download(path);
  }
  async uploadAvatar(filePath: string, file: File) {
    return this.supabaseService.client.storage.from('avatars').upload(filePath, file);
  }
  //#endregion

  private async handleSession(session: any) {
    const metadata = session.user.user_metadata;

    // Si es primera vez (no tiene password seteado)
    if (metadata?.['force_password_change']) {
      this.router.navigate(['/set-password']);
    } else {
      this.router.navigate(['/home']);
    }
  }
  async inviteUser(email: string) {
    const { data, error } = await this.supabaseService.client.auth.admin.inviteUserByEmail(email, {
      data: {
        role: 'cliente',
        force_password_change: true,
      },
    });
    return { data, error };
  }
  async sendMagicLink(email: string) {
    const { error } = await this.supabaseService.client.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, // ← NO crea usuario nuevo, solo válida existente
      },
    });
    return { error };
  }
  async setNewPassword(newPassword: string) {
    const { data, error } = await this.supabaseService.client.auth.updateUser({
      password: newPassword,
      data: { force_password_change: false }, // ya no es primera vez
    });

    if (!error) {
      this.router.navigate(['/dashboard']);
    }

    return { data, error };
  }
  get client() {
    return this.supabaseService.client;
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
}
