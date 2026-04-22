import { inject, Injectable, signal, Signal } from '@angular/core';
import { AuthChangeEvent, Provider, Session, User } from '@supabase/supabase-js';
import { SupabaseAuthService } from '../../../core/services/supabase-auth-service';
import { IAuthFacade } from './interface/iauth-interface-facade';

@Injectable({
  providedIn: 'root',
})
export class AuthFacade implements IAuthFacade {
  isLoggedIn: Signal<boolean> = signal(false);
  isLoading: Signal<boolean> = signal(false);
  currentUser: Signal<User | null> = signal(null);

  uploadAvatar(
    filePath: string,
    file: File,
  ): Promise<{
    data: {
      id: string;
      path: string;
      fullPath: string;
    } | null;
    error: unknown;
  }> {
    return this.supabaseAuthService.uploadAvatar(filePath, file);
  }
  private supabaseAuthService = inject(SupabaseAuthService);

  profile(user: User) {
    return this.supabaseAuthService.profile(user);
  }

  updateProfile(user: User) {
    return this.supabaseAuthService.updateProfile(user);
  }

  authChanges(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return this.supabaseAuthService.authChanges(callback);
  }

  async singInAnonymously() {
    return this.supabaseAuthService.singInAnonymously();
  }

  async signInWithEmail(email: string) {
    return this.supabaseAuthService.signInWithEmail(email);
  }

  async signInWithPassword(email: string, password?: string) {
    return this.supabaseAuthService.signInWithPassword(email, password);
  }

  async signUpWithPassword(email: string, password: string) {
    return this.supabaseAuthService.signUpWithPassword(email, password);
  }

  async requestPasswordReset(email: string) {
    return this.supabaseAuthService.requestPasswordReset(email);
  }

  async signInWithOAuth(provider: Provider) {
    return this.supabaseAuthService.signInWithOAuth(provider);
  }

  async signOut() {
    return this.supabaseAuthService.signOut();
  }

  getSession() {
    return this.supabaseAuthService.getSession();
  }

  downLoadImage(path: string) {
    return this.supabaseAuthService.downLoadImage(path);
  }

  inviteUser(email: string) {
    return this.supabaseAuthService.inviteUser(email);
  }

  sendMagicLink(email: string) {
    return this.supabaseAuthService.sendMagicLink(email);
  }

  setNewPassword(newPassword: string) {
    return this.supabaseAuthService.setNewPassword(newPassword);
  }
}
