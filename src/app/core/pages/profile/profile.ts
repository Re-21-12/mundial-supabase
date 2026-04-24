import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { AuthFacade } from '../../../shared/features/auth/auth.facade';

type UserProfile = {
  id: string;
  email: string;
};

type AccessTokenAmr = {
  method?: string;
  timestamp?: number;
};

type AccessTokenMetadata = {
  avatar_url?: string;
  email?: string;
  email_verified?: boolean;
  full_name?: string;
  iss?: string;
  name?: string;
  phone_verified?: boolean;
  picture?: string;
  provider_id?: string;
  sub?: string;
};

type AccessTokenClaims = {
  iss?: string;
  sub?: string;
  aud?: string;
  exp?: number;
  iat?: number;
  email?: string;
  phone?: string;
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
  user_metadata?: AccessTokenMetadata;
  role?: string;
  aal?: string;
  amr?: AccessTokenAmr[];
  session_id?: string;
  is_anonymous?: boolean;
};

@Component({
  selector: 'app-profile-page',
  imports: [],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage implements OnInit {
  private readonly authFacade = inject(AuthFacade);
  private readonly router = inject(Router);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly profile = signal<UserProfile | null>(null);
  protected readonly tokenClaims = signal<AccessTokenClaims | null>(null);
  protected readonly role = this.authFacade.role;
  protected readonly permissions = this.authFacade.permissions;

  protected formatUnixTimestamp(timestamp?: number): string {
    if (!timestamp) {
      return 'N/A';
    }

    return new Date(timestamp * 1000).toLocaleString();
  }

  async ngOnInit() {
    try {
      const {
        data: { session },
      } = await this.authFacade.getSession();

      if (!session) {
        await this.router.navigate(['/auth']);
        return;
      }

      this.tokenClaims.set(jwtDecode<AccessTokenClaims>(session.access_token));

      const { data, error } = await this.authFacade.profile(session.user.email ?? '');
      if (error) {
        this.errorMessage.set('No se pudo cargar el perfil.');
        return;
      }

      this.profile.set({
        id: data?.id ?? session.user.id,
        email: data?.email ?? session.user.email ?? '',
      });
    } catch {
      this.errorMessage.set('Ocurrio un error al consultar tu perfil.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
