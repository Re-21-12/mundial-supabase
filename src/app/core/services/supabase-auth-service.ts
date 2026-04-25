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
  async profile(userEmail: string) {
    const { data, error } = await this.supabaseService.client
      .from('user_with_auth') // Nombre de la vista que creaste
      .select('*')
      .eq('email', userEmail)
      .single();

    if (error) {
      console.error('Error al obtener perfil:', error);
    }

    return { data, error };
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
  async signInWithOtp(email: string, createUser = true) {
    const { data, error } = await this.supabaseService.client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: environment.redirect_email,
        shouldCreateUser: createUser,
      },
    });
    if (error) throw error;
    return data;
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
  // Traer usuario con permisos desde la vista
  async getUserWithPermissions(userId: string) {
    const { data, error } = await this.supabaseService.client
      .from('USER_ROLE')
      .select('user_id, role_id')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
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

  // supabase-auth.service.ts
  stateAuthChanges() {
    const {
      data: { subscription },
    } = this.supabaseService.client.auth.onAuthStateChange((event, session) => {
      // console.log(`🔔 Evento de Auth: ${event}`);
      // console.log('Sesión actual:', session?.access_token);
      switch (event) {
        case 'INITIAL_SESSION':
          if (session) {
            this.handleSession(session);
          }
          break;

        case 'SIGNED_IN':
          if (session?.provider_token) {
            localStorage.setItem('oauth_provider_token', session.provider_token);
          }
          if (session?.provider_refresh_token) {
            localStorage.setItem('oauth_provider_refresh_token', session.provider_refresh_token);
          }

          this.router.navigate(['/home']);
          break;

        case 'SIGNED_OUT':
          localStorage.removeItem('oauth_provider_token');
          localStorage.removeItem('oauth_provider_refresh_token');
          this.router.navigate(['/login']);
          break;

        case 'PASSWORD_RECOVERY':
          this.router.navigate(['/set-password']);
          break;

        case 'TOKEN_REFRESHED':
          if (session?.provider_token) {
            localStorage.setItem('oauth_provider_token', session.provider_token);
          }
          break;

        case 'USER_UPDATED':
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
