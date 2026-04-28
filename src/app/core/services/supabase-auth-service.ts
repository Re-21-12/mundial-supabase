import { inject, Injectable, Injector, signal, Signal } from '@angular/core';
import { AuthChangeEvent, Provider, Session, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Database } from '../../types/database.types';
import { SupabaseService } from './supabase-service';
import { DynamicService } from './dynamic-service';
import { UserAgentService } from './user-agent-service';
import { Router } from '@angular/router';
import { AuthFacade } from '../../shared/features/auth/auth.facade';
import { jwtDecode } from 'jwt-decode';
import { v4 as uuidv4 } from 'uuid';

export type AccessTokenClaims = {
  user_role?: string;
  user_permissions?: string[];
  internal_user_id?: string | number;
};

type ApiResult<T> = Promise<{ data: T | null; error: unknown | null }>;

// Helper to normalize results from Supabase client calls and catch unexpected exceptions
async function _normalize<T>(
  promise: Promise<any>,
): Promise<{ data: T | null; error: unknown | null }> {
  try {
    const res = await promise;
    const data = res?.data ?? null;
    const error = res?.error ?? null;
    return { data: data as T | null, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

@Injectable({
  providedIn: 'root',
})
export class SupabaseAuthService {
  //#region Dependencies
  private readonly _supabaseService = inject(SupabaseService);
  private readonly _router = inject(Router);
  private readonly _dynamicService = inject(DynamicService);
  private readonly _userAgentService = inject(UserAgentService);
  private readonly _injector = inject(Injector);
  //#endregion

  //#region Signals - Single Source of Truth
  readonly session = signal<Session | null>(null);
  readonly role = signal<string | null>(null);
  readonly permissions = signal<string[]>([]);
  readonly internalUserId = signal<string | null>(null);
  readonly isLoggedIn = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly currentUser = signal<User | null>(null);
  readonly authReady = signal<boolean>(false); // Marks when initial auth is resolved
  //#endregion

  private authSubscription: { unsubscribe: () => void } | null = null;
  private authReadyPromise!: Promise<void>;
  private authReadyResolve!: () => void;

  constructor() {
    // Initialize readiness promise
    this.authReadyPromise = new Promise((resolve) => {
      this.authReadyResolve = resolve;
    });
  }

  /**
   * Wait for initial auth to resolve.
   * Guards and resolvers should call this before proceeding.
   */
  async waitForAuthReady(): Promise<void> {
    if (this.authReady()) return; // Already ready
    await this.authReadyPromise;
  }

  //#region Profile Management
  async profile(userEmail: string) {
    const { data, error } = await this._supabaseService.client
      .from('user_with_auth')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (error) {
      console.error('Error obtaining profile:', error);
    }

    return { data, error };
  }

    async getUser() {
    const { data, error } = await this._supabaseService.client.auth.getUser();
    return { data, error };
  }

  updateProfile(user: User) {
    const update = {
      ...user,
      updated_at: new Date().toString(),
    };
    return this._supabaseService.client.from('USER').upsert(update);
  }
  //#endregion

  //#region Authentication State Changes
  authChanges(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return this._supabaseService.client.auth.onAuthStateChange(callback);
  }

  stateAuthChanges() {
    const {
      data: { subscription },
    } = this._supabaseService.client.auth.onAuthStateChange(async (event, session) => {
      await this._handleAuthStateChange(event, session);
    });

    this.authSubscription = subscription;
  }

  private async _handleAuthStateChange(event: AuthChangeEvent, session: Session | null) {
    console.log(`[Auth] Event: ${event}, has session: ${!!session}`);

    switch (event) {
      case 'INITIAL_SESSION':
        console.log('[Auth] INITIAL_SESSION - initializing state');
        if (session) {
          this._applySessionState(session);
          await this._handleSessionMetadata(session);
        } else {
          this._clearSessionState();
        }
        // Mark auth as ready after initial session resolution
        this.authReady.set(true);
        this.authReadyResolve();
        break;

      case 'SIGNED_IN':
        if (session) {
          console.log('[Auth] SIGNED_IN - updating state');
          this._applySessionState(session);
          this._storeOAuthTokens(session);
          await this.logSessionStart();
          this._router.navigate(['/home']);
        }
        break;

      case 'SIGNED_OUT':
        console.log('[Auth] SIGNED_OUT - clearing state');
        this._clearSessionState();
        this._clearOAuthTokens();
        this._router.navigate(['/login']);
        await this.logSessionEnd();
        break;

      case 'PASSWORD_RECOVERY':
        console.log('[Auth] PASSWORD_RECOVERY');
        this._router.navigate(['/set-password']);
        break;

      case 'TOKEN_REFRESHED':
        if (session?.provider_token) {
          console.log('[Auth] TOKEN_REFRESHED');
          localStorage.setItem('oauth_provider_token', session.provider_token);
        }
        break;

      case 'USER_UPDATED':
        if (session) {
          console.log('[Auth] USER_UPDATED - syncing state');
          this._applySessionState(session);
        }
        break;
    }
  }

  private _applySessionState(session: Session | null): void {
    if (!session) {
      this._clearSessionState();
      return;
    }

    this.session.set(session);
    this.isLoggedIn.set(true);
    this.currentUser.set(session.user);

    this._extractClaimsFromSession(session);
    console.log(`[Auth] Session applied for user: ${session.user?.email}`);
  }

  private _clearSessionState(): void {
    this.session.set(null);
    this.isLoggedIn.set(false);
    this.currentUser.set(null);
    this.role.set(null);
    this.permissions.set([]);
    this.internalUserId.set(null);
    console.log('[Auth] Session cleared');
  }

  private _extractClaimsFromSession(session: Session): void {
    try {
      const claims = jwtDecode<AccessTokenClaims>(session.access_token);

      this.role.set(claims.user_role ?? null);
      this.permissions.set(
        Array.isArray(claims.user_permissions)
          ? claims.user_permissions.filter((item) => typeof item === 'string')
          : [],
      );
      this.internalUserId.set(
        claims.internal_user_id !== undefined && claims.internal_user_id !== null
          ? String(claims.internal_user_id)
          : null,
      );
      console.log(
        `[Auth] Claims extracted - role: ${claims.user_role}, permissions: ${claims.user_permissions?.length ?? 0}`,
      );
    } catch (error) {
      console.error('[Auth] Error extracting claims:', error);
    }
  }

  private async _handleSessionMetadata(session: Session): Promise<void> {
    const metadata = session.user.user_metadata;

    if (metadata?.['force_password_change']) {
      this._router.navigate(['/set-password']);
    } else {
      this._router.navigate(['/home']);
    }
  }

  private _storeOAuthTokens(session: Session): void {
    if (session?.provider_token) {
      localStorage.setItem('oauth_provider_token', session.provider_token);
    }
    if (session?.provider_refresh_token) {
      localStorage.setItem('oauth_provider_refresh_token', session.provider_refresh_token);
    }
  }

  private _clearOAuthTokens(): void {
    localStorage.removeItem('oauth_provider_token');
    localStorage.removeItem('oauth_provider_refresh_token');
  }
  //#endregion

  //#region Sign In Methods
  async singInAnonymously(): Promise<{ data: any; error: any }> {
    const { data, error } = await this._supabaseService.client.auth.signInAnonymously({
      options: {
        captchaToken: 'github',
      },
    });
    return { data, error };
  }

  async signInWithOtp(email: string, createUser = true) {
    const { data, error } = await this._supabaseService.client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: environment.authRedirect,
        shouldCreateUser: createUser,
      },
    });
    if (error) throw error;
    return data;
  }

  async signInWithEmail(email: string) {
    const { data, error } = await this._supabaseService.client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: environment.authRedirect },
    });
    if (error) {
      console.error('Error sending OTP:', error);
    }
    return { data, error };
  }

  async signInWithPassword(email: string = '', password: string = '') {
    const { data, error } = await this._supabaseService.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error('Error signing in:', error);
    }
    return { data, error };
  }

  async signInWithOAuth(provider: Provider) {
    const { data, error } = await this._supabaseService.client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: environment.authRedirect,
      },
    });

    if (error) {
      console.error('Error OAuth sign in:', error);
    }

    return { data, error };
  }
  //#endregion

  //#region Sign Up & Password Reset
  async signUpWithPassword(email: string, password: string) {
    const { data, error } = await this._supabaseService.client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: environment.authRedirect },
    });

    if (error) {
      console.error('Error sign up:', error);
    }

    return { data, error };
  }

  async requestPasswordReset(email: string) {
    const { data, error } = await this._supabaseService.client.auth.resetPasswordForEmail(email, {
      redirectTo: environment.authRedirect,
    });

    if (error) {
      console.error('Error password reset:', error);
    }

    return { data, error };
  }

  async setNewPassword(newPassword: string) {
    const { data, error } = await this._supabaseService.client.auth.updateUser({
      password: newPassword,
      data: { force_password_change: false },
    });

    if (!error) {
      this._router.navigate(['/dashboard']);
    }

    return { data, error };
  }
  //#endregion

  //#region Sign Out & Session
  async signOut() {
    try {
      await this.logSessionEnd();
      await this._supabaseService.client.auth.signOut();
    } catch (err) {
      console.error('[Auth] signOut error:', err);
    }
  }

  /**
   * Get current session from cache (single source of truth).
   * Wait for authReady first if this is the first call.
   */
  async getSession() {
    // Return cached session (single source of truth)
    const session = this.session();
    console.log('[Auth] getSession called - returning cached session');
    return {
      data: { session },
      error: null,
    };
  }

  /**
   * Refresh session from Supabase (e.g., for token refresh or manual refresh).
   * Use this sparingly; prefer getSession() for most cases.
   */
  async refreshSession(): Promise<{ data: { session: Session | null }; error: unknown | null }> {
    try {
      console.log('[Auth] Refreshing session from Supabase');
      const { data, error } = await this._supabaseService.client.auth.getSession();
      if (error) {
        console.error('[Auth] Error refreshing session:', error);
        return { data: { session: null }, error };
      }
      if (data?.session) {
        this._applySessionState(data.session);
      } else {
        this._clearSessionState();
      }
      console.log('[Auth] Session refreshed successfully');
      return { data: { session: data?.session ?? null }, error: null };
    } catch (err) {
      console.error('[Auth] Exception refreshing session:', err);
      return { data: { session: null }, error: err };
    }
  }
  //#endregion

  //#region User Management
  async inviteUser(email: string) {
    const { data, error } = await this._supabaseService.client.auth.admin.inviteUserByEmail(email, {
      data: {
        role: 'cliente',
        force_password_change: true,
      },
    });
    return { data, error };
  }

  async sendMagicLink(email: string) {
    const { error } = await this._supabaseService.client.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });
    return { error };
  }
  //#endregion

  //#region Storage Operations
  async downLoadImage(path: string) {
    return this._supabaseService.client.storage.from('avatars').download(path);
  }

  async uploadAvatar(filePath: string, file: File) {
    return this._supabaseService.client.storage.from('avatars').upload(filePath, file);
  }
  //#endregion

  //#region Session Logging
  async logSessionStart() {
    try {
      const ip = await this._userAgentService.getIpAddress();
      const userAgent = this._userAgentService.getUserAgent();
      const authFacade = this._injector.get(AuthFacade);
      const internalUserId = Number(authFacade.getInternalUserId());
      const email = authFacade.getEmail();

      if (!internalUserId) {
        console.warn('[Auth] No internal user ID available. Session will not be logged.');
        return;
      }
      const userSessionData: Partial<Database['public']['Tables']['USER_SESSION']['Insert']> = {
        user_id: internalUserId,
        ip_address: ip,
        user_agent: userAgent,
        sign_in: new Date().toISOString(),
        sign_out: null,
        login: email ?? undefined,
        session_id: uuidv4(),
      };

      await this._insertSessionData(userSessionData);
    } catch (error) {
      console.error('[Auth] Error logging session start:', error);
    }
  }

  async logSessionEnd() {
    try {
      const ip = await this._userAgentService.getIpAddress();
      const userAgent = this._userAgentService.getUserAgent();
      const authFacade = this._injector.get(AuthFacade);
      const internalUserId = Number(authFacade.getInternalUserId());

      if (!internalUserId) {
        console.warn('[Auth] No internal user ID available. Session end will not be logged.');
        return;
      }

      const sessionData: Partial<Database['public']['Tables']['USER_SESSION']['Insert']> = {
        user_id: internalUserId,
        ip_address: ip,
        user_agent: userAgent,
        sign_in: null,
        sign_out: new Date().toISOString(),
        session_id: uuidv4(),
      };

      await this._insertSessionData(sessionData);
    } catch (error) {
      console.error('[Auth] Error logging session end:', error);
    }
  }

  private async _insertSessionData(
    data: Partial<Database['public']['Tables']['USER_SESSION']['Insert']>,
  ) {
    const response = await this._dynamicService.insertData('USER_SESSION', data);
    return response;
  }
  //#endregion

  //#region Accessors
  get client() {
    return this._supabaseService.client;
  }

  getInternalUserId(): string | null {
    return this.internalUserId();
  }

  getEmail(): string | null {
    return this.currentUser()?.email ?? null;
  }
  //#endregion

  //#region Lifecycle
  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
  //#endregion
}
