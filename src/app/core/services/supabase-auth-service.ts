import { inject, Injectable, Injector, signal, Signal } from '@angular/core';
import { AuthChangeEvent, Provider, Session, User } from '@supabase/supabase-js';
import { Database } from '../../types/database.types';
import { SupabaseService } from './supabase-service';
import { DynamicService } from './dynamic-service';
import { UserAgentService } from './user-agent-service';
import { Router } from '@angular/router';
import { AuthFacade } from '../../shared/features/auth/auth.facade';
import { NotificationService } from '../../shared/services/notification-service';
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
  private readonly _notificationService = inject(NotificationService);
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
  private authListenerInitialized = false;
  private authReadyPromise!: Promise<void>;
  private authReadyResolve!: () => void;
  /** Tracks the session_id of the active USER_SESSION row so sign-out can UPDATE it */
  private activeSessionId: string | null = null;
  /** Set to true when the user explicitly calls signOut() to suppress the "session expired" toast */
  private _explicitSignOut = false;

  private isSessionDebugEnabled(): boolean {
    try {
      if (typeof window === 'undefined') {
        return false;
      }

      const flag = window.localStorage.getItem('debug:session');
      if (flag === '1') return true;
      if (flag === '0') return false;

      return true;
    } catch {
      return true;
    }
  }

  private getSessionSnapshot(session: Session | null): Record<string, unknown> {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return {
      hasSession: Boolean(session),
      userId: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
      expiresAt: session?.expires_at ?? null,
      expiresInSec: session?.expires_at ? session.expires_at - nowInSeconds : null,
      hasAccessToken: Boolean(session?.access_token),
      accessTokenSuffix: session?.access_token ? session.access_token.slice(-10) : null,
      hasRefreshToken: Boolean(session?.refresh_token),
    };
  }

  private logSessionDebug(stage: string, extra: Record<string, unknown> = {}): void {
    if (!this.isSessionDebugEnabled()) {
      return;
    }

    console.log('[AuthDebug]', {
      ts: new Date().toISOString(),
      stage,
      route: this._router.url,
      ...extra,
    });
  }

  constructor() {
    // Initialize readiness promise
    this.authReadyPromise = new Promise((resolve) => {
      this.authReadyResolve = resolve;
    });

    // Start auth state tracking immediately so guards do not wait forever
    void this.stateAuthChanges();
    this._setupBackgroundRefresh();
    this.logSessionDebug('constructor:init');
  }

  /**
   * Proactively refresh the session when the tab becomes visible again or the
   * device comes back online. Supabase's built-in autoRefreshToken uses
   * setInterval which browsers throttle (or kill) for background/suspended tabs,
   * so the access token can silently expire while the user is away. Calling
   * getSession() here forces the SDK to use the refresh token immediately.
   */
  private _setupBackgroundRefresh(): void {
    if (typeof document === 'undefined') return;

    const refresh = () => {
      const cached = this.session();
      if (!cached) return; // Not logged in — nothing to refresh.

      const nowInSeconds = Math.floor(Date.now() / 1000);
      const expiresAt = cached.expires_at ?? 0;
      // Only refresh if the token is already expired or expires within 5 minutes.
      if (expiresAt - nowInSeconds > 300) return;

      this.logSessionDebug('backgroundRefresh:triggered', {
        expiresAt,
        expiresInSec: expiresAt - nowInSeconds,
      });

      // Usar refreshSession() en lugar de getSession(): getSession() devuelve la
      // sesión cacheada si aún no expiró (incluso si faltan <5 min), mientras que
      // refreshSession() siempre obtiene un nuevo access_token del servidor usando
      // el refresh_token, garantizando que la sesión esté fresca.
      void this._supabaseService.client.auth.refreshSession().then(({ data }) => {
        if (data.session) {
          this._applySessionState(data.session);
          this.logSessionDebug('backgroundRefresh:refreshed', {
            snapshot: this.getSessionSnapshot(data.session),
          });
        }
      });
    };

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refresh();
    });

    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
  }

  /**
   * Wait for initial auth to resolve.
   * Guards and resolvers should call this before proceeding.
   */
  async waitForAuthReady(timeoutMs = 8000): Promise<void> {
    if (this.authReady()) return;

    const timedOut = await Promise.race([
      this.authReadyPromise.then(() => false),
      new Promise<boolean>((resolve) => {
        window.setTimeout(() => resolve(true), timeoutMs);
      }),
    ]);

    if (timedOut) {
      const { data } = await this._supabaseService.client.auth.getSession();

      if (data.session) {
        this._applySessionState(data.session);
        this.authReady.set(true);
        this.authReadyResolve();
        this.logSessionDebug('waitForAuthReady:recoveredAfterTimeout', {
          timeoutMs,
          snapshot: this.getSessionSnapshot(data.session),
        });
        return;
      }

      console.warn('[Auth] waitForAuthReady timed out — continuing without session');
      this.logSessionDebug('waitForAuthReady:timeout', { timeoutMs });
    }
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
    if (this.authListenerInitialized) {
      return;
    }

    this.authListenerInitialized = true;

    const {
      data: { subscription },
    } = this._supabaseService.client.auth.onAuthStateChange(async (event, session) => {
      await this._handleAuthStateChange(event, session);
    });

    this.authSubscription = subscription;
  }

  private async _handleAuthStateChange(event: AuthChangeEvent, session: Session | null) {
    console.log(`[Auth] Event: ${event}, has session: ${!!session}`);
    this.logSessionDebug('authStateChange:event', {
      event,
      snapshot: this.getSessionSnapshot(session),
    });

    switch (event) {
      case 'INITIAL_SESSION':
        console.log('[Auth] INITIAL_SESSION - initializing state');
        if (session) {
          this._applySessionState(session);
          if (session.user.user_metadata?.['force_password_change']) {
            this._router.navigate(['/set-password']);
          } else {
            // If the user already has a session and landed on the auth page
            // (e.g. opening a join link while already logged in), honour the returnUrl.
            const initUrl = this._router.url;
            const isOnAuthPage =
              !initUrl ||
              initUrl === '/' ||
              initUrl.startsWith('/auth') ||
              initUrl.startsWith('/login') ||
              initUrl.startsWith('/sign-in');
            if (isOnAuthPage) {
              const returnUrl = sessionStorage.getItem('pending_return_url');
              if (returnUrl && returnUrl.startsWith('/')) {
                sessionStorage.removeItem('pending_return_url');
                void this._router.navigateByUrl(returnUrl);
              }
            }
            // If not on auth page: normal page reload — do NOT redirect anywhere
          }
        } else {
          this._clearSessionState();
        }
        this.authReady.set(true);
        this.authReadyResolve();
        break;

      case 'SIGNED_IN':
        if (session) {
          console.log('[Auth] SIGNED_IN - updating state');
          this._applySessionState(session);
          this._storeOAuthTokens(session);
          if (!this.activeSessionId) {
            await this.logSessionStart();
          }
          // Only redirect to /home when coming from unauthenticated pages.
          // Supabase can fire SIGNED_IN on token refresh or tab visibility
          // changes; redirecting unconditionally cancels user-initiated navigation.
          const currentUrl = this._router.url;
          const isAuthPage =
            !currentUrl ||
            currentUrl === '/' ||
            currentUrl.startsWith('/login') ||
            currentUrl.startsWith('/auth') ||
            currentUrl.startsWith('/sign-in');
          if (isAuthPage) {
            const returnUrl = sessionStorage.getItem('pending_return_url');
            if (returnUrl && returnUrl.startsWith('/')) {
              sessionStorage.removeItem('pending_return_url');
              void this._router.navigateByUrl(returnUrl);
            } else {
              const pendingInviteToken = sessionStorage.getItem('invite_token');
              if (pendingInviteToken) {
                sessionStorage.removeItem('invite_token');
                this._router.navigate(['/invite'], { queryParams: { token: pendingInviteToken } });
              } else {
                this._router.navigate(['/home']);
              }
            }
          }
        }
        break;

      case 'SIGNED_OUT':
        console.log('[Auth] SIGNED_OUT - clearing state');
        this.logSessionDebug('authStateChange:signedOut', {
          explicitSignOut: this._explicitSignOut,
        });
        if (!this._explicitSignOut) {
          this._notificationService.notify(
            'warn',
            'Sesión expirada',
            'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
          );
        }
        this._explicitSignOut = false;
        // logSessionEnd() was already called inside signOut() before clearing state.
        // Calling it again here would fail because internalUserId is already null.
        this._clearSessionState();
        this._clearStorage();
        this._router.navigate(['/auth'], { queryParams: { mode: 'login' } });
        break;

      case 'PASSWORD_RECOVERY':
        console.log('[Auth] PASSWORD_RECOVERY');
        this._router.navigate(['/set-password']);
        break;

      case 'TOKEN_REFRESHED':
        console.log('[Auth] TOKEN_REFRESHED');
        if (session) {
          this._applySessionState(session);
          if (session.provider_token) {
            localStorage.setItem('oauth_provider_token', session.provider_token);
          }
        }
        this.logSessionDebug('authStateChange:tokenRefreshed', {
          snapshot: this.getSessionSnapshot(session),
        });
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
    this.activeSessionId = null;
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

  private _clearStorage(): void {
    // Remove all Supabase-owned keys from localStorage (session, code verifier, etc.)
    Object.keys(localStorage)
      .filter((key) => key.startsWith('sb-'))
      .forEach((key) => localStorage.removeItem(key));

    localStorage.removeItem('oauth_provider_token');
    localStorage.removeItem('oauth_provider_refresh_token');

    // Also clear sessionStorage — Supabase uses it during OAuth callback flows
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith('sb-'))
      .forEach((key) => sessionStorage.removeItem(key));
  }
  //#endregion

  //#region Sign In Methods
  async singInAnonymously(captchaToken?: string): Promise<{ data: any; error: any }> {
    const { data, error } = await this._supabaseService.client.auth.signInAnonymously({
      options: captchaToken ? { captchaToken } : {},
    });
    return { data, error };
  }

  async signInWithOtp(email: string, createUser = true, captchaToken?: string) {
    const { data, error } = await this._supabaseService.client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: createUser,
        ...(captchaToken ? { captchaToken } : {}),
      },
    });
    return { data, error };
  }

  async signInWithEmail(email: string, captchaToken?: string) {
    const { data, error } = await this._supabaseService.client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        ...(captchaToken ? { captchaToken } : {}),
      },
    });
    return { data, error };
  }

  async signInWithPassword(email: string = '', password: string = '', captchaToken?: string) {
    const { data, error } = await this._supabaseService.client.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : {},
    });
    return { data, error };
  }

  async signInWithOAuth(provider: Provider, captchaToken?: string) {
    const { data, error } = await this._supabaseService.client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        ...(captchaToken ? { captchaToken } : {}),
      },
    });
    return { data, error };
  }
  //#endregion

  //#region Sign Up & Password Reset
  async signUpWithPassword(email: string, password: string, name?: string, captchaToken?: string) {
    const { data, error } = await this._supabaseService.client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: name ? { name } : {},
        ...(captchaToken ? { captchaToken } : {}),
      },
    });
    return { data, error };
  }

  async requestPasswordReset(email: string, captchaToken?: string) {
    const { data, error } = await this._supabaseService.client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
      ...(captchaToken ? { captchaToken } : {}),
    });
    return { data, error };
  }

  async setNewPassword(newPassword: string) {
    const { data, error } = await this._supabaseService.client.auth.updateUser({
      password: newPassword,
      data: { force_password_change: false },
    });

    return { data, error };
  }
  //#endregion

  //#region Sign Out & Session
  async signOut() {
    try {
      this._explicitSignOut = true;
      this.logSessionDebug('signOut:start', { snapshot: this.getSessionSnapshot(this.session()) });
      await this.logSessionEnd();
      // Call signOut BEFORE clearing storage so the SDK still has the token
      // in localStorage to revoke the server-side session. The SIGNED_OUT event
      // handler is responsible for clearing storage, state, and navigating.
      await this._supabaseService.client.auth.signOut();
    } catch (err) {
      this._explicitSignOut = false;
      console.error('[Auth] signOut error:', err);
      this.logSessionDebug('signOut:error', {
        error: err instanceof Error ? err.message : String(err),
      });
      // Fallback: clean up locally if the remote call failed.
      this._clearSessionState();
      this._clearStorage();
      this._router.navigate(['/auth'], { queryParams: { mode: 'login' } });
    }
  }

  /**
   * Get a valid session for the current request.
   * Prefer the cached session, but refresh once if it is missing or expired.
   */
  async getSession() {
    const session = await this.ensureActiveSession({
      redirectOnFail: false,
      notifyOnFail: false,
    });

    console.log('[Auth] getSession called - returning active session');
    this.logSessionDebug('getSession:return', {
      snapshot: this.getSessionSnapshot(session),
    });
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
      this.logSessionDebug('refreshSession:start', {
        cachedSnapshot: this.getSessionSnapshot(this.session()),
      });

      // 1. Intentar getSession() primero — rápido, usa caché si el token es válido.
      const { data: cached, error: cachedErr } = await this._supabaseService.client.auth.getSession();
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const sessionValid =
        cached?.session?.user &&
        (cached.session.expires_at ?? 0) > nowInSeconds + 30;

      if (!cachedErr && sessionValid) {
        this._applySessionState(cached.session!);
        this.logSessionDebug('refreshSession:cachedValid', {
          snapshot: this.getSessionSnapshot(cached.session!),
        });
        return { data: { session: cached.session! }, error: null };
      }

      // 2. Token expirado o a punto de expirar: forzar refresh con el refresh_token.
      const { data, error } = await this._supabaseService.client.auth.refreshSession();
      if (error) {
        console.error('[Auth] Error refreshing session:', error);
        this.logSessionDebug('refreshSession:error', {
          error: error instanceof Error ? error.message : String(error),
        });
        this._clearSessionState();
        return { data: { session: null }, error };
      }
      if (data?.session) {
        this._applySessionState(data.session);
      } else {
        this._clearSessionState();
      }
      console.log('[Auth] Session refreshed successfully');
      this.logSessionDebug('refreshSession:success', {
        snapshot: this.getSessionSnapshot(data?.session ?? null),
      });
      return { data: { session: data?.session ?? null }, error: null };
    } catch (err) {
      console.error('[Auth] Exception refreshing session:', err);
      this.logSessionDebug('refreshSession:exception', {
        error: err instanceof Error ? err.message : String(err),
      });
      this._clearSessionState();
      return { data: { session: null }, error: err };
    }
  }

  /**
   * Ensure there is an active valid session.
   * Tries cached session first, then refreshes once.
   * If session cannot be restored, optionally signs out locally and redirects.
   */
  async ensureActiveSession(options?: {
    redirectOnFail?: boolean;
    notifyOnFail?: boolean;
  }): Promise<Session | null> {
    const redirectOnFail = options?.redirectOnFail ?? true;
    const notifyOnFail = options?.notifyOnFail ?? true;

    try {
      await this.waitForAuthReady(3000);
    } catch (err) {
      console.error('[Auth] ensureActiveSession waitForAuthReady error:', err);
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const cached = this.session();
    const hasValidCachedSession =
      Boolean(cached?.user) && (!cached?.expires_at || cached.expires_at > nowInSeconds + 15);

    this.logSessionDebug('ensureActiveSession:checkCached', {
      redirectOnFail,
      notifyOnFail,
      hasValidCachedSession,
      snapshot: this.getSessionSnapshot(cached),
    });

    if (hasValidCachedSession) {
      return cached;
    }

    const { data } = await this.refreshSession();
    if (data.session?.user) {
      this.logSessionDebug('ensureActiveSession:refreshRecovered', {
        snapshot: this.getSessionSnapshot(data.session),
      });
      return data.session;
    }

    // Refresh token is likely expired or invalid: clear and redirect.
    this._clearSessionState();
    this._clearStorage();
    this.logSessionDebug('ensureActiveSession:failed', {
      redirectOnFail,
      notifyOnFail,
    });

    if (notifyOnFail) {
      this._notificationService.notify(
        'warn',
        'Sesion expirada',
        'Tu sesion expiro. Inicia sesion nuevamente.',
      );
    }

    if (redirectOnFail) {
      this._router.navigate(['/auth'], { queryParams: { mode: 'login' } });
    }

    return null;
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

  async sendMagicLink(email: string, captchaToken?: string) {
    const { error } = await this._supabaseService.client.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        ...(captchaToken ? { captchaToken } : {}),
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

      const sessionId = uuidv4();
      this.activeSessionId = sessionId;

      const userSessionData: Partial<Database['public']['Tables']['USER_SESSION']['Insert']> = {
        user_id: internalUserId,
        ip_address: ip,
        user_agent: userAgent,
        sign_in: new Date().toISOString(),
        sign_out: null,
        login: email ?? undefined,
        session_id: sessionId,
      };

      await this._dynamicService.insertData('USER_SESSION', userSessionData);
    } catch (error) {
      console.error('[Auth] Error logging session start:', error);
    }
  }

  async logSessionEnd() {
    try {
      const authFacade = this._injector.get(AuthFacade);
      const internalUserId = Number(authFacade.getInternalUserId());

      if (!internalUserId || !this.activeSessionId) {
        console.warn('[Auth] Cannot log session end: missing userId or activeSessionId.');
        return;
      }

      await this._supabaseService.client
        .from('USER_SESSION')
        .update({ sign_out: new Date().toISOString() })
        .eq('session_id', this.activeSessionId)
        .eq('user_id', internalUserId);

      this.activeSessionId = null;
    } catch (error) {
      console.error('[Auth] Error logging session end:', error);
    }
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

  /**
   * Check if current user has the given permission string.
   */
  hasPermission(permission: string): boolean {
    if (!permission) return false;
    return this.permissions().includes(permission);
  }

  /**
   * Check if user has ANY of the given permissions.
   */
  hasAnyPermission(permissions: string[] = []): boolean {
    if (!Array.isArray(permissions) || permissions.length === 0) return false;
    const userPerms = this.permissions();
    return permissions.some((p) => userPerms.includes(p));
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
