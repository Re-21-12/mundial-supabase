import { inject, Injectable, Signal } from '@angular/core';
import { AuthChangeEvent, Provider, Session, User } from '@supabase/supabase-js';
import { SupabaseAuthService } from '../../../core/services/supabase-auth-service';
import { IAuthFacade } from './interface/iauth-interface-facade';

@Injectable({
  providedIn: 'root',
})
export class AuthFacade implements IAuthFacade {
  private readonly _supabaseAuthService = inject(SupabaseAuthService);

  //#region Public Signals from SupabaseAuthService
  readonly session: Signal<Session | null> = this._supabaseAuthService.session;
  readonly role: Signal<string | null> = this._supabaseAuthService.role;
  readonly permissions: Signal<string[]> = this._supabaseAuthService.permissions;
  readonly internalUserId: Signal<string | null> = this._supabaseAuthService.internalUserId;
  readonly isLoggedIn: Signal<boolean> = this._supabaseAuthService.isLoggedIn;
  readonly isLoading: Signal<boolean> = this._supabaseAuthService.isLoading;
  readonly currentUser: Signal<User | null> = this._supabaseAuthService.currentUser;
  readonly authReady: Signal<boolean> = this._supabaseAuthService.authReady;
  //#endregion

  constructor() {
    this.init();
  }

  private init(): void {
    // SupabaseAuthService handles all state initialization
    this._supabaseAuthService.stateAuthChanges();
  }


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
    return this._supabaseAuthService.uploadAvatar(filePath, file);
  }
  profile(email: string) {
    return this._supabaseAuthService.profile(email);
  }

  updateProfile(user: User) {
    return this._supabaseAuthService.updateProfile(user);
  }

  authChanges(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return this._supabaseAuthService.authChanges(callback);
  }

  stateAuthChanges() {
    this._supabaseAuthService.stateAuthChanges();
  }

  async singInAnonymously(): Promise<{ data: any; error: any }> {
    return this._supabaseAuthService.singInAnonymously();
  }

  async signInWithOtp(email: string, createUser = true) {
    return this._supabaseAuthService.signInWithOtp(email, createUser);
  }

  async signInWithEmail(email: string) {
    return this._supabaseAuthService.signInWithEmail(email);
  }

  async signInWithPassword(email: string, password?: string): Promise<{ data: any; error: any }> {
    return this._supabaseAuthService.signInWithPassword(email, password);
  }

  async signUpWithPassword(email: string, password: string, name?: string): Promise<{ data: any; error: any }> {
    return this._supabaseAuthService.signUpWithPassword(email, password, name);
  }

  async requestPasswordReset(email: string) {
    return this._supabaseAuthService.requestPasswordReset(email);
  }

  async signInWithOAuth(provider: Provider) {
    return this._supabaseAuthService.signInWithOAuth(provider);
  }

  async signOut() {
    return this._supabaseAuthService.signOut();
  }

  async getSession() {
    const { data, error } = await this._supabaseAuthService.getSession();
    if (error) {
      console.error('Error fetching session:', error);
    } else {
      console.log('Session data:', data);
    }
    return { data, error };
  }

  downLoadImage(path: string) {
    return this._supabaseAuthService.downLoadImage(path);
  }

  inviteUser(email: string) {
    return this._supabaseAuthService.inviteUser(email);
  }

  sendMagicLink(email: string) {
    return this._supabaseAuthService.sendMagicLink(email);
  }

  setNewPassword(newPassword: string) {
    return this._supabaseAuthService.setNewPassword(newPassword);
  }

  getInternalUserId(): string | null {
    return this._supabaseAuthService.getInternalUserId();
  }

  getEmail(): string | null {
    return this._supabaseAuthService.getEmail();
  }
}
