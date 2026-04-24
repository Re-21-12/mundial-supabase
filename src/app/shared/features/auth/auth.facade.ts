import { inject, Injectable, signal, Signal } from '@angular/core';
import { AuthChangeEvent, Provider, Session, User } from '@supabase/supabase-js';
import { jwtDecode } from 'jwt-decode';
import { SupabaseAuthService } from '../../../core/services/supabase-auth-service';
import { IAuthFacade } from './interface/iauth-interface-facade';

type AccessTokenClaims = {
  user_role?: string;
  user_permissions?: string[];
  internal_user_id?: string | number;
};

@Injectable({
  providedIn: 'root',
})
export class AuthFacade implements IAuthFacade {
  private readonly supabaseAuthService = inject(SupabaseAuthService);

  private readonly _session = signal<Session | null>(null);
  private readonly _role = signal<string | null>(null);
  private readonly _permissions = signal<string[]>([]);
  private readonly _internalUserId = signal<string | null>(null);
  private readonly _isLoggedIn = signal(false);
  private readonly _isLoading = signal(false);
  private readonly _currentUser = signal<User | null>(null);

  readonly session: Signal<Session | null> = this._session.asReadonly();
  readonly role: Signal<string | null> = this._role.asReadonly();
  readonly permissions: Signal<string[]> = this._permissions.asReadonly();
  readonly internalUserId: Signal<string | null> = this._internalUserId.asReadonly();
  readonly isLoggedIn: Signal<boolean> = this._isLoggedIn.asReadonly();
  readonly isLoading: Signal<boolean> = this._isLoading.asReadonly();
  readonly currentUser: Signal<User | null> = this._currentUser.asReadonly();

  constructor() {
    this.init();
  }

  private extractClaimsFromSession(session: Session): void {
    const claims = jwtDecode<AccessTokenClaims>(session.access_token);

    this._role.set(claims.user_role ?? null);
    this._permissions.set(
      Array.isArray(claims.user_permissions)
        ? claims.user_permissions.filter((item) => typeof item === 'string')
        : [],
    );
    this._internalUserId.set(
      claims.internal_user_id !== undefined && claims.internal_user_id !== null
        ? String(claims.internal_user_id)
        : null,
    );
  }

  private applySessionState(session: Session | null): void {
    this._session.set(session);
    this._isLoggedIn.set(Boolean(session));
    this._currentUser.set(session?.user ?? null);

    if (session) {
      this.extractClaimsFromSession(session);
      return;
    }

    this._role.set(null);
    this._permissions.set([]);
    this._internalUserId.set(null);
  }

  init(): void {
    this._isLoading.set(true);

    this.supabaseAuthService
      .getSession()
      .then(({ data }) => {
        this.applySessionState(data.session);
      })
      .finally(() => {
        this._isLoading.set(false);
      });

    this.supabaseAuthService.authChanges((_event, session) => {
      this.applySessionState(session);
    });

    this.supabaseAuthService.stateAuthChanges();
  }

  getUserWithPermissions(sessionId: string) {
    return this.supabaseAuthService.getUserWithPermissions(sessionId);
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
    return this.supabaseAuthService.uploadAvatar(filePath, file);
  }
  profile(email: string) {
    return this.supabaseAuthService.profile(email);
  }

  updateProfile(user: User) {
    return this.supabaseAuthService.updateProfile(user);
  }

  authChanges(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return this.supabaseAuthService.authChanges(callback);
  }

  stateAuthChanges() {
    this.supabaseAuthService.stateAuthChanges();
  }

  async singInAnonymously() {
    return this.supabaseAuthService.singInAnonymously();
  }

  async signInWithOtp(email: string, createUser = true) {
    return this.supabaseAuthService.signInWithOtp(email, createUser);
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
