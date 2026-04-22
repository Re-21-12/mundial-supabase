// auth.facade.interface.ts
import { Signal } from '@angular/core';
import { AuthChangeEvent, AuthUser, Provider, Session, User } from '@supabase/supabase-js';

export interface IAuthFacade {
  // Estado
  readonly isLoggedIn: Signal<boolean>;
  readonly isLoading: Signal<boolean>;
  readonly currentUser: Signal<AuthUser | null>;

  // Acciones
  profile(user: User): any;
  updateProfile(user: User): any;
  authChanges(callback: (event: AuthChangeEvent, session: Session | null) => void): any;
  singInAnonymously(): Promise<void>;
  signInWithEmail(email: string): Promise<void>;
  signInWithPassword(email: string, password?: string): Promise<void>;
  signUpWithPassword(email: string, password: string): Promise<{ data: any; error: any }>;
  requestPasswordReset(email: string): Promise<{ data: any; error: any }>;
  signInWithOAuth(provider: Provider): Promise<{ data: any; error: any }>;
  signOut(): Promise<any>;
  getSession(): Promise<any>;
  downLoadImage(path: string): Promise<{ data: Blob | null; error: Error | null }>;
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
  }>;
  inviteUser(email: string): Promise<{ data: any; error: any }>;
  sendMagicLink(email: string): Promise<{ error: any }>;
  setNewPassword(newPassword: string): Promise<{ data: any; error: any }>;
}
