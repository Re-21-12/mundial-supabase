// auth.facade.interface.ts
import { Signal } from '@angular/core';
import { AuthChangeEvent, Provider, Session, User } from '@supabase/supabase-js';

export interface IAuthFacade {
  // Estado
  readonly session: Signal<Session | null>;
  readonly role: Signal<string | null>;
  readonly permissions: Signal<string[]>;
  readonly internalUserId: Signal<string | null>;
  readonly isLoggedIn: Signal<boolean>;
  readonly isLoading: Signal<boolean>;
  readonly currentUser: Signal<User | null>;
  readonly authReady: Signal<boolean>;

  // Acciones
  profile(email: string): Promise<{ data: any; error: any }>;
  updateProfile(user: User): any;
  authChanges(callback: (event: AuthChangeEvent, session: Session | null) => void): any;
  stateAuthChanges(): void;
  singInAnonymously(): Promise<{ data: any; error: any }>;
  signInWithOtp(email: string, createUser?: boolean): Promise<any>;
  signInWithEmail(email: string): Promise<{ data: any; error: any }>;
  signInWithPassword(email: string, password?: string): Promise<{ data: any; error: any }>;
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
  getInternalUserId(): string | null;
  getEmail(): string | null;
}
